import { ENUM_WORLD } from './types';

// Number of the World / Object folder of a map. It's the map number + 1,
// but the levels of some events share the map of the first one: Blood
// Castle 1-8 (maps 11-17 and 52) use World12 and Devil Square 5-7 (map 32)
// uses World10 and Chaos Castle 1-7 (maps 18-23 and 53) use World19,
// like the original client (OpenMU has the same terrain).
const SHARED_FOLDERS: Partial<Record<number, number>> = {
  12: 12,
  13: 12,
  14: 12,
  15: 12,
  16: 12,
  17: 12,
  52: 12,
  32: 10,
  19: 19,
  20: 19,
  21: 19,
  22: 19,
  23: 19,
  53: 19,
};

export const worldFolderNumber = (map: ENUM_WORLD | number) =>
  SHARED_FOLDERS[map] ?? map + 1;
