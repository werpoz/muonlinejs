// Skill numbers as used by OpenMU / the original client.
// `targeted` skills are sent with TargetedSkill (a target object is needed);
// area skills need client side hit detection (AreaSkillHit), not supported yet.
export type SkillInfo = {
  name: string;
  targeted: boolean;
  range: number; // tiles
};

export const SKILLS: Record<number, SkillInfo> = {
  1: { name: 'Poison', targeted: true, range: 6 },
  2: { name: 'Meteorite', targeted: true, range: 6 },
  3: { name: 'Lightning', targeted: true, range: 6 },
  4: { name: 'Fire Ball', targeted: true, range: 6 },
  5: { name: 'Flame', targeted: false, range: 6 },
  7: { name: 'Ice', targeted: true, range: 6 },
  8: { name: 'Twister', targeted: false, range: 6 },
  9: { name: 'Evil Spirit', targeted: false, range: 6 },
  10: { name: 'Hellfire', targeted: false, range: 3 },
  11: { name: 'Power Wave', targeted: true, range: 6 },
  12: { name: 'Aqua Beam', targeted: false, range: 6 },
  13: { name: 'Cometfall', targeted: false, range: 6 },
  14: { name: 'Inferno', targeted: false, range: 3 },
  17: { name: 'Energy Ball', targeted: true, range: 6 },
  19: { name: 'Falling Slash', targeted: true, range: 3 },
  20: { name: 'Lunge', targeted: true, range: 2 },
  21: { name: 'Uppercut', targeted: true, range: 2 },
  22: { name: 'Cyclone', targeted: true, range: 2 },
  23: { name: 'Slash', targeted: true, range: 2 },
  24: { name: 'Triple Shot', targeted: false, range: 6 },
  26: { name: 'Heal', targeted: true, range: 6 },
  27: { name: 'Greater Defense', targeted: true, range: 6 },
  28: { name: 'Greater Damage', targeted: true, range: 6 },
  41: { name: 'Twisting Slash', targeted: false, range: 2 },
  42: { name: 'Rageful Blow', targeted: false, range: 3 },
  43: { name: 'Death Stab', targeted: true, range: 2 },
  47: { name: 'Impale', targeted: true, range: 3 },
  51: { name: 'Ice Arrow', targeted: true, range: 8 },
  52: { name: 'Penetration', targeted: false, range: 8 },
};

export const getSkillInfo = (skill: number): SkillInfo => {
  return SKILLS[skill] ?? { name: `Skill ${skill}`, targeted: true, range: 6 };
};

// skills that throw a ball towards the target
export const PROJECTILE_SKILLS = new Set([4, 17]);

// Item (scroll / orb) that teaches each skill, its icon is used for the skill
// (from the OpenMU configuration).
export const SKILL_ICONS: Record<number, { group: number; num: number }> = {
  1: { group: 15, num: 0 },
  2: { group: 15, num: 1 },
  3: { group: 15, num: 2 },
  4: { group: 15, num: 3 },
  5: { group: 15, num: 4 },
  6: { group: 15, num: 5 },
  7: { group: 15, num: 6 },
  8: { group: 15, num: 7 },
  9: { group: 15, num: 8 },
  10: { group: 15, num: 9 },
  11: { group: 15, num: 10 },
  12: { group: 15, num: 11 },
  13: { group: 15, num: 12 },
  14: { group: 15, num: 13 },
  15: { group: 15, num: 14 },
  16: { group: 15, num: 15 },
  26: { group: 12, num: 8 },
  27: { group: 12, num: 9 },
  28: { group: 12, num: 10 },
  30: { group: 12, num: 11 },
  38: { group: 15, num: 16 },
  39: { group: 15, num: 17 },
  40: { group: 15, num: 18 },
  41: { group: 12, num: 7 },
  42: { group: 12, num: 12 },
  43: { group: 12, num: 19 },
  47: { group: 12, num: 13 },
  48: { group: 12, num: 14 },
  51: { group: 12, num: 18 },
  52: { group: 12, num: 17 },
  55: { group: 12, num: 16 },
  61: { group: 12, num: 21 },
  63: { group: 12, num: 22 },
  64: { group: 12, num: 23 },
  65: { group: 12, num: 24 },
  78: { group: 12, num: 35 },
  214: { group: 15, num: 20 },
  215: { group: 15, num: 19 },
  217: { group: 15, num: 22 },
  218: { group: 15, num: 23 },
  219: { group: 15, num: 24 },
  221: { group: 15, num: 26 },
  222: { group: 15, num: 27 },
  230: { group: 15, num: 21 },
  232: { group: 12, num: 44 },
  233: { group: 15, num: 28 },
  234: { group: 12, num: 46 },
  235: { group: 12, num: 45 },
  236: { group: 12, num: 47 },
  237: { group: 15, num: 29 },
  238: { group: 12, num: 48 },
  262: { group: 15, num: 30 },
  263: { group: 15, num: 31 },
  264: { group: 15, num: 32 },
  265: { group: 15, num: 33 },
  266: { group: 15, num: 34 },
  267: { group: 15, num: 35 },
  268: { group: 15, num: 36 },
};
