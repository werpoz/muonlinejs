// Monster types that use the model of another type: the stronger copies
// of other monsters (Blood Castle 6-7, Devil Square 5-7, the quest monsters
// of the barracks of Balgass). Without imports: the sounds use it too.
const MODEL_ALIASES: Record<number, number> = {
  // Blood Castle 6-7 (and Devil Square 6-7): Lord Centurion, Necron,
  // Schriker, Illusion of Kundun, Death Angel, Death Centurion, Bloody
  // Soldier, Aegis
  ...Object.fromEntries(
    [148, 149, 160, 161, 144, 145, 146, 147].flatMap((base, i) =>
      [178, 186, 194].map(first => [first + i, base]).filter(([type]) => type <= 197)
    )
  ),
  // Devil Square 5-7
  434: 356, // Gigantis
  436: 344, // Balram (Trainee)
  437: 341, // Soram (Trainee)
  438: 358, // Persona
  439: 360, // Dreadfear
  440: 340, // Dark Elf
  // quest monsters of the barracks of Balgass
  409: 344, // Balram (Trainee Soldier)
  410: 345, // Death Spirit (Trainee Soldier)
  411: 341, // Soram (Trainee Soldier)
  412: 340, // Dark Elf (Trainee Soldier)
};

// the type whose model a monster type uses
export const modelTypeOf = (type: number) => MODEL_ALIASES[type] ?? type;

