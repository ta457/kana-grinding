import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { questionPool, isCorrect, answerChoices, normalizeSettings, reviewPool } from './quiz.js';

const groups = JSON.parse(await readFile(new URL('./kana.json', import.meta.url), 'utf8'));

test('data contains all 214 kana, unique groups, and valid accepted spellings', () => {
  assert.equal(groups.length, 56);
  assert.equal(new Set(groups.map(group => group.id)).size, groups.length);
  const allKana = new Set();
  for (const script of ['hiragana', 'katakana']) {
    const scriptGroups = groups.filter(group => group.id.startsWith(`${script}-`));
    assert.equal(scriptGroups.length, 28);
    assert.equal(scriptGroups.filter(group => !group.id.includes('-combo-')).flatMap(group => group.characters).length, 71);
    assert.equal(scriptGroups.filter(group => group.id.includes('-combo-')).flatMap(group => group.characters).length, 36);
    for (const group of scriptGroups) {
      assert.ok(group.label);
      assert.ok(group.characters.length);
      for (const character of group.characters) {
        assert.ok(!allKana.has(character.kana), `Duplicate kana: ${character.kana}`);
        allKana.add(character.kana);
        assert.ok(character.romaji.length);
        assert.equal(new Set(character.romaji).size, character.romaji.length);
        for (const answer of character.romaji) assert.match(answer, /^[a-z]+$/);
      }
    }
  }
  // Katakana must match the hiragana table, including every alternative spelling.
  for (const hiragana of groups.filter(group => group.id.startsWith('hiragana-'))) {
    const katakana = groups.find(group => group.id === hiragana.id.replace('hiragana-', 'katakana-'));
    assert.deepEqual(katakana.characters, hiragana.characters.map(character => ({
      kana: [...character.kana].map(char => String.fromCodePoint(char.codePointAt(0) + 0x60)).join(''),
      romaji: character.romaji,
    })));
  }
  assert.equal(allKana.size, 214);
});

test('pool contains only selected groups, including empty and single-kana selections', () => {
  assert.deepEqual(questionPool(groups, new Set()), []);
  const pool = questionPool(groups, new Set(['hiragana-vowels', 'katakana-combo-k']));
  assert.equal(pool.length, 8);
  assert.ok(pool.every(item => ['hiragana-vowels', 'katakana-combo-k'].includes(item.groupId)));
  assert.equal(questionPool(groups, new Set(['hiragana-nn']))[0].kana, 'ん');
});

test('saved settings preserve empty selections and validate group IDs and mode', () => {
  const defaults = { groups: ['hiragana-vowels'], mode: 'typing' };
  for (const settings of [null, false, 'invalid', [], { groups: 'invalid', mode: 'unknown' }]) {
    assert.deepEqual(normalizeSettings(settings, groups), defaults);
  }
  assert.deepEqual(normalizeSettings({ groups: [], mode: 'choice' }, groups), { groups: [], mode: 'choice' });
  assert.deepEqual(normalizeSettings({
    groups: ['katakana-nn', 'deleted-group', 'katakana-nn', null, 7, {}], mode: 'choice',
  }, groups), { groups: ['katakana-nn'], mode: 'choice' });
});

test('review pass snapshots unique missed kana from selected groups only', () => {
  const pool = questionPool(groups, new Set(['hiragana-vowels', 'katakana-nn']));
  const missed = new Set(['あ', 'あ', 'ン', 'し']);
  const review = reviewPool(pool, missed);
  assert.deepEqual(review.map(character => character.kana).sort(), ['あ', 'ン'].sort());
  assert.equal(review.length, 2);
  missed.add('い');
  missed.delete('あ');
  assert.equal(review.length, 2);
  review.shift();
  assert.equal(pool.length, 6);
  assert.deepEqual(reviewPool(pool, new Set()), []);
  assert.deepEqual(reviewPool([], missed), []);
});

test('typed answers normalize configured spellings and reject removed alternatives', () => {
  const pool = questionPool(groups, new Set(groups.map(group => group.id)));
  for (const character of pool) {
    for (const answer of character.romaji) assert.ok(isCorrect(character, ` ${answer.toUpperCase()} `));
    assert.equal(isCorrect(character, ''), false);
    assert.equal(isCorrect(character, 'wrong'), false);
  }
  assert.equal(isCorrect(pool.find(item => item.kana === 'し'), 'si'), false);
  assert.equal(isCorrect(pool.find(item => item.kana === 'を'), 'wo'), false);
  assert.equal(isCorrect(pool.find(item => item.kana === 'づ'), 'du'), false);
});

test('choices have exactly one accepted answer and three unique wrong answers for every kana', () => {
  const pool = questionPool(groups, new Set(groups.map(group => group.id)));
  for (let round = 0; round < 10; round++) {
    for (const character of pool) {
      const options = answerChoices(character, pool, groups);
      assert.equal(options.length, 4);
      assert.equal(new Set(options).size, 4);
      assert.equal(options.filter(answer => isCorrect(character, answer)).length, 1);
      assert.ok(options.includes(character.romaji[0]));
    }
  }
});

test('choices use selected answers first and fall back to the same script for tiny pools', () => {
  const selected = questionPool(groups, new Set(['hiragana-vowels']));
  assert.ok(answerChoices(selected[0], selected, groups).every(answer => selected.some(item => item.romaji[0] === answer)));
  const tiny = questionPool(groups, new Set(['katakana-nn']));
  const original = structuredClone(tiny);
  const options = answerChoices(tiny[0], tiny, groups);
  assert.equal(options.length, 4);
  assert.deepEqual(tiny, original);
  const katakanaAnswers = groups.filter(group => group.id.startsWith('katakana-')).flatMap(group => group.characters.map(item => item.romaji[0]));
  assert.ok(options.every(answer => katakanaAnswers.includes(answer)));
});
