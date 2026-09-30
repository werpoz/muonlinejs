// Extracts the monster -> sounds table (idle, attack, death, damage) and the
// skill -> sound table from the C# MU client at
// https://github.com/bernatvadell/muonline ("based on C++ SetMonsterSound"
// of the original client). Only the sound names are taken, no code; they
// must exist in src/common/sounds.json.
//
// usage: bun run tools/extractMonsterSounds.ts <path to muonline clone>
import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import sounds from '../src/common/sounds.json';

const root = process.argv[2];
if (!root) throw new Error('usage: extractMonsterSounds.ts <muonline clone>');

const OUTPUT = join(import.meta.dir, '../src/common/monsterSounds.json');
const SKILLS_OUTPUT = join(import.meta.dir, '../src/common/skillSounds.json');

// method of the C# monster class -> event of the client
const EVENTS: Record<string, string> = {
  OnIdle: 'idle',
  OnPerformAttack: 'attack',
  OnDeathAnimationStart: 'death',
  OnReceiveDamage: 'damage',
};

type SoundSet = Record<string, string[]>;

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (entry.name.endsWith('.cs')) yield path;
  }
}

// body of each overridden method (until the next method or the end)
function methodSounds(src: string): SoundSet {
  const result: SoundSet = {};
  const methods = [...src.matchAll(/override\s+\w+\s+(On\w+)\s*\(/g)];
  methods.forEach((m, i) => {
    const event = EVENTS[m[1]];
    if (!event) return;
    const body = src.slice(m.index!, methods[i + 1]?.index ?? src.length);
    const names = body
      .split('\n')
      .filter(line => !line.trim().startsWith('//'))
      .flatMap(line => [...line.matchAll(/"(Sound\/[^"]+)\.wav"/g)].map(s => s[1]))
      .filter(name => name in sounds);
    if (names.length) result[event] = [...new Set(names)];
  });
  return result;
}

const classes = new Map<string, { number?: number; base: string; sounds: SoundSet }>();

for (const file of walk(join(root, 'Client.Main/Objects/Monsters'))) {
  const src = readFileSync(file, 'utf8');
  const cls = src.match(/class\s+(\w+)\s*:\s*(\w+)/);
  if (!cls) continue;
  const info = src.match(/\[NpcInfo\((\d+),/);
  classes.set(cls[1], {
    number: info ? Number(info[1]) : undefined,
    base: cls[2],
    sounds: methodSounds(src),
  });
}

// a class without its own sounds uses the ones of its base class
function resolve(name: string, depth = 0): SoundSet {
  const c = classes.get(name);
  if (!c || depth > 5) return {};
  return { ...resolve(c.base, depth + 1), ...c.sounds };
}

const table: Record<number, SoundSet> = {};
for (const [name, c] of classes) {
  if (c.number == null) continue;
  const set = resolve(name);
  if (Object.keys(set).length) table[c.number] = set;
}

writeFileSync(OUTPUT, JSON.stringify(table, null, 1) + '\n');
console.log(`${Object.keys(table).length} monsters with sounds -> ${OUTPUT}`);

// skill number -> sound (map[number] = "Sound/....wav" in SkillDefinitions)
const skillSource = readFileSync(join(root, 'Client.Data/BMD/SkillDefinitions.cs'), 'utf8');
const skillTable: Record<number, string> = {};
for (const m of skillSource.matchAll(/map\[(\d+)\]\s*=\s*"(Sound\/[^"]+)\.wav"/g)) {
  if (m[2] in sounds) skillTable[Number(m[1])] = m[2];
}
writeFileSync(SKILLS_OUTPUT, JSON.stringify(skillTable, null, 1) + '\n');
console.log(`${Object.keys(skillTable).length} skills with sounds -> ${SKILLS_OUTPUT}`);
