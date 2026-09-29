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
