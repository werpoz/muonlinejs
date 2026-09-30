import type { IVector2Like } from '../../libs/babylon/exports';
import { MonsterActionType, PlayerAction } from '../../common/objects/enum';
import type { MUAttributeSystem } from '../../libs/attributeSystem';
import type { ISystemFactory } from '../world';
import type { PlayerObject } from '../../common/playerObject';
import { MOUNT_ACTION_IDLE, MOUNT_ACTION_RUN, ridingAction } from '../../common/mounts';

// a dead monster: the death animation plays once, then the body fades out
// and is removed (OutOfScopeSystem waits for it)
export const DEATH_FADE_START = 1.6;
export const DEATH_FADE_TIME = 1;

export const AnimationSystem: ISystemFactory = world => {
  const playersQuery = world.with(
    'playerAnimation',
    'modelObject',
    'attributeSystem',
    'movement'
  );

  const playerAnimatableQuery = world.with('modelObject', 'playerAnimation');
  const monsterAnimatableQuery = world.with(
    'modelObject',
    'monsterAnimation',
    'movement',
    'modelObject'
  );

  const animatableModelObjectsQuery = world.with('modelObject');

  function calculateAnimation(
    attributeSystem: MUAttributeSystem,
    velocity: IVector2Like
  ) {
    const inSafeZone = attributeSystem.isAboveZero('inSafeZone');
    const isFemale = attributeSystem.isAboveZero('isFemale');
    const isFlying = attributeSystem.isAboveZero('isFlying');
    const isSwimming = attributeSystem.isAboveZero('isSwimming');
    const isSpearEquipped = attributeSystem.isAboveZero('isSpearEquipped');
    const isMoving = velocity.x !== 0 || velocity.y !== 0;

    //
    // Female player animations
    //

    if (inSafeZone) {
      if (isFemale) {
        if (isMoving) {
          return PlayerAction.PLAYER_WALK_FEMALE;
        }

        return PlayerAction.PLAYER_STOP_FEMALE;
      }

      if (isMoving) {
        return PlayerAction.PLAYER_WALK_MALE;
      }

      return PlayerAction.PLAYER_STOP_MALE;
    }

    if (isSpearEquipped) {
      if (isMoving) {
        if (isFlying) {
          return PlayerAction.PLAYER_FLY;
        }

        if (isSwimming) {
          return PlayerAction.PLAYER_WALK_SWIM;
        }

        return PlayerAction.PLAYER_WALK_SPEAR;
      }

      return PlayerAction.PLAYER_STOP_SPEAR;
    }

    if (isFemale) {
      if (isMoving) {
        if (isFlying) {
          return PlayerAction.PLAYER_FLY;
        }

        if (isSwimming) {
          return PlayerAction.PLAYER_WALK_SWIM;
        }

        return PlayerAction.PLAYER_WALK_FEMALE;
      }

      if (isFlying) {
        return PlayerAction.PLAYER_STOP_FLY;
      }

      if (isSwimming) {
        return PlayerAction.PLAYER_STOP_FEMALE;
      }

      return PlayerAction.PLAYER_STOP_FEMALE;
    }

    //
    // Male player animations
    //

    if (isMoving) {
      if (isFlying) {
        return PlayerAction.PLAYER_FLY;
      }

      if (isSwimming) {
        return PlayerAction.PLAYER_WALK_SWIM;
      }

      return PlayerAction.PLAYER_WALK_MALE;
    }

    if (isFlying) {
      return PlayerAction.PLAYER_STOP_FLY;
    }
    if (isSwimming) {
      return PlayerAction.PLAYER_STOP_MALE;
    }

    return PlayerAction.PLAYER_STOP_MALE;
  }

  return {
    update: dt => {
      // calculate current anim
      for (const entity of playersQuery) {
        const { playerAnimation, movement, attributeSystem } = entity;
        const playerObject = entity.modelObject as PlayerObject;
        const mount = playerObject.mountKind;
        const isMoving = movement.velocity.x !== 0 || movement.velocity.y !== 0;

        // the mount runs or stands with the player
        if (mount && playerObject.Mount?.Ready) {
          playerObject.Mount.playAction(isMoving ? MOUNT_ACTION_RUN : MOUNT_ACTION_IDLE, true);
        }

        if (playerAnimation.action === PlayerAction.PLAYER_DIE1) continue;

        if (playerAnimation.oneShotTime) {
          playerAnimation.oneShotTime = Math.max(
            0,
            playerAnimation.oneShotTime - dt
          );
          continue;
        }
        const armed = !!(entity.charAppearance?.leftHand || entity.charAppearance?.rightHand);
        playerAnimation.action = mount
          ? ridingAction(mount, isMoving, armed)
          : calculateAnimation(attributeSystem, movement.velocity);
      }

      // update anim
      for (const { playerAnimation, modelObject } of playerAnimatableQuery) {
        const playerObject = modelObject as PlayerObject;
        if (!playerObject.Ready) continue;

        if (modelObject.ActionIterationWasFinished) {
        }

        if (
          playerAnimation.action >= PlayerAction.PLAYER_WALK_MALE &&
          playerAnimation.action <= PlayerAction.PLAYER_RUN_SWIM
        ) {
          playerObject.AnimationSpeed = 6; // TODO depends on movement speed;
        }

        playerObject.playAction(playerAnimation.action, true);

        if (playerObject.Wings) {
          if (playerObject.CurrentAction < 15) {
            playerObject.Wings.AnimationSpeed = 4;
          } else {
            playerObject.Wings.AnimationSpeed = 16;
          }
        }
      }

      //
      // Monsters
      //

      for (const {
        monsterAnimation,
        movement,
        modelObject,
      } of monsterAnimatableQuery) {
        const isMoving = movement.velocity.x !== 0 || movement.velocity.y !== 0;

        if (monsterAnimation.action === MonsterActionType.Die) {
          const time = (monsterAnimation.deathTime ?? 0) + dt;
          monsterAnimation.deathTime = time;
          modelObject.playAction(MonsterActionType.Die, false);
          if (time > DEATH_FADE_START) {
            modelObject.setAlpha(
              Math.max(0, 1 - (time - DEATH_FADE_START) / DEATH_FADE_TIME)
            );
          }
          continue;
        }

        if (monsterAnimation.oneShotTime) {
          monsterAnimation.oneShotTime = Math.max(
            0,
            monsterAnimation.oneShotTime - dt
          );
        } else {
          monsterAnimation.action = isMoving
            ? MonsterActionType.Walk
            : MonsterActionType.Stop1;
        }
        // monsterAnimation.action = isMoving
        //   ? MonsterActionType.Walk
        //   : MonsterActionType.Stop1;

        modelObject.playAction(monsterAnimation.action, true);
      }
    },
  };
};
