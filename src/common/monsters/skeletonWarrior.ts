import type { World } from '../../ecs/world';
import { loadGLTF } from '../modelLoader';
import { MonsterObject } from '../monsterObject';

// [NpcInfo(14, "Skeleton Warrior")]
export class SkeletonWarrior extends MonsterObject {
  async init(world: World) {
    const bmd = await loadGLTF('Skill/Skeleton01.glb', world);

    this.load(bmd);
  }
}

// [NpcInfo(15, "Skeleton Archer")]
export class SkeletonArcher extends MonsterObject {
  async init(world: World) {
    this.load(await loadGLTF('Skill/Skeleton02.glb', world));
  }
}
