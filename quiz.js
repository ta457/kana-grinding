export function questionPool(groups, selected) {
  return groups.filter(group => selected.has(group.id)).flatMap(group =>
    group.characters.map(character => ({ ...character, groupId: group.id, groupLabel: group.label }))
  );
}

export function normalizeSettings(settings, groups) {
  const known = new Set(groups.map(group => group.id));
  const selected = Array.isArray(settings?.groups) ? settings.groups : ['hiragana-vowels'];
  const pinned = Array.isArray(settings?.pinned) ? settings.pinned : [];
  return {
    groups: [...new Set(selected.filter(id => known.has(id)))],
    pinned: [...new Set(pinned.filter(id => known.has(id)))],
    mode: settings?.mode === 'choice' ? 'choice' : 'typing',
  };
}

export function reviewPool(pool, missed) {
  return shuffled(pool.filter(character => missed.has(character.kana)));
}

export function isCorrect(character, answer) {
  return character.romaji.includes(answer.trim().toLowerCase());
}

export function nextCombo(count, correct, eligible) {
  if (!correct) return 0;
  return eligible ? count + 1 : count;
}

export function shuffled(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const other = Math.floor(Math.random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

export function answerChoices(current, pool, groups) {
  const script = current.groupId.split('-')[0];
  const sameScript = groups.filter(group => group.id.startsWith(`${script}-`))
    .flatMap(group => group.characters);
  const candidates = [...shuffled(pool), ...shuffled(sameScript)];
  const wrong = [];
  for (const character of candidates) {
    const answer = character.romaji[0];
    if (!current.romaji.includes(answer) && !wrong.includes(answer)) wrong.push(answer);
    if (wrong.length === 3) break;
  }
  if (wrong.length < 3) throw new Error('Not enough distinct answers in this script.');
  return shuffled([current.romaji[0], ...wrong]);
}
