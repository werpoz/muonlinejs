// Storage kinds of ItemMoveRequest / ItemMoved (OpenMU's ItemStorageKind).
// The packet definitions don't include this enum, so the generated code
// used StorageType, whose values are different (vault is 1 there).
export enum ItemStorageKind {
  Inventory = 0,
  Trade = 1,
  Vault = 2,
  ChaosMachine = 3,
  PlayerShop = 4,
}
