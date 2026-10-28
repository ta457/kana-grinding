import { questionPool, isCorrect, answerChoices, normalizeSettings, reviewPool, nextCombo } from './quiz.js';

const $ = id => document.getElementById(id);
const form = $('answer-form');
const answer = $('answer');
const choices = $('choices');
const selected = new Set(['hiragana-vowels']);
const pinned = new Set();
const missed = new Set();
const settingsKey = 'kana-grinding-settings';
let groups = [];
let pool = [];
let current = null;
let solved = false;
let mode = 'typing';
let reviewQueue = null;
let reviewTotal = 0;
let questionMissed = false;
let combo = 0;
let comboAwarded = false;

$('settings').open = window.matchMedia('(min-width: 761px)').matches;

function feedback(message = '', tone = '') {
  $('feedback').textContent = message;
  $('feedback').dataset.tone = tone;
}

function setCombo(count) {
  combo = count;
  $('combo-count').textContent = count;
}

function saveSettings() {
  try {
    localStorage.setItem(settingsKey, JSON.stringify({ groups: [...selected], pinned: [...pinned], mode }));
    $('storage-note').hidden = true;
  } catch {
    $('storage-note').hidden = false;
  }
}

function buildGroups() {
  $('groups').replaceChildren();
  const pinnedSection = document.createElement('fieldset');
  pinnedSection.className = 'script-groups';
  pinnedSection.id = 'pinned-section';
  pinnedSection.hidden = pinned.size === 0;
  const pinnedLegend = document.createElement('legend');
  pinnedLegend.textContent = 'Pinned';
  const pinnedGrid = document.createElement('div');
  pinnedGrid.className = 'group-grid';
  pinnedGrid.id = 'pinned-groups';
  pinnedSection.append(pinnedLegend, pinnedGrid);
  $('groups').append(pinnedSection);
  for (const script of ['hiragana', 'katakana']) {
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'script-groups';
    const legend = document.createElement('legend');
    legend.textContent = script === 'hiragana' ? 'Hiragana' : 'Katakana';
    fieldset.append(legend);
    for (const combinations of [false, true]) {
      const sectionGroups = groups.filter(item => item.id.startsWith(`${script}-`) && item.id.includes('-combo-') === combinations);
      const section = document.createElement('div');
      const header = document.createElement('div');
      header.className = 'group-header';
      const heading = document.createElement('h3');
      heading.className = 'combination-heading';
      heading.textContent = combinations ? 'Combinations' : 'Basic & voiced';
      header.append(heading);
      for (const selectAll of [true, false]) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'text-button';
        button.textContent = selectAll ? 'Select all' : 'Clear';
        button.setAttribute('aria-label', `${button.textContent} ${script} ${combinations ? 'combinations' : 'basic and voiced groups'}`);
        button.addEventListener('click', () => {
          for (const group of sectionGroups) {
            $(`group-${group.id}`).checked = selectAll;
            if (selectAll) selected.add(group.id);
            else selected.delete(group.id);
          }
          updateSelection();
        });
        header.append(button);
      }
      section.append(header);
      const grid = document.createElement('div');
      grid.className = 'group-grid';
      for (const group of sectionGroups) {
        const card = document.createElement('div');
        card.className = 'group-option';
        const label = document.createElement('label');
        label.className = 'group-select';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = `group-${group.id}`;
        input.value = group.id;
        input.checked = selected.has(group.id);
        input.setAttribute('aria-label', `${group.label}: ${group.characters.map(item => `${item.kana} ${item.romaji[0]}`).join(', ')}`);
        const characters = document.createElement('span');
        characters.className = 'group-characters';
        for (const character of group.characters) {
          const kana = document.createElement('ruby');
          kana.className = 'group-kana';
          kana.lang = 'ja';
          kana.textContent = character.kana;
          const romaji = document.createElement('rt');
          romaji.lang = 'en';
          romaji.textContent = character.romaji[0];
          kana.append(romaji);
          characters.append(kana);
        }
        label.append(input, characters);
        const pin = document.createElement('button');
        pin.type = 'button';
        pin.className = 'group-pin';
        pin.id = `pin-${group.id}`;
        pin.setAttribute('aria-pressed', String(pinned.has(group.id)));
        pin.setAttribute('aria-label', pinned.has(group.id) ? `Unpin ${group.label}` : `Pin ${group.label} to top`);
        pin.title = pin.getAttribute('aria-label');
        pin.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l-1 7 4 4v2H6v-2l4-4-1-7ZM12 16v5"/></svg>';
        pin.addEventListener('click', () => {
          if (pinned.has(group.id)) pinned.delete(group.id);
          else pinned.add(group.id);
          buildGroups();
          saveSettings();
          $(`pin-${group.id}`).focus({ preventScroll: true });
          $(`pin-${group.id}`).scrollIntoView({ block: 'nearest', behavior: 'instant' });
        });
        card.append(label, pin);
        (pinned.has(group.id) ? pinnedGrid : grid).append(card);
      }
      section.append(grid);
      fieldset.append(section);
    }
    $('groups').append(fieldset);
  }
}

function updateReviewControls() {
  const count = pool.filter(character => missed.has(character.kana)).length;
  const reviewing = reviewQueue !== null;
  $('review-bar').hidden = !reviewing && count === 0;
  $('review').hidden = (reviewing && current !== null) || count === 0;
  $('review').textContent = `${reviewing ? 'Review remaining' : 'Review missed'} (${count})`;
  $('back').hidden = !reviewing;
  $('review-status').textContent = reviewing
    ? (current ? `Review · ${reviewTotal - reviewQueue.length} of ${reviewTotal}` : `Pass complete · ${count} remaining`)
    : `${count} kana to revisit`;
}

function renderQuestion(focusAnswer = false) {
  solved = false;
  answer.value = '';
  form.noValidate = false;
  answer.removeAttribute('aria-invalid');
  $('check').textContent = 'Check ↵';
  choices.replaceChildren();
  feedback();
  $('reveal').disabled = !current;
  $('next').disabled = !current;
  form.hidden = !current || mode !== 'typing';
  choices.hidden = !current || mode !== 'choice';
  $('kana').textContent = current ? current.kana : '—';
  $('question-group').textContent = current ? current.groupLabel : 'YOUR PRACTICE SET IS EMPTY';
  $('question-help').textContent = current
    ? (mode === 'typing' ? 'What sound does this kana make?' : 'Choose the matching romaji.')
    : 'Select a group in Practice set to begin.';
  updateReviewControls();
  if (!current && reviewQueue !== null) {
    $('question-group').textContent = 'REVIEW COMPLETE';
    $('kana').textContent = '✓';
    $('question-help').textContent = 'Review any remaining kana, or go back to practice.';
    feedback('Review pass complete.');
    $('back').focus({ preventScroll: true });
  }
  if (!current) return;
  if (mode === 'choice') {
    for (const text of answerChoices(current, pool, groups)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'choice';
      button.textContent = text;
      button.addEventListener('click', () => submitAnswer(text, button));
      choices.append(button);
    }
    if (focusAnswer) choices.firstElementChild?.focus({ preventScroll: true });
  } else if (focusAnswer) {
    answer.focus({ preventScroll: true });
    answer.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }
}

function nextQuestion(focusAnswer = false) {
  questionMissed = false;
  comboAwarded = false;
  if (reviewQueue !== null) {
    current = reviewQueue.shift() ?? null;
  } else {
    const alternatives = pool.filter(item => item.kana !== current?.kana);
    const available = alternatives.length ? alternatives : pool;
    current = available[Math.floor(Math.random() * available.length)] ?? null;
  }
  renderQuestion(focusAnswer);
}

function updateSelection() {
  reviewQueue = null;
  const nextPool = questionPool(groups, selected);
  if (nextPool.length !== pool.length || nextPool.some((character, index) => character.kana !== pool[index].kana)) {
    setCombo(0);
  }
  pool = nextPool;
  $('selection-count').textContent = `${pool.length} kana · ${selected.size} ${selected.size === 1 ? 'group' : 'groups'}`;
  $('clear').disabled = selected.size === 0;
  saveSettings();
  nextQuestion();
  if (!current) {
    $('settings').open = true;
    feedback('Choose at least one kana group to start.');
  }
}

function finish(revealed) {
  setCombo(nextCombo(combo, !revealed, !questionMissed && !comboAwarded));
  comboAwarded = true;
  if (revealed) {
    missed.add(current.kana);
    questionMissed = true;
  } else if (reviewQueue !== null && !questionMissed) {
    missed.delete(current.kana);
  }
  solved = true;
  form.noValidate = true;
  answer.removeAttribute('aria-invalid');
  $('check').textContent = 'Next →';
  $('reveal').disabled = true;
  for (const button of choices.children) {
    button.disabled = true;
    if (button.textContent === current.romaji[0]) button.dataset.result = 'correct';
  }
  feedback(revealed ? `Answer: ${current.romaji.join(' / ')}. Take a look, then try the next one.` : `That’s right — ${current.romaji[0]}!`, revealed ? '' : 'correct');
  updateReviewControls();
  if (mode === 'choice') $('next').focus({ preventScroll: true });
}

function submitAnswer(value, button) {
  if (!current || solved || !value.trim()) return;
  if (isCorrect(current, value)) {
    finish(false);
  } else {
    setCombo(0);
    missed.add(current.kana);
    questionMissed = true;
    updateReviewControls();
    feedback('Not quite. Try again, or reveal the answer.', 'wrong');
    if (button) {
      button.dataset.result = 'wrong';
      button.disabled = true;
      choices.querySelector('button:not(:disabled)')?.focus({ preventScroll: true });
    } else {
      answer.setAttribute('aria-invalid', 'true');
      answer.select();
    }
  }
}

form.addEventListener('submit', event => {
  event.preventDefault();
  if (solved) nextQuestion(true);
  else submitAnswer(answer.value);
});
$('next').addEventListener('click', () => nextQuestion(true));
$('reveal').addEventListener('click', () => { if (current && !solved) finish(true); });
$('mode-switch').addEventListener('change', event => {
  mode = event.target.value;
  saveSettings();
  renderQuestion();
});
$('review').addEventListener('click', () => {
  reviewQueue = reviewPool(pool, missed);
  reviewTotal = reviewQueue.length;
  nextQuestion(true);
});
$('back').addEventListener('click', () => {
  reviewQueue = null;
  nextQuestion(true);
});
$('groups').addEventListener('change', event => {
  const input = event.target;
  if (input.checked) selected.add(input.value);
  else selected.delete(input.value);
  updateSelection();
});
$('clear').addEventListener('click', () => {
  selected.clear();
  for (const input of $('groups').querySelectorAll('input')) input.checked = false;
  updateSelection();
});

async function start() {
  try {
    const response = await fetch('./kana.json');
    if (!response.ok) throw new Error(`Kana request failed: ${response.status}`);
    groups = await response.json();
    if (!Array.isArray(groups) || !groups.length || groups.some(group =>
      !/^(hiragana|katakana)-/.test(group.id) || typeof group.label !== 'string' ||
      !Array.isArray(group.characters) || !group.characters.length || group.characters.some(character =>
        typeof character.kana !== 'string' || !character.kana || !Array.isArray(character.romaji) ||
        !character.romaji.length || character.romaji.some(text => typeof text !== 'string' || !/^[a-z]+$/.test(text))))) {
      throw new Error('Invalid kana data.');
    }
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem(settingsKey));
    } catch {
      // Unavailable storage or malformed settings must not prevent practice.
    }
    const settings = normalizeSettings(saved, groups);
    selected.clear();
    for (const id of settings.groups) selected.add(id);
    for (const id of settings.pinned) pinned.add(id);
    mode = settings.mode;
    document.querySelector(`input[name="mode"][value="${mode}"]`).checked = true;
    buildGroups();
    updateSelection();
    $('mode-switch').disabled = false;
  } catch (error) {
    current = null;
    renderQuestion();
    $('question-group').textContent = 'COULD NOT LOAD KANA';
    $('question-help').textContent = 'Please reload the page to try again.';
    $('selection-count').textContent = 'Kana unavailable';
    feedback('Could not load the practice data. Check your connection and reload.', 'error');
    console.error(error);
  } finally {
    $('practice').setAttribute('aria-busy', 'false');
  }
}

start();
