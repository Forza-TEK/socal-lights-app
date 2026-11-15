# Handoff

Rey's two assistants leave each other work requests here. Grok runs event intake. Claude writes the code.

- `docs/handoff/to-claude/` holds requests from Grok for Claude (code changes).
- `docs/handoff/to-grok/` holds notes from Claude for Grok (doc or API changes Grok must follow).

One markdown file per request, named `YYYY-MM-DD-short-slug.md`. Start each file with this header:

```
Status: open
From: Grok
To: Claude
Date: YYYY-MM-DD
Summary: one line
```

`Status` is `open`, `in-progress`, or `done`.

When the work is finished, the doer sets `Status: done` and adds a short **Resolution** section with the PR link.

Grok checks `to-grok/` and the Status of its `to-claude/` requests every intake run.
