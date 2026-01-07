type Op = { insert: string | Record<string, unknown>; attributes?: Record<string, unknown> };

export function slackToMarkdown(input: string): string {
  try {
    const parsed = JSON.parse(input);
    if (!parsed?.ops || !Array.isArray(parsed.ops)) {
      return input;
    }
    return convertDelta(parsed.ops as Op[]);
  } catch {
    return input;
  }
}

function formatInline(text: string, attrs?: Record<string, unknown>): string {
  if (!attrs || !text) {
    return text;
  }
  if (attrs.code) {
    return `\`${text}\``;
  }
  let s = text;
  if (attrs.bold) {
    s = `*${s}*`;
  }
  if (attrs.italic) {
    s = `_${s}_`;
  }
  if (attrs.strike) {
    s = `~${s}~`;
  }
  if (typeof attrs.link === "string" && text !== attrs.link) {
    s = `[${text}](${attrs.link})`;
  }
  return s;
}

function convertDelta(ops: Op[]): string {
  const lines: string[] = [];
  let line = "";
  let inCodeBlock = false;
  const codeLines: string[] = [];
  const listCounters: Record<number, number> = {};
  const listTypes: Record<number, string> = {};

  for (const { insert, attributes: attrs } of ops) {
    // Emoji object
    if (typeof insert === "object") {
      const emoji = insert?.slackemoji as Record<string, unknown> | undefined;
      if (typeof emoji?.text === "string") {
        line += emoji.text;
      }
      continue;
    }

    // Block-formatted newline
    if (insert === "\n" && attrs && ("blockquote" in attrs || "code-block" in attrs || "list" in attrs)) {
      if (attrs["code-block"]) {
        inCodeBlock = true;
        codeLines.push(line);
        line = "";
        continue;
      }

      if (inCodeBlock) {
        lines.push("```", ...codeLines, "```");
        codeLines.length = 0;
        inCodeBlock = false;
      }

      if (attrs.blockquote) {
        lines.push(`> ${line}`);
        line = "";
        continue;
      }

      if (attrs.list) {
        const type = String(attrs.list);
        const indent = typeof attrs.indent === "number" ? attrs.indent : 0;

        for (const k in listCounters) {
          if (+k > indent) {
            delete listCounters[k];
            delete listTypes[k];
          }
        }
        if (listTypes[indent] !== type) {
          listCounters[indent] = 0;
        }
        listTypes[indent] = type;

        const spaces = indent === 0 ? "" : " ".repeat((listTypes[indent - 1] === "ordered" ? 3 : 2) * indent);

        if (type === "ordered") {
          listCounters[indent] = (listCounters[indent] ?? 0) + 1;
          lines.push(`${spaces}${listCounters[indent]}. ${line}`);
        } else {
          lines.push(`${spaces}- ${line}`);
        }
        line = "";
        continue;
      }
    }

    // Close code block on regular newline
    if (inCodeBlock && insert.includes("\n")) {
      lines.push("```", ...codeLines, "```");
      codeLines.length = 0;
      inCodeBlock = false;
    }

    // Embedded newlines in plain text
    if (insert.includes("\n")) {
      const parts = insert.split("\n");
      for (let i = 0; i < parts.length; i++) {
        line += formatInline(parts[i]!, attrs);
        if (i < parts.length - 1) {
          lines.push(line);
          line = "";
        }
      }
      continue;
    }

    line += formatInline(insert, attrs);
  }

  if (inCodeBlock) {
    lines.push("```", ...codeLines, "```");
  }
  if (line) {
    lines.push(line);
  }
  return lines.join("\n");
}
