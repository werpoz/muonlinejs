import { ENUM_WORLD } from './types';

// Number of the World / Object folder of a map. It's the map number + 1,
// but the levels of some events share the map of the first one: Blood
// Castle 1-8 (maps 11-17 and 52) use World12 and Devil Square 5-7 (map 32)
// uses World10, like the original client (OpenMU has the same terrain).
const SHARED_FOLDERS: Partial<Record<number, number>> = {
  12: 12,
  13: 12,
  14: 12,
  15: 12,
  16: 12,
  17: 12,
  52: 12,
  32: 10,
};

export const worldFolderNumber = (map: ENUM_WORLD | number) =>
  SHARED_FOLDERS[map] ?? map + 1;
