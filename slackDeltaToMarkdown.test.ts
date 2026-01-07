import { describe, it } from "node:test";
import assert from "node:assert";
import { slackToMarkdown } from "./slackDeltaToMarkdown.ts";

const tests: { name: string; input: object; expected: string }[] = [
  // === INLINE FORMATTING ===
  {
    name: "bold",
    input: {"ops":[{"attributes":{"bold":true},"insert":"bold text"}]},
    expected: "*bold text*"
  },
  {
    name: "italic",
    input: {"ops":[{"attributes":{"italic":true},"insert":"italic text"}]},
    expected: "_italic text_"
  },
  {
    name: "bold+italic",
    input: {"ops":[{"attributes":{"italic":true,"bold":true},"insert":"bold italic"}]},
    expected: "_*bold italic*_"
  },
  {
    name: "strikethrough",
    input: {"ops":[{"attributes":{"strike":true},"insert":"strikethrough"}]},
    expected: "~strikethrough~"
  },
  {
    name: "inline code",
    input: {"ops":[{"attributes":{"code":true},"insert":"inline code"}]},
    expected: "`inline code`"
  },
  {
    name: "mixed inline",
    input: {"ops":[{"insert":"normal "},{"attributes":{"bold":true},"insert":"bold"},{"insert":" "},{"attributes":{"italic":true},"insert":"italic"},{"insert":" "},{"attributes":{"code":true},"insert":"code"}]},
    expected: "normal *bold* _italic_ `code`"
  },

  // === LINKS ===
  {
    name: "plain URL (text matches URL)",
    input: {"ops":[{"insert":"Check out "},{"attributes":{"link":"https://example.com"},"insert":"https://example.com"},{"insert":" for more"}]},
    expected: "Check out https://example.com for more"
  },
  {
    name: "named link (text differs from URL)",
    input: {"ops":[{"insert":"Check out "},{"attributes":{"link":"https://example.com"},"insert":"Example Site"}]},
    expected: "Check out [Example Site](https://example.com)"
  },

  // === BLOCKQUOTE ===
  {
    name: "blockquote",
    input: {"ops":[{"insert":"This is a quote"},{"attributes":{"blockquote":true},"insert":"\n"}]},
    expected: "> This is a quote"
  },
  {
    name: "multi-line blockquote",
    input: {"ops":[{"insert":"Line one"},{"attributes":{"blockquote":true},"insert":"\n"},{"insert":"Line two"},{"attributes":{"blockquote":true},"insert":"\n"},{"insert":"Line three"},{"attributes":{"blockquote":true},"insert":"\n"}]},
    expected: "> Line one\n> Line two\n> Line three"
  },

  // === CODE BLOCK ===
  {
    name: "code block",
    input: {"ops":[{"insert":"function hello() {"},{"attributes":{"code-block":true},"insert":"\n"},{"insert":"  return \"world\";"},{"attributes":{"code-block":true},"insert":"\n"},{"insert":"}"},{"attributes":{"code-block":true},"insert":"\n"}]},
    expected: "```\nfunction hello() {\n  return \"world\";\n}\n```"
  },

  // === LISTS ===
  {
    name: "bullet list",
    input: {"ops":[{"insert":"item one"},{"attributes":{"list":"bullet"},"insert":"\n"},{"insert":"item two"},{"attributes":{"list":"bullet"},"insert":"\n"},{"insert":"item three"},{"attributes":{"list":"bullet"},"insert":"\n"}]},
    expected: "- item one\n- item two\n- item three"
  },
  {
    name: "ordered list",
    input: {"ops":[{"insert":"First"},{"attributes":{"list":"ordered"},"insert":"\n"},{"insert":"Second"},{"attributes":{"list":"ordered"},"insert":"\n"},{"insert":"Third"},{"attributes":{"list":"ordered"},"insert":"\n"}]},
    expected: "1. First\n2. Second\n3. Third"
  },
  {
    name: "nested bullet list",
    input: {"ops":[{"insert":"Parent"},{"attributes":{"list":"bullet"},"insert":"\n"},{"insert":"Child"},{"attributes":{"indent":1,"list":"bullet"},"insert":"\n"},{"insert":"GrandChild"},{"attributes":{"indent":2,"list":"bullet"},"insert":"\n"}]},
    expected: "- Parent\n  - Child\n    - GrandChild"
  },
  {
    name: "mixed nested list",
    input: {"ops":[{"insert":"Hello"},{"attributes":{"list":"ordered"},"insert":"\n"},{"insert":"Child"},{"attributes":{"indent":1,"list":"ordered"},"insert":"\n"},{"insert":"Child but not numbered"},{"attributes":{"indent":1,"list":"bullet"},"insert":"\n"},{"insert":"Parent but not numbered"},{"attributes":{"list":"bullet"},"insert":"\n"},{"insert":"Other numbered parent"},{"attributes":{"list":"ordered"},"insert":"\n"},{"insert":"Numbered Child"},{"attributes":{"indent":1,"list":"ordered"},"insert":"\n"}]},
    expected: "1. Hello\n   1. Child\n   - Child but not numbered\n- Parent but not numbered\n1. Other numbered parent\n   1. Numbered Child"
  },
  {
    name: "list with formatting",
    input: {"ops":[{"attributes":{"bold":true},"insert":"Im bold"},{"attributes":{"list":"bullet"},"insert":"\n"},{"attributes":{"bold":true},"insert":"im bold too"},{"attributes":{"list":"bullet"},"insert":"\n"},{"insert":"Im not"},{"attributes":{"list":"bullet"},"insert":"\n"}]},
    expected: "- *Im bold*\n- *im bold too*\n- Im not"
  },

  // === EMOJI ===
  {
    name: "emoji",
    input: {"ops":[{"insert":"Hello "},{"insert":{"slackemoji":{"text":":wave:"}}},{"insert":" world "},{"insert":{"slackemoji":{"text":":tada:"}}}]},
    expected: "Hello :wave: world :tada:"
  },

  // === MENTIONS ===
  {
    name: "user mention",
    input: {"ops":[{"attributes":{"slackmention":{"id":"U0120JGV36K","label":"@cosmo","mention":true,"unverified":false}},"insert":"@cosmo"},{"insert":" hello"}]},
    expected: "@cosmo hello"
  },
  {
    name: "channel mention",
    input: {"ops":[{"attributes":{"slackmention":{"id":"CRXB3HYP9","label":"#general","mention":false,"unverified":false}},"insert":"#general"},{"insert":" hello"}]},
    expected: "#general hello"
  },
  {
    name: "@here mention",
    input: {"ops":[{"attributes":{"slackmention":{"id":"BKhere","label":"@here","mention":true,"unverified":false}},"insert":"@here"},{"insert":" test"}]},
    expected: "@here test"
  },
  {
    name: "@channel mention",
    input: {"ops":[{"attributes":{"slackmention":{"id":"BKchannel","label":"@channel","mention":true,"unverified":false}},"insert":"@channel"},{"insert":" test"}]},
    expected: "@channel test"
  },

  // === PARAGRAPHS ===
  {
    name: "multiple paragraphs",
    input: {"ops":[{"insert":"First paragraph here.\n\nSecond paragraph here."}]},
    expected: "First paragraph here.\n\nSecond paragraph here."
  },
];

describe("slackToMarkdown", () => {
  for (const test of tests) {
    it(test.name, () => {
      const result = slackToMarkdown(JSON.stringify(test.input));
      assert.strictEqual(result, test.expected);
    });
  }

  // Fallback tests
  it("returns original string for invalid JSON", () => {
    const input = "not valid json {";
    assert.strictEqual(slackToMarkdown(input), input);
  });

  it("returns original string for JSON without ops", () => {
    const input = '{"foo": "bar"}';
    assert.strictEqual(slackToMarkdown(input), input);
  });

  it("returns original string for plain text", () => {
    const input = "just some plain text";
    assert.strictEqual(slackToMarkdown(input), input);
  });
});
