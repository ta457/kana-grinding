# Kana Grinding

A mobile-friendly hiragana and katakana practice app. Choose kana groups, type
their romanization or pick from four answers, and reveal an answer when needed.
Includes 214 kana across basic, voiced, and combination groups. Built with
vanilla HTML, CSS, and JavaScript; no installation or build step.

## Practice settings and review

- Selected groups and practice mode are remembered in this browser using
  `localStorage`. Practice still works if browser storage is unavailable.
- Each script has **Select all** and **Clear** controls for its basic/voiced
  groups and its combinations. The global **Clear all** removes every selection.
- Wrong answers and reveals add a kana to the session's missed list once.
  Correcting an answer during normal practice does not remove it.
- **Review missed** starts one pass through missed kana in the selected groups.
  A correct first attempt without a reveal removes that kana. Wrong answers,
  reveals, and skipped questions remain for another pass.
- After a pass, choose **Review remaining** or **Back to practice**. Changing
  groups ends the pass while preserving the session's missed list. Changing
  answer mode keeps the current question and any mistake already made on it.
- The missed list resets on reload; it is not saved with settings.

## Checks

Run `node --test quiz.test.mjs` with Node.js 24 or newer. Serve the project
over HTTP, for example with `python -m http.server 8000`, to test in a browser.

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
selected groups. Answers and settings stay in the browser.

Inspired by [DJT Kana](https://djtguide.neocities.org/kana/).
