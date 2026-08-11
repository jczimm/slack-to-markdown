#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { slackToMarkdown } from "./slackToMarkdown.js";

const usage = `Usage: slack-to-markdown < input

Reads Slack's clipboard format on stdin and writes Markdown to stdout.
Input that isn't valid Slack clipboard data is passed through unchanged.

Options:
  -h, --help     Show this message
  -v, --version  Show the version

Examples:
  pbpaste | slack-to-markdown
  slack-to-markdown < clip.json`;

function version(): string {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  return pkg.version;
}

const args = process.argv.slice(2);

if (args.includes("-h") || args.includes("--help")) {
  console.log(usage);
  process.exit(0);
}

if (args.includes("-v") || args.includes("--version")) {
  console.log(version());
  process.exit(0);
}

if (args.length > 0) {
  console.error(`slack-to-markdown: unrecognized argument "${args[0]}"\n\n${usage}`);
  process.exit(1);
}

// Nothing is piped in, so reading stdin would block forever.
if (process.stdin.isTTY) {
  console.error(usage);
  process.exit(1);
}

// Downstream may close early (`... | head`), which is not an error for a filter.
process.stdout.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EPIPE") {
    process.exit(0);
  }
  throw err;
});

// Read the stream rather than readFileSync(0): a non-blocking pipe — which is
// what you get when the writer is another Node process — fails there with EAGAIN.
const chunks: Buffer[] = [];
for await (const chunk of process.stdin) {
  chunks.push(chunk as Buffer);
}

const output = slackToMarkdown(Buffer.concat(chunks).toString("utf8"));
// Terminate the output so it doesn't run into the shell prompt, but don't add a
// second newline when the conversion already ends with one.
process.stdout.write(output.endsWith("\n") ? output : `${output}\n`);
