import { test } from "node:test";
import assert from "node:assert/strict";
import { CODE_LANGUAGES, sliceTokens, tokenizeLine } from "../src/stickman/code";
import { StickmanVisualSchema, validateStickmanScenes } from "../src/stickman/schema";

const kinds = (line: string, lang: (typeof CODE_LANGUAGES)[number]) => tokenizeLine(line, lang).map((t) => `${t.kind}:${t.text}`);

test("properties: key, separator and value are told apart; placeholders and comments too", () => {
  assert.deepEqual(kinds("payment.gateway.type=Paytm", "properties"), ["key:payment.gateway.type", "plain:=", "str:Paytm"]);
  assert.deepEqual(kinds("payment.gateway.retry-count=5", "properties"), ["key:payment.gateway.retry-count", "plain:=", "num:5"]);
  assert.deepEqual(kinds("# payment settings", "properties"), ["com:# payment settings"]);
  assert.ok(kinds("spring.datasource.url=${DB_URL:x}", "properties").includes("ann:${DB_URL:x}"));
});

test("java: annotations, strings with ${} placeholders, keywords, types and numbers", () => {
  assert.deepEqual(kinds('@Value("${payment.gateway.type:Razorpay}")', "java").slice(0, 3), ["ann:@Value", "plain:(", 'str:"${payment.gateway.type:Razorpay}"']);
  const t = kinds("private int retryCount = 5;", "java");
  assert.ok(t.includes("kw:private") && t.includes("kw:int") && t.includes("num:5"));
  assert.ok(kinds("public class PaymentGateway {", "java").includes("type:PaymentGateway"));
});

test("yaml: keys, values, list items, trailing comments", () => {
  assert.deepEqual(kinds("payment:", "yaml"), ["key:payment", "plain::"]);
  assert.ok(kinds("  type: Paytm", "yaml").includes("str:Paytm"));
  assert.ok(kinds("  retry-count: 5 # attempts", "yaml").some((k) => k.startsWith("com:")));
  assert.ok(kinds("  - name: card", "yaml").includes("key:name"));
});

test("bash: prompt, command, flags, strings, comments", () => {
  assert.deepEqual(kinds("$ mvn spring-boot:run", "bash").slice(0, 3), ["prompt:$", "plain: ", "kw:mvn"]);
  assert.ok(kinds("mvn clean install -DskipTests", "bash").includes("attr: -DskipTests"));
  assert.ok(kinds('echo "done" | grep -i done', "bash").includes('str:"done"'));
  assert.ok(kinds("export PORT=8080 # port", "bash").includes("com:# port"));
});

test("xml: tags, attributes, strings, comments", () => {
  assert.deepEqual(kinds("<dependency>", "xml"), ["tag:<dependency>"]);
  assert.deepEqual(kinds("<groupId>org.x</groupId>", "xml"), ["tag:<groupId>", "plain:org.x", "tag:</groupId>"]);
  const bean = kinds('<bean id="gateway"/>', "xml");
  assert.ok(bean.includes("attr:id") && bean.includes('str:"gateway"'));
  assert.deepEqual(kinds("<!-- starter -->", "xml"), ["com:<!-- starter -->"]);
});

test("text is left alone, empty lines give no tokens", () => {
  assert.deepEqual(kinds("Paytm", "text"), ["plain:Paytm"]);
  assert.deepEqual(tokenizeLine("", "java"), []);
});

test("sliceTokens keeps the first N characters across tokens", () => {
  const toks = tokenizeLine("payment.type=Paytm", "properties");
  assert.equal(sliceTokens(toks, 4).map((t) => t.text).join(""), "paym");
  assert.equal(sliceTokens(toks, 14).map((t) => t.text).join(""), "payment.type=P");
  assert.equal(sliceTokens(toks, 999).map((t) => t.text).join(""), "payment.type=Paytm");
  assert.deepEqual(sliceTokens(toks, 0), []);
});

test("code spec: language / revealFrom / animate defaults and validation", () => {
  const v = StickmanVisualSchema.parse({ code: { lines: ["a", "b"] } });
  assert.deepEqual([v.code?.language, v.code?.revealFrom, v.code?.animate], ["java", 0, "lines"]);
  const ok = StickmanVisualSchema.parse({ code: { title: "application.properties", language: "properties", lines: ["a=1", "b=2"], revealFrom: 1, animate: "type" } });
  assert.equal(ok.code?.language, "properties");
  assert.ok(validateStickmanScenes([{ id: "x", visual: { code: { lines: ["a"], language: "cobol" } } }]).length > 0);
  assert.ok(validateStickmanScenes([{ id: "x", visual: { code: { lines: ["a", "b"], revealFrom: 2 } } }]).some((p) => p.includes("revealFrom")));
  assert.deepEqual(validateStickmanScenes([{ id: "x", visual: { code: { lines: ["a", "b"], revealFrom: 1 } } }]), []);
});
