import { questionPool, isCorrect, answerChoices } from './quiz.js';

const $ = id => document.getElementById(id);
const form = $('answer-form');
const answer = $('answer');
const choices = $('choices');
const selected = new Set(['hiragana-vowels']);
let groups = [];
let pool = [];
let current = null;
let solved = false;
let mode = 'typing';

$('settings').open = window.matchMedia('(min-width: 761px)').matches;

function feedback(message = '', tone = '') {
  $('feedback').textContent = message;
  $('feedback').dataset.tone = tone;
}

function buildGroups() {
  for (const script of ['hiragana', 'katakana']) {
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'script-groups';
    const legend = document.createElement('legend');
    legend.textContent = script === 'hiragana' ? 'Hiragana' : 'Katakana';
    fieldset.append(legend);
    for (const combinations of [false, true]) {
      if (combinations) {
        const heading = document.createElement('h3');
        heading.className = 'combination-heading';
        heading.textContent = 'Combinations';
        fieldset.append(heading);
      }
      const grid = document.createElement('div');
      grid.className = 'group-grid';
      for (const group of groups.filter(item => item.id.startsWith(`${script}-`) && item.id.includes('-combo-') === combinations)) {
        const label = document.createElement('label');
        label.className = 'group-option';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = group.id;
        input.checked = selected.has(group.id);
        input.setAttribute('aria-label', `${group.label}: ${group.characters.map(item => item.kana).join(' ')}`);
        const kana = document.createElement('span');
        kana.className = 'group-kana';
        kana.lang = 'ja';
        kana.textContent = group.characters[0].kana;
        const name = document.createElement('span');
        name.textContent = group.characters[0].romaji[0];
        label.append(input, kana, name);
        grid.append(label);
      }
      fieldset.append(grid);
    }
    $('groups').append(fieldset);
  }
}

function renderQuestion(focusInput = false) {
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
  } else if (focusInput) {
    answer.focus({ preventScroll: true });
    answer.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  }
}

function nextQuestion(focusInput = false) {
  const alternatives = pool.filter(item => item.kana !== current?.kana);
  const available = alternatives.length ? alternatives : pool;
  current = available[Math.floor(Math.random() * available.length)] ?? null;
  renderQuestion(focusInput);
}

function updateSelection() {
  pool = questionPool(groups, selected);
  $('selection-count').textContent = `${pool.length} kana · ${selected.size} ${selected.size === 1 ? 'group' : 'groups'}`;
  $('clear').disabled = selected.size === 0;
  nextQuestion();
  if (!current) {
    $('settings').open = true;
    feedback('Choose at least one kana group to start.');
  }
}

function finish(revealed) {
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
  if (mode === 'choice') $('next').focus({ preventScroll: true });
}

function submitAnswer(value, button) {
  if (!current || solved || !value.trim()) return;
  if (isCorrect(current, value)) {
    finish(false);
  } else {
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
$('next').addEventListener('click', () => nextQuestion(mode === 'typing'));
$('reveal').addEventListener('click', () => { if (current && !solved) finish(true); });
$('mode-switch').addEventListener('change', event => {
  mode = event.target.value;
  renderQuestion();
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
