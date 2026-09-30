import type { World } from '../../ecs/world';
import { loadGLTF } from '../modelLoader';
import { MonsterObject } from '../monsterObject';

// [NpcInfo(6, "Lich")]
export class Lich extends MonsterObject {
  static {
    Lich.OverrideScale = 0.85;
  }

  async init(world: World) {
    this.load(await loadGLTF('Monster/Monster05.glb', world));
  }
}
