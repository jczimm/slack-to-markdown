import { describe, it } from "node:test";
import assert from "node:assert";
import { spawnSync } from "node:child_process";

const cli = new URL("../dist/cli.js", import.meta.url).pathname;

function run(args: string[], input = "") {
  return spawnSync(process.execPath, [cli, ...args], { input, encoding: "utf8" });
}

describe("cli", () => {
  it("converts a Slack delta on stdin", () => {
    const input = JSON.stringify({"ops":[{"insert":"normal "},{"attributes":{"bold":true},"insert":"bold"}]});
    const { status, stdout } = run([], input);
    assert.strictEqual(status, 0);
    assert.strictEqual(stdout, "normal *bold*\n");
  });

  it("passes non-Slack input through unchanged", () => {
    const { status, stdout } = run([], "plain text");
    assert.strictEqual(status, 0);
    assert.strictEqual(stdout, "plain text\n");
  });

  it("doesn't double up a trailing newline", () => {
    const { stdout } = run([], "plain text\n");
    assert.strictEqual(stdout, "plain text\n");
  });

  it("reads a non-blocking pipe from another process", () => {
    // readFileSync(0) fails with EAGAIN here; the stream read doesn't.
    const writer = `process.stdout.write(${JSON.stringify(JSON.stringify({"ops":[{"attributes":{"bold":true},"insert":"piped"}]}))})`;
    const { status, stdout } = spawnSync(
      "sh",
      ["-c", `"$1" -e "$2" | "$1" "$3"`, "sh", process.execPath, writer, cli],
      { encoding: "utf8" },
    );
    assert.strictEqual(status, 0);
    assert.strictEqual(stdout, "*piped*\n");
  });

  it("prints usage for --help", () => {
    const { status, stdout } = run(["--help"]);
    assert.strictEqual(status, 0);
    assert.match(stdout, /^Usage: slack-to-markdown/);
  });

  it("prints the version for --version", () => {
    const { status, stdout } = run(["--version"]);
    assert.strictEqual(status, 0);
    assert.match(stdout.trim(), /^\d+\.\d+\.\d+/);
  });

  it("fails on an unrecognized argument", () => {
    const { status, stderr } = run(["--nope"]);
    assert.strictEqual(status, 1);
    assert.match(stderr, /unrecognized argument "--nope"/);
  });
});
