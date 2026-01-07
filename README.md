# slack-to-markdown
Convert Slack's clipboard format to Slack-compatible Markdown.

## What it does
When you copy formatted text from Slack, it stores the content in the `slack/texty` clipboard format. This library converts that content to Markdown that can be pasted into other applications (or back into Slack) and render correctly.

## Usage

```typescript
import { slackToMarkdown } from "slack-to-markdown";

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

## Running tests
Requires Node.js 22+:

```bash
npm test
```
