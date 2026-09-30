// Extracts the monster/NPC -> model table (number, name, model file, scale)
// from the C# MU client at https://github.com/bernatvadell/muonline
// (values "set according to C++ Setting_Monster" of the original client).
// Only these data values are taken, no code.
//
// usage: bun run tools/extractNpcModels.ts <path to muonline clone>
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join, relative } from 'path';

const root = process.argv[2];
if (!root) throw new Error('usage: extractNpcModels.ts <muonline clone>');

const ASSETS_DIR = join(import.meta.dir, '../public/game-assets');
const OUTPUT = join(import.meta.dir, '../src/common/npcModels.json');

type ClassInfo = {
  number?: number;
  name?: string;
  base: string;
  scale?: number;
  model?: string;
  // NPC models that are only a skeleton get body part models
  // (head, upper, lower, gloves, boots) of a numbered variant
  bodyParts?: { parts: string[]; index: number };
  kind: 'monster' | 'npc';
};

function* walk(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (entry.name.endsWith('.cs')) yield path;
  }
}

const classes = new Map<string, ClassInfo>();

for (const file of walk(join(root, 'Client.Main/Objects'))) {
  const src = readFileSync(file, 'utf8');
  const cls = src.match(/class\s+(\w+)\s*:\s*(\w+)/);
  if (!cls) continue;

  const info = src.match(/\[NpcInfo\((\d+),\s*"([^"]*)"\)\]/);
  const scale = src.match(/\bScale\s*=\s*([\d.]+)f?\s*;/);
  const model = src.match(/\bModel\s*=\s*await\s+BMDLoader\.Instance\.Prepare\(\$?"([^"{}]+)"\)/);
  const parts = src.match(
    /SetBodyPartsAsync\(\s*\$?"[^"]*",\s*"([^"]*)",\s*"([^"]*)",\s*"([^"]*)",\s*"([^"]*)",\s*"([^"]*)",\s*(\d+)/
  );

  classes.set(cls[1], {
    number: info ? +info[1] : undefined,
    name: info?.[2],
    base: cls[2],
    scale: scale ? +scale[1] : undefined,
    model: model?.[1],
    bodyParts: parts
      ? { parts: parts.slice(1, 6), index: +parts[6] }
      : undefined,
    kind: relative(root, file).includes('/Monsters/') ? 'monster' : 'npc',
  });
}

// model and scale come from the class or the closest base class
function resolve(name: string, key: 'model' | 'scale') {
  for (let c = classes.get(name); c; c = classes.get(c.base)) {
    if (c[key] !== undefined) return c[key];
  }
}

// asset file names don't always keep the case of the original files
const assets = new Map<string, string>();
for (const dir of readdirSync(ASSETS_DIR)) {
  if (!existsSync(join(ASSETS_DIR, dir)) || dir.includes('.')) continue;
  for (const file of readdirSync(join(ASSETS_DIR, dir))) {
    assets.set(`${dir}/${file}`.toLowerCase(), `${dir}/${file}`);
  }
}

// body part file name as in game-assets ('' when there is no such model)
function bodyPart(prefix: string, index: number) {
  if (!prefix) return '';
  const suffix = index.toString().padStart(2, '0');
  for (const name of [prefix, `${prefix}s`]) {
    const file = assets.get(`npc/${name}${suffix}.glb`.toLowerCase());
    if (file) return file.slice('NPC/'.length, -`${suffix}.glb`.length);
  }
  return '';
}

type Entry = {
  name: string;
  model: string;
  scale: number;
  kind: string;
  bodyParts?: { parts: string[]; index: number };
};
const table: Record<number, Entry> = {};
const missing: string[] = [];

for (const [className, c] of classes) {
  if (c.number === undefined) continue;

  const model = resolve(className, 'model') as string | undefined;
  if (!model) {
    missing.push(`${c.number} ${c.name}: no model`);
    continue;
  }

  const glb = assets.get(model.replace(/\.bmd$/i, '.glb').toLowerCase());
  if (!glb) {
    missing.push(`${c.number} ${c.name}: ${model} not in game-assets`);
    continue;
  }

  table[c.number] = {
    name: c.name!,
    model: glb,
    scale: (resolve(className, 'scale') as number | undefined) ?? 1,
    kind: c.kind,
  };

  if (c.bodyParts) {
    const { parts, index } = c.bodyParts;
    table[c.number].bodyParts = {
      parts: parts.map(p => bodyPart(p, index)),
      index,
    };
  }
}

const sorted = Object.keys(table)
  .map(Number)
  .sort((a, b) => a - b)
  .map(n => `  "${n}": ${JSON.stringify(table[n])}`);
writeFileSync(OUTPUT, `{\n${sorted.join(',\n')}\n}\n`);

console.log(`${sorted.length} models written to ${relative(process.cwd(), OUTPUT)}`);
console.log(`${missing.length} skipped:\n  ${missing.join('\n  ')}`);
