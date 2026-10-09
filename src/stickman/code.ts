/** Tiny multi-language tokenizer for the code panel (pure, no React): java, properties, yaml, bash, xml, text. */
export const CODE_LANGUAGES = ["java", "properties", "yaml", "bash", "xml", "text"] as const;
export type CodeLanguage = (typeof CODE_LANGUAGES)[number];

export type TokKind = "ann" | "kw" | "str" | "com" | "type" | "plain" | "key" | "num" | "tag" | "attr" | "prompt";
export interface Tok {
  text: string;
  kind: TokKind;
}

const JAVA_KEYWORDS = new Set([
  "public", "private", "protected", "class", "interface", "implements", "extends", "new", "return",
  "void", "final", "static", "import", "package", "this", "int", "String", "if", "else", "null",
  "boolean", "long", "double", "float", "char", "byte", "short", "throws", "throw", "try", "catch", "finally",
  "for", "while", "switch", "case", "default", "break", "continue", "abstract", "super", "enum", "var",
  "true", "false", "record", "instanceof", "synchronized", "volatile",
]);

/** Merges neighbouring tokens of the same kind and exposes a tiny `push` helper. */
const collector = () => {
  const out: Tok[] = [];
  const push = (text: string, kind: TokKind) => {
    if (!text) return;
    const last = out[out.length - 1];
    if (last && last.kind === kind) last.text += text;
    else out.push({ text, kind });
  };
  return { out, push };
};

const NUM = /^-?\d+(?:\.\d+)?$/;
const BOOL = /^(true|false|yes|no|null|on|off)$/i;

/** `${placeholders}` inside a value are shown like annotations; numbers and booleans like literals; the rest like a string. */
function value(text: string, push: (t: string, k: TokKind) => void): void {
  const parts = text.split(/(\$\{[^}]*\})/g);
  for (const p of parts) {
    if (!p) continue;
    if (p.startsWith("${")) push(p, "ann");
    else if (NUM.test(p.trim()) || BOOL.test(p.trim())) push(p, "num");
    else push(p, "str");
  }
}

function java(line: string): Tok[] {
  const { out, push } = collector();
  const re = /(\/\/.*$)|("(?:[^"\\]|\\.)*")|(@\w+)|(\d+(?:\.\d+)?[LlFfDd]?)|([A-Za-z_]\w*)|(\s+)|(.)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    if (m[1]) push(m[1], "com");
    else if (m[2]) push(m[2], "str");
    else if (m[3]) push(m[3], "ann");
    else if (m[4]) push(m[4], "num");
    else if (m[5]) push(m[5], JAVA_KEYWORDS.has(m[5]) ? "kw" : /^[A-Z]/.test(m[5]) ? "type" : "plain");
    else push(m[0], "plain");
  }
  return out;
}

function properties(line: string): Tok[] {
  const { out, push } = collector();
  const t = line.trimStart();
  if (t.startsWith("#") || t.startsWith("!")) { push(line, "com"); return out; }
  const m = /^(\s*)([^=:\s]+)(\s*[=:]\s*)(.*)$/.exec(line);
  if (!m) { push(line, "plain"); return out; }
  push(m[1], "plain");
  push(m[2], "key");
  push(m[3], "plain");
  value(m[4], push);
  return out;
}

function yaml(line: string): Tok[] {
  const { out, push } = collector();
  const t = line.trimStart();
  if (t.startsWith("#")) { push(line, "com"); return out; }
  const m = /^(\s*(?:-\s+)?)([A-Za-z0-9_.\-"']+)(\s*:)(\s*)(.*)$/.exec(line);
  if (!m) {
    // a list item or plain scalar
    const li = /^(\s*-\s+)(.*)$/.exec(line);
    if (li) { push(li[1], "plain"); value(li[2], push); } else push(line, "plain");
    return out;
  }
  push(m[1], "plain");
  push(m[2], "key");
  push(m[3], "plain");
  push(m[4], "plain");
  const rest = m[5];
  const hash = rest.indexOf(" #");
  const body = hash >= 0 ? rest.slice(0, hash) : rest;
  if (/^["'].*["']$/.test(body.trim())) push(body, "str"); else value(body, push);
  if (hash >= 0) push(rest.slice(hash), "com");
  return out;
}

function bash(line: string): Tok[] {
  const { out, push } = collector();
  const re = /(#.*$)|("(?:[^"\\]|\\.)*"|'[^']*')|(\$\{?\w+\}?)|(\s--?[A-Za-z][\w-]*)|(\d+(?:\.\d+)?)|(\S+)|(\s+)/g;
  let first = true;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    if (m[1]) push(m[1], "com");
    else if (m[2]) push(m[2], "str");
    else if (m[3]) {
      // a leading "$ " prompt is just "$"; "$VAR" / "${VAR}" are variables
      if (first && m[3] === "$") { push(m[3], "prompt"); } else push(m[3], "ann");
      first = first && m[3] === "$";
    } else if (m[4]) push(m[4], "attr");
    else if (m[5]) push(m[5], "num");
    else if (m[6]) {
      if (first || m[0] === "$") { push(m[6], m[6] === "$" ? "prompt" : "kw"); first = m[6] === "$"; }
      else if (/^(\|\||&&|\||>>?|<|;)$/.test(m[6])) { push(m[6], "plain"); first = m[6] !== ">" && m[6] !== ">>" && m[6] !== "<"; }
      else push(m[6], "plain");
    } else push(m[0], "plain");
  }
  return out;
}

function xml(line: string): Tok[] {
  const { out, push } = collector();
  const re = /(<!--.*?-->|<!--.*$)|(<\/?[A-Za-z_][\w:.-]*)|(\/?>)|([A-Za-z_:][\w:.-]*)(?==)|("[^"]*"|'[^']*')|(\s+)|([^<\s"'=>]+|.)/g;
  let inTag = false;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    if (m[1]) push(m[1], "com");
    else if (m[2]) { push(m[2], "tag"); inTag = true; }
    else if (m[3]) { push(m[3], "tag"); inTag = false; }
    else if (m[4] && inTag) push(m[4], "attr");
    else if (m[5] && inTag) push(m[5], "str");
    else push(m[0], "plain");
  }
  return out;
}

export function tokenizeLine(line: string, language: CodeLanguage = "java"): Tok[] {
  switch (language) {
    case "properties": return properties(line);
    case "yaml": return yaml(line);
    case "bash": return bash(line);
    case "xml": return xml(line);
    case "text": return line ? [{ text: line, kind: "plain" }] : [];
    default: return java(line);
  }
}

/** The first `chars` characters of a tokenized line (for the typing animation). */
export function sliceTokens(tokens: Tok[], chars: number): Tok[] {
  const out: Tok[] = [];
  let left = Math.max(0, Math.floor(chars));
  for (const t of tokens) {
    if (left <= 0) break;
    out.push(left >= t.text.length ? t : { ...t, text: t.text.slice(0, left) });
    left -= t.text.length;
  }
  return out;
}
