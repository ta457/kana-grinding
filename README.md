# Kana Grinding

A mobile-friendly hiragana and katakana practice app. Choose kana groups, type
their romanization or pick from four answers, and reveal an answer when needed.
Includes 214 kana across basic, voiced, and combination groups. Built with
vanilla HTML, CSS, and JavaScript; no installation or build step.

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
