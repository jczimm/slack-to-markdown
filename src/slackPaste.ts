#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { parseWebCustomData } from "./webCustomData.js";

const usage = `Usage: slack-paste [type]

Prints a custom macOS clipboard flavor to stdout (default: slack/texty).
pbpaste can't do this — it only reads the plain-text, RTF and PS flavors.

Options:
  -l, --list  List the custom flavors currently on the clipboard
  -h, --help  Show this message

Examples:
  slack-paste | slack-to-markdown
  slack-paste --list
  slack-paste slack/html`;

/** Read one pasteboard type as raw bytes, via osascript's ObjC bridge. */
function readPasteboard(type: string): Buffer {
  const jxa = `ObjC.import("AppKit");
const data = $.NSPasteboard.generalPasteboard.dataForType($(${JSON.stringify(type)}));
data.isNil() ? "" : $.NSString.alloc.initWithDataEncoding(data.base64EncodedDataWithOptions(0), $.NSUTF8StringEncoding).js`;

  const base64 = execFileSync("osascript", ["-l", "JavaScript", "-e", jxa], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return Buffer.from(base64.trim(), "base64");
}

const args = process.argv.slice(2);

if (args.includes("-h") || args.includes("--help")) {
  console.log(usage);
  process.exit(0);
}

if (process.platform !== "darwin") {
  console.error(`slack-paste: only supported on macOS (this is ${process.platform}).`);
  process.exit(1);
}

const list = args.includes("-l") || args.includes("--list");
const positional = args.filter((arg) => !arg.startsWith("-"));

if (positional.length > 1 || args.some((arg) => arg.startsWith("-") && !["-l", "--list"].includes(arg))) {
  console.error(`slack-paste: unrecognized arguments\n\n${usage}`);
  process.exit(1);
}

const wanted = positional[0] ?? "slack/texty";

// Some apps register the flavor as a pasteboard type of its own; prefer that.
const direct = list ? Buffer.alloc(0) : readPasteboard(wanted);
if (direct.length > 0) {
  process.stdout.write(direct.toString("utf8"));
  process.exit(0);
}

const blob = readPasteboard("org.chromium.web-custom-data");
const available = blob.length > 0 ? parseWebCustomData(blob) : new Map<string, string>();

if (list) {
  console.log([...available.keys()].join("\n"));
  process.exit(0);
}

const found = available.get(wanted);
if (found === undefined) {
  const names = [...available.keys()].join(", ") || "none";
  console.error(
    `slack-paste: "${wanted}" is not on the clipboard (available: ${names}).\n` +
      `Hint: open the message's "..." menu in Slack and press Cmd+C. Drag-selecting\n` +
      `the text and copying saves the message in a different format. See the README\n` +
      `for more info.`,
  );
  process.exit(1);
}

process.stdout.write(found);
