import { ENUM_WORLD } from '../types';

export function getTilesList(map: ENUM_WORLD) {
  switch (map) {
    case ENUM_WORLD.WD_0LORENCIA:
      return [
        'TileGrass01',
        'TileGrass02',
        'TileGround01',
        'TileGround02',
        'TileGround03',
        'TileWater01',
        'TileWood01',
        'TileRock01',
        'TileRock02',
      ];
    case ENUM_WORLD.WD_1DUNGEON:
      return [
        'TileGrass01',
        'TileGrass02',
        'TileGround01',
        'TileGround02',
        'TileGround03',
        'TileWater01',
        'TileWood01',
        'TileRock01',
        'TileRock02',
      ];
    case ENUM_WORLD.WD_2DEVIAS:
      return [
        'TileGrass01',
        'TileGrass02',
        'TileGround01',
        'TileGround02',
        'TileGround03',
        'TileWater01',
        'TileWood01',
        'TileRock01',
        'TileRock02',
        'TileRock03',
        'TileRock04',
        'TileRock05',
        'TileRock06',
        'TileRock07',
      ];
    case ENUM_WORLD.WD_3NORIA:
      return [
        'TileGrass01',
        'TileGrass01',
        'TileGround01',
        'TileGround01',
        'TileGround03',
        'TileWater01',
        'TileWood01',
        'TileRock01',
        'TileRock02',
        'TileRock03',
        'TileRock04',
      ];
    case ENUM_WORLD.WD_4LOSTTOWER:
      return [
        'TileGrass01',
        'TileGrass02',
        'TileGround01',
        'TileGround02',
        'TileGround03',
        'TileWater01',
        'TileWood01',
        'TileRock01',
        'TileRock02',
        'TileRock03',
        'TileRock04',
      ];
    case ENUM_WORLD.WD_6STADIUM:
      return [
        'TileGrass01',
        'TileGrass02',
        'TileGround01',
        'TileGround02',
        'TileGround03',
        'TileWater01',
        'TileWood01',
        'TileRock01',
        'TileRock02',
        'TileRock03',
        'TileRock04',
      ];
    case ENUM_WORLD.WD_7ATLANSE:
      return [
        'TileGrass01',
        'TileGrass02',
        'TileGround01',
        'TileGround01',
        'TileGround03',
        'TileGrass01',
        'TileWood01',
        'TileRock01',
        'TileRock02',
        'TileRock03',
        'TileRock04',
      ];
    case ENUM_WORLD.WD_8TARKAN:
      return [
        'TileGrass01',
        'TileGrass02',
        'TileGround01',
        'TileGround02',
        'TileGround03',
        'TileWater01',
        'TileWood01',
        'TileRock01',
        'TileRock02',
        'TileRock03',
        'TileRock04',
      ];
    // Devil Square and Blood Castle: the usual tiles (the missing ones are
    // replaced when loaded)
    case ENUM_WORLD.WD_9DEVILSQUARE:
    case ENUM_WORLD.WD_11BLOODCASTLE1:
    case ENUM_WORLD.WD_11BLOODCASTLE1 + 1:
    case ENUM_WORLD.WD_11BLOODCASTLE1 + 2:
    case ENUM_WORLD.WD_11BLOODCASTLE1 + 3:
    case ENUM_WORLD.WD_11BLOODCASTLE1 + 4:
    case ENUM_WORLD.WD_11BLOODCASTLE1 + 5:
    case ENUM_WORLD.WD_11BLOODCASTLE_END:
    // Blood Castle 8 and Devil Square 5-7 (World12 / World10)
    case 52 as ENUM_WORLD:
    case 32 as ENUM_WORLD:
      return [
        'TileGrass01',
        'TileGrass02',
        'TileGround01',
        'TileGround02',
        'TileGround03',
        'TileWater01',
        'TileWood01',
        'TileRock01',
        'TileRock02',
        'TileRock03',
        'TileRock04',
      ];
    case ENUM_WORLD.WD_10ICARUS:
      return [
        'TileGrass01',
        //  'TileGrass01'
      ];
    case ENUM_WORLD.WD_51ELBELAND:
      return [
        'TileGrass01',
        'TileGrass02',
        'TileGround01',
        'TileGround02',
        'TileGround03',
        'TileWater01',
        'TileWood01',
        'TileRock01',
        'TileRock02',
        'TileRock03',
        'TileRock04',
        'TileRock05',
        'TileRock06',
        'TileRock07',
      ];
  }

  console.error(`Not implemented for ${ENUM_WORLD[map]}`);
  return [];
}
