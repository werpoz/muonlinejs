import { RenderSystem } from './systems/renderSystem';
import { World, type ISystemFactory } from './world';
import { PathfindingSystem } from './systems/pathfindingSystem';
import { PlayerControllerSystem } from './systems/playerControllerSystem';
import { MoveAlongPathSystem } from './systems/moveAlongPathSystem';
import { AnimationSystem } from './systems/animationSystem';
import { ModelLoaderSystem } from './systems/modelLoaderSystem';
import { CameraFollowSystem } from './systems/cameraFollowSystem';
import { NetworkSystem } from './systems/networkSystem';
import { OutOfScopeSystem } from './systems/outOfScopeSystem';
import { CalculateVisibilitySystem } from './systems/calculateVisibilitySystem';
import { CalculateScreenPositionSystem } from './systems/calculateScreenPositionSystem';
import { AppearanceSystem } from './systems/appearanceSystem';
import { DrawDebugSystem } from './systems/drawDebugSystem';
import { HighlightSystem } from './systems/highlightSystem';
import type { TestScene } from '../scenes/testScene';
import { PointerInputSystem } from './systems/pointerInputSystem';
import { KeyboardInputSystem } from './systems/keyboardInputSystem';
import { BackgroundMusicSystem } from './systems/backgroundMusicSystem';
import { InteractiveAreaSystem } from './systems/interactiveAreaSystem';
import { WalkSfxSystem } from './systems/walkSfxSystem';
import { MonsterIdleSoundSystem } from './systems/monsterIdleSoundSystem';
import { AttackSystem } from './systems/attackSystem';
import { PickupSystem } from './systems/pickupSystem';
import { DropItemSystem } from './systems/dropItemSystem';
import { GateSystem } from './systems/gateSystem';
import { NpcTalkSystem } from './systems/npcTalkSystem';
import { AreaSkillHitSystem } from './systems/areaSkillHitSystem';
import { BuffAuraSystem } from './systems/buffAuraSystem';

const factories: ISystemFactory[] = [
  ModelLoaderSystem,
  PointerInputSystem,
  KeyboardInputSystem,
  InteractiveAreaSystem,
  DropItemSystem,
  AttackSystem,
  AreaSkillHitSystem,
  PickupSystem,
  NpcTalkSystem,
  PlayerControllerSystem,
  PathfindingSystem,
  CalculateVisibilitySystem,
  CalculateScreenPositionSystem,
  NetworkSystem,
  MoveAlongPathSystem,
  GateSystem,
  HighlightSystem,
  AnimationSystem,
  AppearanceSystem,
  BuffAuraSystem,
  WalkSfxSystem,
  MonsterIdleSoundSystem,
  CameraFollowSystem,
  OutOfScopeSystem,
  BackgroundMusicSystem,
  DrawDebugSystem,
  RenderSystem,
];

export function createWorld(scene: TestScene) {
  const world = new World(scene);

  const systems = factories.map(f => f(world));
  const names = factories.map(f => f.name);

  return {
    world,
    updateSystems: (dt: number) => {
      // profiling: `window.__systemTimes = {}` in the console accumulates
      // the milliseconds of each system
      const times = (window as any).__systemTimes as Record<string, number> | undefined;
      systems.forEach((system, i) => {
        if (!times) {
          system.update?.(dt);
          return;
        }
        const start = performance.now();
        system.update?.(dt);
        times[names[i]] = (times[names[i]] ?? 0) + performance.now() - start;
      });
    },
  } as const;
}
