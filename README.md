# AI Notes Simplifier

This project is a small website that turns long notes into a short study-friendly summary.

## What it does

- Paste or type a long note.
- Upload a PDF and extract its text in the browser.
- Generate a concise summary with the main ideas.
- Extract key concepts, takeaways, and action points.
- Run locally with no API key.

Behavior details:

- If you paste or type text into the `Your note` field, the app will auto-summarize after you stop typing for a short moment. You can also press the `Summarize note` button to run it immediately.
- If you upload a PDF using the `Choose PDF` control, the file is selected; click the new `Summarize PDF` button to extract the PDF text in your browser and summarize it. This keeps PDF summarization separate from the typed/text flow.
Formatting changes:

- The main summary is now formatted for clarity: if the generated summary contains multiple sentences, the app displays them as numbered points so you can scan the key ideas quickly.
- Key concepts and takeaways continue to appear as concise lists for fast review.
Formatting details:

- The main summary is displayed as bulleted points for quick scanning.
- Long sentences are automatically chunked into shorter points (about 120 characters each) so each bullet is easier to read.
- Keywords detected in the `Key concepts` list are emphasized (bold + colored) inside each summary point to help you spot important topics.

Downloadable PDF:

- After generating a summary (from pasted text or an uploaded PDF), use the `Download summary PDF` button to create a concise PDF containing the main summary, key concepts, and takeaways. The file is generated client-side in your browser — no data is sent to any server.

## Run locally

```bash
npm install
npm start
```

Then open the local address shown in the terminal.

## How the summarizer works

The app uses a local extractive summarization agent:

1. It cleans and splits the note into sentences.
2. It scores important words and sentences.
3. It selects the strongest sentences in reading order.
4. It generates a compact summary plus key concepts and takeaways.

## Files

- `index.html` - page structure
- `styles.css` - visual design
- `main.js` - summarization logic and interactions
- `server.js` - simple local file server
- `package.json` - start script