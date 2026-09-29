import type { World } from '../../ecs/world';
import { loadGLTF } from '../modelLoader';
import { MonsterObject } from '../monsterObject';

// [NpcInfo(7, "Giant")]
export class Giant extends MonsterObject {
  static {
    Giant.OverrideScale = 1.6;
  }

  async init(world: World) {
    this.load(await loadGLTF('Monster/Monster06.glb', world));
  }
}
