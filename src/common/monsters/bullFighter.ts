import type { World } from '../../ecs/world';
import { loadGLTF } from '../modelLoader';
import { MonsterObject } from '../monsterObject';

// [NpcInfo(0, "Bull Fighter")]
export class BullFighter extends MonsterObject {
  static {
    BullFighter.OverrideScale = 0.8;
  }

  async init(world: World) {
    this.load(await loadGLTF('Monster/Monster01.glb', world));
  }
}

// [NpcInfo(4, "Elite Bull Fighter")] - same model, bigger
export class EliteBullFighter extends BullFighter {
  static {
    EliteBullFighter.OverrideScale = 1.15;
  }
}
