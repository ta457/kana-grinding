# Kana Grinding

A mobile-friendly hiragana and katakana practice app. Choose kana groups, type
their romanization or pick from four answers, and reveal an answer when needed.
Includes 214 kana across basic, voiced, and combination groups. Built with
vanilla HTML, CSS, and JavaScript; no installation or build step.

## Run locally

Serve the project over HTTP so the browser can load the JSON data and modules:

```sh
python -m http.server 8000
```

Open http://localhost:8000. Opening `index.html` directly from disk will not work.

## Checks

With Node.js 24 or newer:

```sh
node --test quiz.test.mjs
```

## Publish on GitHub Pages

Push the project to GitHub, then open the repository's **Settings → Pages**.
Choose **Deploy from a branch**, your publishing branch, and **/ (root)**.
No build workflow is necessary. Relative paths support the default project URL:
`https://<username>.github.io/kana-grinding/`.
See GitHub's [publishing-source instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Project files

- `index.html`, `styles.css`: accessible, responsive interface.
- `app.js`: page state and interactions; loads `kana.json` once.
- `quiz.js`: shared question filtering, answer matching, and choice generation.
- `kana.json`: selectable groups; each entry lists its kana and accepted romaji.
- `quiz.test.mjs`: data and quiz logic checks using Node's built-in test runner.
- `AGENT.md`: agreed scope and implementation guidance.

The first romaji spelling is displayed; typing accepts only spellings listed
in each entry.
When a selected set is too small for four distinct choices, wrong answers come
from other groups in the same script. Question kana still come only from the
selected groups. Answers and selections stay in the browser; selections reset
on reload.

Inspired by [DJT Kana](https://djtguide.neocities.org/kana/).
