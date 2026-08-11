# slack-to-markdown
Convert Slack's clipboard format to Slack-compatible Markdown.

## What it does
When you copy formatted text from Slack, it stores the content in the `slack/texty` clipboard format. This library converts that content to Markdown that can be pasted into other applications (or back into Slack) and render correctly.

## Usage

```typescript
import { slackToMarkdown } from "@jczimm/slack-to-markdown";

// Pass the raw clipboard string - it handles parsing
const markdown = slackToMarkdown(clipboardData);

// Falls back to original string if not valid Slack format
slackToMarkdown("plain text") // => "plain text"
```

### Browser clipboard example

```typescript
document.addEventListener("paste", (e) => {
  const slackData = e.clipboardData?.getData("slack/texty");
  if (slackData) {
    e.preventDefault();
    const markdown = slackToMarkdown(slackData);
    // Insert markdown at cursor, or do whatever you want with it
  }
});
```

## CLI

Reads Slack's clipboard format on stdin, writes Markdown to stdout. Input that isn't valid Slack clipboard data is passed through unchanged.

```bash
npx @jczimm/slack-to-markdown < clip.json

# installed globally
npm install -g @jczimm/slack-to-markdown
slack-to-markdown < clip.json
```

### slack-paste (macOS)

The package also installs `slack-paste`, which reads Slack's clipboard format off the macOS pasteboard so you can pipe it straight in:

```bash
slack-paste | slack-to-markdown
```

Without a global install, hand npx a shell so both commands resolve from a single package install:

```bash
npx -p @jczimm/slack-to-markdown sh -c 'slack-paste | slack-to-markdown'
```

The pipe has to stay inside the quotes — outside them, your own shell takes it and pipes into a `slack-to-markdown` that isn't on `PATH`.

**Copy the message, don't select the text.** Open the message's overflow menu (the **⋯** button) and press <kbd>⌘C</kbd>. Slack writes the `slack/texty` delta this tool reads only for a whole-message copy; drag-selecting the text and copying seems to come out as `slack/html` instead, which this tool doesn't handle.

`pbpaste` can't be used here — it only reads the plain-text, RTF and PostScript flavors, so it hands you the flattened text with the formatting already gone. Slack's clipboard data lives in a custom flavor, which Chromium-based apps (both the desktop app and Slack in a browser) pack into an `org.chromium.web-custom-data` pasteboard blob. `slack-paste` reads that via `osascript` and unpacks it.

It defaults to the `slack/texty` flavor. If a copy didn't produce that flavor, pass one explicitly or see what's actually on the clipboard:

```bash
slack-paste --list
slack-paste slack/html
```

### Example Shortcut (macOS)

[`Normalize Slack Markdown in Clipboard.shortcut`](Normalize%20Slack%20Markdown%20in%20Clipboard.shortcut) wraps the pipeline above in a Shortcuts.app shortcut: it runs `slack-paste | slack-to-markdown` in a Run Shell Script action and puts the Markdown back on the clipboard, so you copy the message in Slack, run the shortcut, and paste. Double-click the file to add it to your Shortcuts library, then give it a keyboard shortcut or run it from Spotlight or the menu bar.

Shortcuts runs shell scripts with a bare `PATH`, so if `npx` isn't found, edit the action to use the absolute path to your Node install (`which npx` will tell you where it is).

## Running tests
Requires Node.js 22+:

```bash
npm test
```
