/** Tiny Java/annotation tokenizer for the code panel (pure, no React). */
export type TokKind = "ann" | "kw" | "str" | "com" | "type" | "plain";
export interface Tok {
  text: string;
  kind: TokKind;
}

const KEYWORDS = new Set([
  "public", "private", "protected", "class", "interface", "implements", "extends", "new", "return",
  "void", "final", "static", "import", "package", "this", "int", "String", "if", "else", "null",
]);

export function tokenizeLine(line: string): Tok[] {
  const out: Tok[] = [];
  const push = (text: string, kind: TokKind) => {
    const last = out[out.length - 1];
    if (last && last.kind === kind) last.text += text;
    else out.push({ text, kind });
  };
  const re = /(\/\/.*$)|("(?:[^"\\]|\\.)*")|(@\w+)|([A-Za-z_]\w*)|(\s+)|(.)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    if (m[1]) push(m[1], "com");
    else if (m[2]) push(m[2], "str");
    else if (m[3]) push(m[3], "ann");
    else if (m[4]) push(m[4], KEYWORDS.has(m[4]) ? "kw" : /^[A-Z]/.test(m[4]) ? "type" : "plain");
    else push(m[0], "plain");
  }
  return out;
}
