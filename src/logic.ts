import { runInAction } from 'mobx';
import { CharacterClassNumber, ENUM_WORLD } from './common';
import { deserializeAppearance } from './common/deserializeAppearance';
import { ItemsDatabase } from './common/itemsDatabase';
import { ItemSerializer } from './common/itemSerializer';
import { getItemName } from './common/itemInfo';
import {
  playHitSound,
  playMonsterSound,
  playPlayerDeath,
  playPlayerHurt,
  playSkillSound,
  playSound,
} from './libs/gameSounds';
import { InventoryConstants } from './common/inventoryConstants';
import { ItemStorageKind } from './common/itemStorageKind';
import { getSkillInfo } from './common/skills';
import { playSkillEffect } from './effects/skillEffects';
import { getAttackAction } from './ecs/systems/attackSystem';
import { NPC_NAMES } from './common/npcNames';
import { MINI_GAMES, isMiniGameMap, type MiniGameKind } from './common/miniGames';
import {
  LegacyQuestState,
  classAfterQuest,
  classDisplayName,
  legacyQuest,
  questStateIn,
} from './common/legacyQuests';
import { ModelFactoryPerId } from './common/modelFactoryPerId';
import { ModelObject } from './common/modelObject';
import { MonsterObject } from './common/monsterObject';
import {
  getGenericModelFactory,
  getNpcModelInfo,
} from './common/npcModelFactory';
import { MonstersDatabase } from './common/monstersDatabase';
import {
  MonsterActionType,
  PlayerAction,
  ServerPlayerActionType,
} from './common/objects/enum';
import { HelloPacket } from './common/packets/ConnectServerPackets';
import {
  AddCharactersToScopePacket,
  AddNpcsToScopePacket,
  CharacterInformationPacket,
  CharacterInventoryPacket,
  ChatMessagePacket,
  MapChangedPacket,
  RespawnAfterDeathPacket,
  SkillAddedPacket,
  NpcWindowResponsePacket,
  NpcWindowResponseNpcWindowEnum,
  ItemBoughtPacket,
  NpcItemSellResultPacket,
  VaultMoneyUpdatePacket,
  TradeRequestPacket,
  PlayerShopSetItemPriceResponsePacket,
  OpenNpcDialogPacket,
  DevilSquareEnterResultPacket,
  BloodCastleEnterResultPacket,
  MiniGameOpeningStatePacket,
  UpdateMiniGameStatePacket,
  UpdateMiniGameStateMiniGameTypeStateEnum,
  BloodCastleStatePacket,
  BloodCastleStateStatusEnum,
  ChangeTerrainAttributesPacket,
  LegacyQuestStateListPacket,
  LegacyQuestStateDialogPacket,
  LegacySetQuestStateResponsePacket,
  LegacyQuestRewardPacket,
  LegacyQuestRewardQuestRewardTypeEnum,
  LegacyQuestMonsterKillInfoPacket,
  ObjectMessagePacket,
  MagicEffectStatusPacket,
  PlayerShopSetItemPriceResponseItemPriceSetResultEnum,
  PlayerShopOpenSuccessfulPacket,
  PlayerShopClosedPacket,
  PlayerShopsPacket,
  PlayerShopItemListPacket,
  PlayerShopItemListActionKindEnum,
  PlayerShopBuyResultPacket,
  PlayerShopBuyResultResultKindEnum,
  PlayerShopItemSoldToPlayerPacket,
  ClosePlayerShopDialogPacket,
  HeroStateChangedPacket,
  GuildListPacket,
  GuildJoinRequestPacket,
  GuildJoinResponsePacket,
  GuildJoinResponseGuildJoinRequestResultEnum,
  GuildKickResponsePacket,
  GuildKickResponseGuildKickSuccessEnum,
  GuildCreationResultPacket,
  GuildMemberLeftGuildPacket,
  AssignCharacterToGuildPacket,
  GuildInformationPacket,
  ChatMessageChatMessageTypeEnum,
  MessengerInitializationPacket,
  FriendAddedPacket,
  FriendRequestPacket,
  FriendDeletedPacket,
  FriendOnlineStateUpdatePacket,
  PartyRequestPacket,
  PartyListPacket,
  PartyHealthUpdatePacket,
  RemovePartyMemberPacket,
  TradeRequestAnswerPacket,
  TradeItemAddedPacket,
  TradeItemRemovedPacket,
  TradeMoneyUpdatePacket,
  TradeButtonStateChangedPacket,
  TradeButtonStateChangedTradeButtonStateEnum,
  TradeFinishedPacket,
  TradeFinishedTradeResultEnum,
  SkillAnimationPacket,
  AreaSkillAnimationPacket,
  SkillListUpdatePacket,
  CharacterLevelUpdatePacket,
  CharacterStatIncreaseResponsePacket,
  ExperienceGainedPacket,
  InventoryMoneyUpdatePacket,
  ItemConsumptionFailedPacket,
  ItemCraftingResultPacket,
  ItemCraftingResultCraftingResultEnum,
  InventoryItemUpgradedPacket,
  ItemDurabilityChangedPacket,
  ItemRemovedPacket,
  ItemMovedPacket,
  ItemDropResponsePacket,
  ItemMoveRequestFailedPacket,
  ItemAddedToInventoryPacket,
  ItemPickUpRequestFailedPacket,
  ItemPickUpRequestFailedItemPickUpFailReasonEnum,
  ObjectHitPacket,
  CurrentHealthAndShieldPacket,
  CurrentManaAndAbilityPacket,
  GameServerEnteredPacket,
  ItemDropRemovedPacket,
  ItemsDroppedPacket,
  MapObjectOutOfScopePacket,
  ObjectAnimationPacket,
  ObjectGotKilledPacket,
  ObjectWalkedPacket,
  ServerMessagePacket,
} from './common/packets/ServerToClientPackets';
import { ServerToClientActionMap } from './common/playerActionMapper';
import { PlayerObject } from './common/playerObject';
import { Entity, Item, World } from './ecs/world';
import { createAttributeSystem } from './libs/attributeSystem';
import { Vector3 } from './libs/babylon/exports';
import { EventBus } from './libs/eventBus';
import { Store, TRADE_SIZE, UIState, unpackEmblem } from './store';
import { HERO_STATE_PK_WARNING } from './common/heroState';

const ONE_SHOT_ANIMATION_TIME = 0.6;
const NO_TERRAIN_HEIGHT = -9999;

function convertDirectionToAngle(direction: number): number {
  // Convert the direction (0-7) to an angle in radians
  // 0 = 0 degrees, 1 = 45 degrees, ..., 7 = 315 degrees
  return (direction * Math.PI) / 4 - Math.PI / 4; // Convert to radians
}

export function spawnPlayer(
  world: World,
  { cls }: { cls?: CharacterClassNumber } = {}
) {
  const playerEntity = world.add({
    transform: {
      pos: new Vector3(),
      rot: Vector3.Zero(),
      scale: 1,
      posOffset: new Vector3(0.5, 0, 0.5),
    },
    modelFactory: PlayerObject,
    pathfinding: {
      from: { x: 0, y: 0 },
      to: { x: 0, y: 0 },
      path: [],
      calculated: true,
    },
    playerMoveTo: {
      point: { x: 0, y: 0 },
      handled: true as boolean,
    },
    movement: {
      velocity: { x: 0, y: 0 },
    },
    playerAnimation: {
      action: PlayerAction.PLAYER_SET,
    },
    attributeSystem: createAttributeSystem(),
    visibility: {
      state: 'hidden',
      lastChecked: 0,
    },
    screenPosition: {
      worldOffsetZ: 2.5,
      x: 0,
      y: 0,
    },
    objectNameInWorld: 'Player',
    charAppearance: {
      helm: null,
      armor: null,
      gloves: null,
      pants: null,
      boots: null,
      leftHand: null,
      rightHand: null,
      wings: null,
      charClass: cls ?? CharacterClassNumber.DarkKnight,
      changed: true,
    } satisfies NonNullable<Entity['charAppearance']> as NonNullable<
      Entity['charAppearance']
    >,
  });
  playerEntity.transform.pos.z = 1.7;

  playerEntity.attributeSystem.setValue('isFemale', 0);
  playerEntity.attributeSystem.setValue('isFlying', 0);
  playerEntity.attributeSystem.setValue('currentHealth', 0);
  playerEntity.attributeSystem.setValue('currentMana', 0);
  playerEntity.attributeSystem.setValue('maxHealth', 1);
  playerEntity.attributeSystem.setValue('maxMana', 1);
  playerEntity.attributeSystem.setValue('totalMovementSpeed', 3);
  playerEntity.attributeSystem.setValue(
    'playerNetClass',
    cls ?? CharacterClassNumber.DarkKnight
  );

  return playerEntity;
}

let serverListRequested = false;
EventBus.on('Hello', packet => {
  const p = new HelloPacket(packet);
  if (serverListRequested) return;
  serverListRequested = true;
  Store.updateServerListRequest();
});

EventBus.on('GameServerEntered', bytes => {
  const p = new GameServerEnteredPacket(bytes);

  const id = p.PlayerId & 0x7fff;
  Store.playerId = id;
  console.log(`PlayerID: ${Store.playerId}`);

  Store.uiState = UIState.Login;
});

EventBus.on('CharacterInformation', packet => {
  const p = new CharacterInformationPacket(packet);

  const playerData = Store.playerData;

  runInAction(() => {
    // a new character: its effects come again with MagicEffectStatus
    Store.activeEffects = [];
    playerData.money = p.Money;
    playerData.x = p.X;
    playerData.y = p.Y;

    playerData.exp = Number(p.CurrentExperience);
    playerData.expToNextLvl = Number(p.ExperienceForNextLevel);
    playerData.points = p.LevelUpPoints;

    playerData.str = p.Strength;
    playerData.agi = p.Agility;
    playerData.sta = p.Vitality;
    playerData.eng = p.Energy;

    playerData.currentHP = p.CurrentHealth;
    playerData.maxHP = p.MaximumHealth;

    playerData.currentMP = p.CurrentMana;
    playerData.maxMP = p.MaximumMana;

    playerData.currentSD = p.CurrentShield;
    playerData.maxSD = p.MaximumShield;

    playerData.currentAG = p.CurrentAbility;
    playerData.maxAG = p.MaximumAbility;

    Store.uiState = UIState.World;

    EventBus.emit('requestWarp', { map: p.MapId, pos: { x: p.X, y: p.Y } });
  });
});

// EventBus.on('ServerMessage', packet => {
//   const p = new ServerMessagePacket(packet);
//   console.log(p);
// });

// EventBus.on('WeatherStatusUpdate', packet => {
//   const p = new WeatherStatusUpdatePacket(packet);
//   console.log(p);
// });
// EventBus.on('MessengerInitialization', packet => {
//   const p = new MessengerInitializationPacket(packet);
//   console.log(`MessengerInitialization, friends: ${p.FriendCount} letters: ${p.LetterCount}/${p.MaximumLetterCount}`);
// });

EventBus.on('CharacterInventory', packet => {
  const items = Store.playerData.items;
  const p = new CharacterInventoryPacket(packet);

  // it's the whole inventory (also sent again after a trade): empty slots
  // are not in the list
  items.fill(null as any);

  p.getItems(p.ItemCount).forEach(item => {
    const itemSlot = item.ItemSlot;
    const data = item.ItemData;

    const itemData = ItemSerializer.DeserializeItem(
      new Uint8Array(data.buffer)
    );

    items[itemSlot] = itemData;
  });

  Store.syncPlayerAppearance();
});

EventBus.on('CurrentHealthAndShield', packet => {
  const p = new CurrentHealthAndShieldPacket(packet);

  const playerEntity = Store.world?.playerEntity;
  if (!playerEntity) return;
  playerEntity.attributeSystem.setValue('currentHealth', p.Health);
  Store.playerData.currentHP = Math.floor(p.Health);
  Store.playerData.currentSD = Math.floor(p.Shield);
});

EventBus.on('CurrentManaAndAbility', packet => {
  const p = new CurrentManaAndAbilityPacket(packet);

  const playerEntity = Store.world?.playerEntity;
  if (!playerEntity) return;

  playerEntity.attributeSystem.setValue('currentMana', p.Mana);
  Store.playerData.currentMP = Math.floor(p.Mana);
  Store.playerData.currentAG = Math.floor(p.Ability);
});

// Objects that arrive before the terrain is loaded get the "no terrain"
// height (-9999) and end up far below the map: put them on the ground.
EventBus.on('warpCompleted', () => {
  const world = Store.world;
  if (!world) return;

  for (const { transform } of world.netObjsQuery) {
    if (transform.pos.y > NO_TERRAIN_HEIGHT) continue;
    transform.pos.y = world.getTerrainHeight(transform.pos.x, transform.pos.z);
  }
});

EventBus.on('AddNpcsToScope', packet => {
  const p = new AddNpcsToScopePacket(packet);
  const npcs = p.getNPCs();
  console.log(p, npcs);

  const world = Store.world;
  if (!world) return;

  const worldIndex = world.mapIndex;

  npcs.forEach(npc => {
    const id = npc.Id & 0x7fff;
    const definedModelFactory =
      ModelFactoryPerId[npc.TypeNumber] ??
      getGenericModelFactory(npc.TypeNumber);
    if (!definedModelFactory) {
      console.warn(
        `No model factory found for NPC type ${npc.TypeNumber}. Using default PlayerObject.`
      );
    }

    const modelFactory = definedModelFactory || PlayerObject;

    const npcEntity = world.add({
      netId: id,
      worldIndex,
      npcType: npc.TypeNumber,
      transform: {
        pos: new Vector3(
          npc.CurrentPositionX,
          world.getTerrainHeight(npc.CurrentPositionX, npc.CurrentPositionY),
          npc.CurrentPositionY
        ),
        rot: new Vector3(0, convertDirectionToAngle(npc.Rotation), 0),
        scale: modelFactory.OverrideScale >= 0 ? modelFactory.OverrideScale : 1,
      },
      modelFactory,
      pathfinding: {
        from: { x: 0, y: 0 },
        to: { x: 0, y: 0 },
        path: [],
        calculated: true,
      },
      playerMoveTo: {
        point: { x: 0, y: 0 },
        handled: true as boolean,
      },
      movement: {
        velocity: { x: 0, y: 0 },
      },
      monsterAnimation: {
        action: MonsterActionType.Stop1,
      },
      attributeSystem: createAttributeSystem(),
      visibility: {
        lastChecked: 0,
        state: 'hidden',
      },
      screenPosition: {
        worldOffsetZ: 2.5,
        x: 0,
        y: 0,
      },
      objectNameInWorld:
        MonstersDatabase.get(npc.TypeNumber)?.Name ||
        getNpcModelInfo(npc.TypeNumber)?.name ||
        NPC_NAMES[npc.TypeNumber] ||
        'NPC',
      interactable: true,
    });

    if (modelFactory.prototype instanceof MonsterObject) {
      world.addComponent(npcEntity, 'monster', true);
    }

    npcEntity.attributeSystem.setValue('isFemale', 0);
    npcEntity.attributeSystem.setValue('isFlying', 0);
  });
});

EventBus.on('AddCharactersToScope', packet => {
  const p = new AddCharactersToScopePacket(packet);
  const chars = p.getCharacters();
  console.log(p, chars);

  const world = Store.world;
  if (!world) return;

  const worldIndex = world.mapIndex;

  chars.forEach(char => {
    const maskedId = char.Id & 0x7fff;

    // active effects of the player (auras)
    Store.playerEffects.set(maskedId, new Set(char.Effects.map(e => e.Id)));

    // after a map change the server sends the local player again: keep the
    // same entity (spawning it again duplicated the player)
    const existing = world.playerEntity;
    if (existing && Store.playerId === maskedId) {
      existing.worldIndex = worldIndex;
      setHeroState(maskedId, char.HeroState);
      existing.transform.pos.x = char.CurrentPositionX;
      existing.transform.pos.z = char.CurrentPositionY;
      existing.transform.pos.y = world.getTerrainHeight(
        char.CurrentPositionX,
        char.CurrentPositionY
      );
      return;
    }

    const appearance = deserializeAppearance(char.Appearance);
    const playerEntity = spawnPlayer(world, { cls: appearance.cls });
    world.addComponent(playerEntity, 'netId', maskedId);
    world.addComponent(playerEntity, 'worldIndex', worldIndex);
    playerEntity.transform.pos.x = char.CurrentPositionX;
    playerEntity.transform.pos.z = char.CurrentPositionY;
    playerEntity.transform.pos.y = world.getTerrainHeight(
      char.CurrentPositionX,
      char.CurrentPositionY
    );

    playerEntity.transform.rot.y = convertDirectionToAngle(char.Rotation);

    playerEntity.objectNameInWorld = char.Name;
    setHeroState(maskedId, char.HeroState);

    if (Store.playerId === maskedId) {
      world.addComponent(playerEntity, 'localPlayer', true);
      console.log(`Local player spawned: ${maskedId} - ${char.Name}`);
    }

    const cApp = playerEntity.charAppearance;

    cApp.leftHand = appearance.leftHand;
    cApp.rightHand = appearance.rightHand;
    cApp.helm = appearance.helm;
    cApp.armor = appearance.armor;
    cApp.pants = appearance.pants;
    cApp.gloves = appearance.gloves;
    cApp.boots = appearance.boots;

    Object.values(cApp).forEach(item => {
      if (typeof item !== 'object' || item === null) return;

      const itemConfig = ItemsDatabase.getItem(item.group, item.num);
      console.log(`Item: ${itemConfig?.ItemName} (${item.group}, ${item.num})`);
    });

    cApp.changed = true;
  });
});

EventBus.on('MapObjectOutOfScope', packet => {
  const p = new MapObjectOutOfScopePacket(packet);
  p.getObjects(p.ObjectCount).forEach(obj => {
    const maskedId = obj.Id & 0x7fff;

    console.log(`Object out of scope: ${maskedId}`);
    const world = Store.world;
    if (!world) return;

    const objEntity = world.netObjsQuery.entities.find(
      e => e.netId === maskedId && !e.objOutOfScope
    );
    if (objEntity) {
      world.addComponent(objEntity, 'objOutOfScope', true);
    }
  });
});

EventBus.on('ObjectWalked', packet => {
  const p = new ObjectWalkedPacket(packet);

  const world = Store.world;
  if (!world) return;

  const maskedId = p.ObjectId & 0x7fff;

  const obj = world.netObjsQuery.entities.find(e => e.netId === maskedId);
  if (!obj) return;

  if (obj.localPlayer) return;

  if (obj.playerMoveTo) {
    obj.playerMoveTo.handled = false;
    obj.playerMoveTo.point.x = p.TargetX;
    obj.playerMoveTo.point.y = p.TargetY;
  } else {
    obj.transform.pos.x = p.TargetX;
    obj.transform.pos.z = p.TargetY;
  }

  obj.transform.rot.y = convertDirectionToAngle(p.TargetRotation);

  const dirs = new Array(p.StepCount).fill(0);
  for (let i = 0; i < p.StepCount; i++) {
    dirs[i] = p.StepData.getUint8(i);
  }

  // C1 09 D4 02 04 B1 7E 60 00

  console.log(
    `ObjectWalked: ${maskedId}, steps: ${p.StepCount}, directions: ${dirs.join(
      '->'
    )}, x: ${p.TargetX}, y: ${p.TargetY}, rotation: ${p.TargetRotation}`,
    packet
  );
});

EventBus.on('ChatMessage', packet => {
  const p = new ChatMessagePacket(packet);
  console.log(
    `ChatMessage: ${p.Type}, sender:${p.Sender}, msg: ${p.Message}`,
    p
  );
  const whisper = p.Type === ChatMessageChatMessageTypeEnum.Whisper;
  if (whisper) {
    Store.lastWhisperFrom = p.Sender;
    playSound('Sound/iWhisper');
  }

  // guild and party messages come as normal ones with their prefix
  const prefix = p.Message[0];
  const channel = prefix === '@' ? 'guild' : prefix === '~' ? 'party' : undefined;
  const text = channel ? p.Message.slice(1) : p.Message;
  Store.addChatLine({ sender: p.Sender, text, whisper, channel });
});

const MONSTER_ATTACKS: number[] = [
  MonsterActionType.Attack1,
  MonsterActionType.Attack2,
  MonsterActionType.Attack3,
  MonsterActionType.Attack4,
];

EventBus.on('ObjectAnimation', packet => {
  const p = new ObjectAnimationPacket(packet);

  const maskedId = p.ObjectId & 0x7fff;
  const obj = Store.world?.netObjsQuery.entities.find(
    e => e.netId === maskedId
  );

  if (!obj) return;

  let serverActionId = p.Animation as ServerPlayerActionType;
  let clientActionToPlay = serverActionId;
  if (obj.monsterAnimation) {
    clientActionToPlay = ((serverActionId & 0xe0) >> 5) & 0xff;
  }

  console.log(
    `ObjectAnimation: ${maskedId}, action: ${clientActionToPlay}, target: ${p.TargetId}, dir:${p.Direction}`,
    packet
  );

  if (obj.monsterAnimation) {
    obj.monsterAnimation.action = clientActionToPlay as any;
    obj.monsterAnimation.oneShotTime = ONE_SHOT_ANIMATION_TIME;
    if (MONSTER_ATTACKS.includes(clientActionToPlay)) {
      playMonsterSound(obj, 'attack');
    }
  } else if (obj.playerAnimation) {
    // attacks of other players: the animation of their weapon
    const isAttack =
      clientActionToPlay === ServerPlayerActionType.Attack1 ||
      clientActionToPlay === ServerPlayerActionType.Attack2;
    const action = isAttack
      ? getAttackAction(obj)
      : ServerToClientActionMap[clientActionToPlay];
    if (action !== undefined) {
      obj.playerAnimation.action = action;
      obj.playerAnimation.oneShotTime = ONE_SHOT_ANIMATION_TIME;
    }
    if (isAttack && !obj.localPlayer) playSound('Sound/eSwingWeapon1', { at: { x: obj.transform.pos.x, y: obj.transform.pos.z } });
  }

  obj.transform.rot.y = convertDirectionToAngle(p.Direction);
});

function stopLocalPlayer(player: Entity) {
  const world = Store.world;
  if (world) world.attackTarget = null;

  if (player.pathfinding) player.pathfinding.path = [];
  if (player.playerMoveTo) {
    player.playerMoveTo.handled = true;
    player.playerMoveTo.sendToServer = false;
  }
}

// The server moved the local player (respawn, warp gate, /move).
function moveLocalPlayer(map: number, x: number, y: number) {
  const world = Store.world;
  const player = world?.playerEntity;
  if (!world || !player) return;

  stopLocalPlayer(player);
  if (player.dead) {
    world.removeComponent(player, 'dead');
    player.playerAnimation.action = PlayerAction.PLAYER_STOP_MALE;
  }

  if (map !== world.mapIndex) {
    const onLoaded = () => {
      EventBus.off('warpCompleted', onLoaded);
      Store.sendClientReadyAfterMapChange();
    };
    EventBus.on('warpCompleted', onLoaded);
  }

  EventBus.emit('requestWarp', { map, pos: { x, y } });
}

EventBus.on('MapChanged', packet => {
  const p = new MapChangedPacket(packet);
  console.log(
    `MapChanged: map ${p.MapNumber} (${p.PositionX}, ${p.PositionY}), change: ${p.IsMapChange}`
  );
  moveLocalPlayer(p.MapNumber, p.PositionX, p.PositionY);

  // OpenMU doesn't send the enter result when it works: it warps the player
  // into the game
  const pending = Store.pendingMiniGame;
  if (pending && isMiniGameMap(p.MapNumber)) {
    Store.pendingMiniGame = null;
    runInAction(() => {
      Store.miniGameEntry = null;
      Store.miniGameOpening = null;
      Store.miniGameScore = null;
      Store.miniGame = { kind: pending.kind, level: pending.level };
    });
    Store.talkingToNpc = null;
  }

  // left Devil Square / Blood Castle (the score window stays)
  if (Store.miniGame && !isMiniGameMap(p.MapNumber)) {
    runInAction(() => {
      Store.miniGame = null;
    });
  }
});

EventBus.on('RespawnAfterDeath', packet => {
  const p = new RespawnAfterDeathPacket(packet);
  console.log(
    `RespawnAfterDeath: map ${p.MapNumber} (${p.PositionX}, ${p.PositionY})`
  );

  runInAction(() => {
    const d = Store.playerData;
    d.currentHP = p.CurrentHealth;
    d.currentMP = p.CurrentMana;
    d.currentSD = p.CurrentShield;
    d.currentAG = p.CurrentAbility;
    d.money = p.Money;
  });
  Store.world?.playerEntity?.attributeSystem.setValue(
    'currentHealth',
    p.CurrentHealth
  );

  moveLocalPlayer(p.MapNumber, p.PositionX, p.PositionY);
});

EventBus.on('ObjectGotKilled', packet => {
  const p = new ObjectGotKilledPacket(packet);

  const killedId = p.KilledId & 0x7fff;
  const obj = Store.world?.netObjsQuery.entities.find(
    e => e.netId === killedId
  );

  if (!obj) return;

  if (!obj.dead) Store.world?.addComponent(obj, 'dead', true);

  if (obj.localPlayer && obj.playerAnimation) {
    // the server respawns the player with MapChanged a few seconds later
    obj.playerAnimation.action = PlayerAction.PLAYER_DIE1;
    stopLocalPlayer(obj);
    playPlayerDeath(obj);
    Store.addNotification('You died', 'error');
  } else if (obj.monsterAnimation) {
    obj.monsterAnimation.action = MonsterActionType.Die;
    obj.monsterAnimation.oneShotTime = 0;
    obj.monsterAnimation.deathTime = 0;
    playMonsterSound(obj, 'death');
  } else if (obj.playerAnimation) {
    obj.playerAnimation.action = PlayerAction.PLAYER_DIE1;
    playPlayerDeath(obj);
  }
});

EventBus.on('ItemsDropped', packet => {
  const world = Store.world;

  if (!world) return;

  const p = new ItemsDroppedPacket(packet);
  console.log(`ItemsDropped: ${p.ItemCount} items dropped`, p);

  p.getItems(p.ItemCount).forEach(item => {
    const maskedId = item.Id & 0x7fff;
    console.log(item);
    const data = item.ItemData;

    const {
      num: id,
      group,
      lvl,
    } = ItemSerializer.DeserializeItem(
      new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
    );

    const isMoney = data.byteLength >= 6 && id === 15 && group === 14; // Money is ItemGroup 14, ItemId 15

    const itemConfig = ItemsDatabase.getItem(group, id);

    console.log(itemConfig);

    const amount = isMoney
      ? (data.getUint8(1) << 16) | (data.getUint8(2) << 8) | data.getUint8(4)
      : 0;

    let name = `Item ${group}/${id}`;
    if (isMoney) {
      name = `${amount} Zen`;
    } else if (itemConfig) {
      name = itemConfig.ItemName + (lvl ? ` +${lvl}` : '');
    }

    let dropObj;

    if (isMoney) {
      // const amount = data.byteLength >= 5 ? data.getUint8(4) : 0;

      // dropObj = new MoneyScopeObject(maskedId, rawId, x, y, amount);
      // _scopeManager.AddOrUpdateMoneyInScope(maskedId, rawId, x, y, amount);
      console.log(`Dropped Money: Amount=${amount}, ID=${maskedId}`);

      // Schedule on main thread for visual update and sound
      // MuGame.ScheduleOnMainThread(async () =>
      // {
      //     if (MuGame.Instance.ActiveScene?.World is not WalkableWorldControl w) return;
      //     // Remove existing visual object if it's already there (e.g., from a previous packet re-send)
      //     var existing = w.Objects.OfType<DroppedItemObject>().FirstOrDefault(d => d.NetworkId == maskedId);
      //     if (existing != null)
      //     {
      //         w.Objects.Remove(existing);
      //         existing.Dispose();
      //     }
      //     // Create and add the new visual object
      //     var obj = new DroppedItemObject(dropObj, _characterState.Id, _networkManager.GetCharacterService(), _loggerFactory.CreateLogger<DroppedItemObject>());
      //     w.Objects.Add(obj); // Add the object to the world's objects collection
      //     await obj.Load(); // Ensure its assets are loaded

      //     SoundController.Instance.PlayBufferWithAttenuation("Sound/pDropMoney.wav", obj.Position, w.Walker.Position); // Play money drop sound
      //     // Initial visibility check (hide if too far or out of view initially)
      //     obj.Hidden = !w.IsObjectInView(obj);
      //     _logger.LogDebug($"Spawned dropped money ({obj.DisplayName}) at {obj.Position.X},{obj.Position.Y},{obj.Position.Z}. RawId: {obj.RawId:X4}, MaskedId: {obj.NetworkId:X4}");
      // });
    } else {
      // dropObj = new ItemScopeObject(maskedId, rawId, x, y, data.ToArray());
      // _scopeManager.AddOrUpdateItemInScope(maskedId, rawId, x, y, data.ToArray());
      console.log(`Dropped Item: DataLen=${data.byteLength}, ID=${maskedId}`);

      // Schedule on main thread for visual update and sound
      // MuGame.ScheduleOnMainThread(async () =>
      // {
      //     if (MuGame.Instance.ActiveScene?.World is not WalkableWorldControl w) return;
      //     // Remove existing visual object if it's already there
      //     var existing = w.Objects.OfType<DroppedItemObject>().FirstOrDefault(d => d.NetworkId == maskedId);
      //     if (existing != null)
      //     {
      //         w.Objects.Remove(existing);
      //         existing.Dispose();
      //     }

      //     // Play drop sound based on item type (Jewel vs. Generic)
      //     byte[] dataCopy = item.ItemData.ToArray(); // Create a defensive copy
      //     string itemName = ItemDatabase.GetItemName(dataCopy) ?? string.Empty;

      //     var obj = new DroppedItemObject(dropObj, _characterState.Id, _networkManager.GetCharacterService(), _loggerFactory.CreateLogger<DroppedItemObject>());
      //     w.Objects.Add(obj); // Add the object to the world's objects collection
      //     await obj.Load(); // Ensure its assets are loaded

      //     if (itemName.StartsWith("Jewel", StringComparison.OrdinalIgnoreCase))
      //     {
      //         SoundController.Instance.PlayBufferWithAttenuation("Sound/pGem.wav", obj.Position, w.Walker.Position); // Play jewel drop sound
      //     }
      //     else
      //     {
      //         SoundController.Instance.PlayBufferWithAttenuation("Sound/pDropItem.wav", obj.Position, w.Walker.Position); // Play generic item drop sound
      //     }
      //     // Initial visibility check
      //     obj.Hidden = !w.IsObjectInView(obj);
      //     _logger.LogDebug($"Spawned dropped item ({obj.DisplayName}) at {obj.Position.X},{obj.Position.Y},{obj.Position.Z}. RawId: {obj.RawId:X4}, MaskedId: {obj.NetworkId:X4}");
      // });
    }

    world.add({
      netId: maskedId,
      transform: {
        pos: new Vector3(
          item.PositionX,
          world.getTerrainHeight(item.PositionX, item.PositionY) + 0.1,
          item.PositionY
        ),
        rot: Vector3.Zero(),
        scale: 1,
      },
      worldIndex: world.mapIndex,
      modelFactory: ModelObject,
      modelFilePath: itemConfig
        ? itemConfig.szModelFolder + itemConfig.szModelName
        : undefined,
      visibility: {
        state: 'hidden',
        lastChecked: 0,
      },
      screenPosition: {
        worldOffsetZ: 0.5,
        x: 0,
        y: 0,
      },
      objectNameInWorld: name,
      interactable: true,
      droppedItem: { isMoney },
    });
  });
});

EventBus.on('ItemDropRemoved', packet => {
  const world = Store.world;
  if (!world) return;

  const p = new ItemDropRemovedPacket(packet);
  p.getItemData(p.ItemCount).forEach(item => {
    const maskedId = item.Id & 0x7fff;
    const itemEntity = world.netObjsQuery.entities.find(
      e => e.netId === maskedId
    );
    if (itemEntity) {
      world.addComponent(itemEntity, 'objOutOfScope', true);
      console.log(`Removed item entity with netId: ${maskedId}`);
    } else {
      console.warn(`Item entity with netId ${maskedId} not found.`);
    }
  });
});

EventBus.on('ServerMessage', packet => {
  const p = new ServerMessagePacket(packet);
  console.log(p);

  let color = '#fff';

  switch (p.Type) {
    case 0: // golden center text
      color = '#ffd700';
      break;
    case 1: //blue normal text
      color = '#0000ff';
      break;
    case 2: //guild notice
      color = '#00ff00';
      break;
  }

  Store.addChatLine({ sender: '', text: p.Message, system: true });

  // OpenMU answers like this for the NPCs it has no dialog for
  const npcId = Store.talkingToNpc;
  if (npcId !== null && /not implemented/i.test(p.Message)) {
    Store.showNpcDialog({
      npcId,
      name: Store.npcName(npcId),
      text: 'This NPC has nothing to say yet.',
    });
  }

  console.log(
    `%cServerMessage: ${p.Message}`,
    `color: ${color}; font-weight: bold; font-size: 1em;`
  ); // print message with color
});

EventBus.on('ObjectHit', packet => {
  const p = new ObjectHitPacket(packet);

  const maskedId = p.ObjectId & 0x7fff;
  const obj = Store.world?.netObjsQuery.entities.find(
    e => e.netId === maskedId
  );
  if (!obj) return;

  const damage = p.HealthDamage + p.ShieldDamage;
  console.log(`ObjectHit: ${maskedId}, damage: ${damage}`);
  EventBus.emit('damageShown', {
    entity: obj,
    damage,
    isLocalPlayer: !!obj.localPlayer,
  });

  if (obj.monsterAnimation && !obj.dead && damage > 0) {
    obj.monsterAnimation.action = MonsterActionType.Shock;
    obj.monsterAnimation.oneShotTime = ONE_SHOT_ANIMATION_TIME;
  }

  if (damage > 0) {
    playHitSound(obj);
    if (obj.monsterAnimation) playMonsterSound(obj, 'damage');
    else if (obj.playerAnimation) playPlayerHurt(obj);
  }
});

EventBus.on('ExperienceGained', packet => {
  const p = new ExperienceGainedPacket(packet);

  runInAction(() => {
    Store.playerData.exp += p.AddedExperience;
  });
  console.log(`Experience gained: ${p.AddedExperience}`);
});

// Total experience required to reach `level` (classic MU formula, levels <= 255).
function experienceForLevel(level: number) {
  return 10 * (level + 8) * (level - 1) ** 2;
}

EventBus.on('CharacterLevelUpdate', packet => {
  const p = new CharacterLevelUpdatePacket(packet);
  playSound('Sound/pLevelUp');

  runInAction(() => {
    const playerData = Store.playerData;
    playerData.level = p.Level;
    playerData.points = p.LevelUpPoints;
    playerData.maxHP = p.MaximumHealth;
    playerData.maxMP = p.MaximumMana;
    playerData.maxSD = p.MaximumShield;
    playerData.maxAG = p.MaximumAbility;
    playerData.expToNextLvl = experienceForLevel(p.Level + 1);
  });
  console.log(`Level up: ${p.Level}`);
});

EventBus.on('ItemAddedToInventory', packet => {
  const p = new ItemAddedToInventoryPacket(packet);
  const slot = p.InventorySlot;
  const item = ItemSerializer.DeserializeItem(new Uint8Array(p.ItemData.buffer));
  playSound('Sound/pGetItem');

  runInAction(() => {
    Store.playerData.items[slot] = item;
  });

  if (slot <= InventoryConstants.LastEquippableItemSlotIndex) {
    Store.syncPlayerAppearance();
  }

  const name = ItemsDatabase.getItem(item.group, item.num)?.ItemName ?? 'item';
  Store.addNotification(`Obtained ${name}${item.lvl ? ` +${item.lvl}` : ''}`);
  console.log(`ItemAddedToInventory: slot ${slot}`, item);
});

EventBus.on('ItemPickUpRequestFailed', packet => {
  const p = new ItemPickUpRequestFailedPacket(packet);
  console.log(`ItemPickUpRequestFailed: ${p.FailReason}`);

  if (
    p.FailReason ===
    ItemPickUpRequestFailedItemPickUpFailReasonEnum.__MaximumInventoryMoneyReached
  ) {
    Store.addNotification('Maximum money reached', 'error');
  } else if (
    p.FailReason === ItemPickUpRequestFailedItemPickUpFailReasonEnum.General
  ) {
    Store.addNotification('Cannot pick up the item', 'error');
  }
});

EventBus.on('InventoryMoneyUpdate', packet => {
  const p = new InventoryMoneyUpdatePacket(packet);
  const diff = p.Money - Store.playerData.money;

  runInAction(() => {
    Store.playerData.money = p.Money;
  });

  if (diff > 0) Store.addNotification(`Obtained ${diff} Zen`);
  console.log(`InventoryMoneyUpdate: ${p.Money}`);
});

EventBus.on('ItemDurabilityChanged', packet => {
  const p = new ItemDurabilityChangedPacket(packet);
  const items = Store.playerData.items;
  const item = items[p.InventorySlot];
  if (!item) return;

  runInAction(() => {
    // raw is sent back when moving the item: keep its durability byte
    const raw = item.raw ? [...item.raw] : undefined;
    if (raw) raw[2] = p.Durability;
    items[p.InventorySlot] = { ...item, durability: p.Durability, raw };
  });
});

EventBus.on('ItemRemoved', packet => {
  const p = new ItemRemovedPacket(packet);

  runInAction(() => {
    Store.playerData.items[p.InventorySlot] = null as any;
  });

  if (p.InventorySlot <= InventoryConstants.LastEquippableItemSlotIndex) {
    Store.syncPlayerAppearance();
  }
});

EventBus.on('ItemConsumptionFailed', () => {
  const upgrade = Store.pendingUpgrade;
  Store.pendingUpgrade = null;
  Store.addNotification(
    upgrade
      ? `The ${upgrade.jewel} can't be used on this item`
      : 'Cannot use the item',
    'error'
  );
});

// an item changed by a jewel (the jewel is removed with ItemRemoved or
// ItemDurabilityChanged): tell if it worked
EventBus.on('InventoryItemUpgraded', packet => {
  const p = new InventoryItemUpgradedPacket(packet);
  const bytes = new Uint8Array(packet.buffer, packet.byteOffset, packet.byteLength);
  const item = ItemSerializer.DeserializeItem(bytes.slice(5, 5 + 12));
  console.log(`InventoryItemUpgraded: slot ${p.InventorySlot}`, item);

  const upgrade = Store.pendingUpgrade;
  Store.pendingUpgrade = null;
  runInAction(() => {
    Store.playerData.items[p.InventorySlot] = item;
  });
  if (!upgrade || upgrade.slot !== p.InventorySlot) return;

  const name = getItemName(item);
  const before = upgrade.before;
  const better =
    (item.lvl ?? 0) > (before.lvl ?? 0) ||
    (item.optionLevel ?? 0) > (before.optionLevel ?? 0);
  const worse =
    (item.lvl ?? 0) < (before.lvl ?? 0) ||
    (item.optionLevel ?? 0) < (before.optionLevel ?? 0);

  if (better) playSound('Sound/eGem');
  if (better) Store.addNotification(`${upgrade.jewel}: success, ${name}`);
  else if (worse) Store.addNotification(`${upgrade.jewel} failed: ${name}`, 'error');
  else Store.addNotification(`${upgrade.jewel} failed`, 'error');
});

EventBus.on('CharacterStatIncreaseResponse', packet => {
  const p = new CharacterStatIncreaseResponsePacket(packet);
  console.log(`CharacterStatIncreaseResponse: ${p.Success}, stat ${p.Attribute}`);
  if (!p.Success) return;

  runInAction(() => {
    const d = Store.playerData;
    d.points = Math.max(0, d.points - 1);
    d.maxSD = p.UpdatedMaximumShield;
    d.maxAG = p.UpdatedMaximumAbility;

    switch (p.Attribute) {
      case 0:
        d.str++;
        break;
      case 1:
        d.agi++;
        break;
      case 2:
        d.sta++;
        d.maxHP = p.UpdatedDependentMaximumStat;
        break;
      case 3:
        d.eng++;
        d.maxMP = p.UpdatedDependentMaximumStat;
        break;
    }
  });
});

EventBus.on('ItemMoved', packet => {
  const p = new ItemMovedPacket(packet);
  const move = Store.pendingItemMove;
  Store.pendingItemMove = null;
  console.log(`ItemMoved: to slot ${p.TargetSlot}`, move);
  if (!move) return;

  const item = ItemSerializer.DeserializeItem(new Uint8Array(p.ItemData.buffer));
  // TargetStorageType: an ItemStorageKind (inventory, trade, vault...)
  const targetStorage = p.TargetStorageType as ItemStorageKind;
  runInAction(() => {
    Store.itemsOf(move.fromStorage)[move.from] = null;
    Store.itemsOf(targetStorage)[p.TargetSlot] = item;
    // the price of the personal store stays with its slot
    if (move.fromStorage === ItemStorageKind.PlayerShop) {
      Store.shopPrices.delete(move.from);
    }
  });

  const last = InventoryConstants.LastEquippableItemSlotIndex;
  const touchesEquipment =
    (move.fromStorage === ItemStorageKind.Inventory && move.from <= last) ||
    (targetStorage === ItemStorageKind.Inventory && p.TargetSlot <= last);
  if (touchesEquipment) Store.syncPlayerAppearance();
});

EventBus.on('ItemMoveRequestFailed', () => {
  Store.pendingItemMove = null;
  Store.addNotification('Cannot move the item there', 'error');
});

EventBus.on('ItemDropResponse', packet => {
  const p = new ItemDropResponsePacket(packet);
  console.log(`ItemDropResponse: ${p.Success}, slot ${p.InventorySlot}`);

  if (!p.Success) {
    Store.addNotification('Cannot drop the item here', 'error');
    return;
  }
  playSound('Sound/pDropItem');

  runInAction(() => {
    Store.playerData.items[p.InventorySlot] = null as any;
  });

  if (p.InventorySlot <= InventoryConstants.LastEquippableItemSlotIndex) {
    Store.syncPlayerAppearance();
  }
});

EventBus.on('SkillListUpdate', packet => {
  const p = new SkillListUpdatePacket(packet);
  const skills = p.getSkills(p.Count).map(s => ({
    index: s.SkillIndex,
    number: s.SkillNumber,
    level: s.SkillLevel,
  }));
  console.log('SkillListUpdate', skills);

  runInAction(() => {
    Store.skills = skills;
    if (!skills.some(s => s.number === Store.currentSkill)) {
      Store.currentSkill = skills[0]?.number ?? null;
    }
  });
});

// SkillAdded and SkillRemoved share code, sub code and length; the flag
// byte tells them apart.
const SKILL_REMOVED_FLAG = 0xff;

EventBus.on('SkillAdded', packet => {
  const p = new SkillAddedPacket(packet);
  const skill = {
    index: p.SkillIndex,
    number: p.SkillNumber,
    level: p.SkillLevel,
  };
  const removed = p.Flag === SKILL_REMOVED_FLAG;
  console.log(removed ? 'SkillRemoved' : 'SkillAdded', skill);

  runInAction(() => {
    Store.skills = Store.skills.filter(s => s.number !== skill.number);
    if (removed) {
      if (Store.currentSkill === skill.number) Store.currentSkill = null;
      return;
    }

    Store.skills.push(skill);
    Store.currentSkill ??= skill.number;
  });

  if (!removed) {
    Store.addNotification(`Learned ${getSkillInfo(skill.number).name}`);
  }
});

EventBus.on('SkillAnimation', packet => {
  const p = new SkillAnimationPacket(packet);
  const world = Store.world;
  if (!world) return;

  const find = (id: number) =>
    world.netObjsQuery.entities.find(e => e.netId === (id & 0x7fff));
  const caster = find(p.PlayerId);
  const target = find(p.TargetId);
  console.log(`SkillAnimation: skill ${p.SkillId}, ${p.PlayerId} -> ${p.TargetId}`);
  playSkillSound(p.SkillId, caster);

  // the local player already started its animation when casting
  if (caster && !caster.localPlayer) {
    if (caster.playerAnimation) {
      caster.playerAnimation.action = PlayerAction.PLAYER_SKILL_HAND1;
      caster.playerAnimation.oneShotTime = ONE_SHOT_ANIMATION_TIME;
    } else if (caster.monsterAnimation) {
      caster.monsterAnimation.action = MonsterActionType.Attack1;
      caster.monsterAnimation.oneShotTime = ONE_SHOT_ANIMATION_TIME;
    }
  }

  playSkillEffect(world, p.SkillId, caster, target);
});

// NPC shops

// vault of the original client: 8 columns x 15 rows
const VAULT_SIZE = 120;
// chaos machine: 8 columns x 4 rows
const CHAOS_MACHINE_SIZE = 32;

// windows of NPCs that this client doesn't have yet
const UNSUPPORTED_WINDOWS: Partial<Record<NpcWindowResponseNpcWindowEnum, string>> = {
  [NpcWindowResponseNpcWindowEnum.PetTrainer]: 'The pet trainer',
  [NpcWindowResponseNpcWindowEnum.CastleSeniorNPC]: 'The castle',
  [NpcWindowResponseNpcWindowEnum.ElphisRefinery]: 'The refinery',
  [NpcWindowResponseNpcWindowEnum.RefineStoneMaking]: 'Refining stones',
  [NpcWindowResponseNpcWindowEnum.RemoveJohOption]: 'Removing harmony options',
  [NpcWindowResponseNpcWindowEnum.IllusionTemple]: 'Entering Illusion Temple',
  [NpcWindowResponseNpcWindowEnum.ChaosCardCombination]: 'Chaos cards',
  [NpcWindowResponseNpcWindowEnum.CherryBlossomBranchesAssembly]: 'The cherry blossom event',
  [NpcWindowResponseNpcWindowEnum.SeedMaster]: 'Seed crafting',
  [NpcWindowResponseNpcWindowEnum.SeedResearcher]: 'Socket crafting',
  [NpcWindowResponseNpcWindowEnum.StatReInitializer]: 'Resetting stats',
  [NpcWindowResponseNpcWindowEnum.DelgadoLuckyCoinRegistration]: 'Registering lucky coins',
  [NpcWindowResponseNpcWindowEnum.DoorkeeperTitusDuelWatch]: 'Watching duels',
  [NpcWindowResponseNpcWindowEnum.LugardDoppelgangerEntry]: 'Entering Doppelganger',
  [NpcWindowResponseNpcWindowEnum.JerintGaionEvententry]: 'Entering the Imperial Guardian',
  [NpcWindowResponseNpcWindowEnum.JuliaWarpMarketServer]: 'Warping to the market server',
  [NpcWindowResponseNpcWindowEnum.CombineLuckyItem]: 'Combining lucky items',
};

const MERCHANT_WINDOWS = [
  NpcWindowResponseNpcWindowEnum.Merchant,
  NpcWindowResponseNpcWindowEnum.Merchant1,
];

EventBus.on('NpcWindowResponse', packet => {
  const p = new NpcWindowResponsePacket(packet);
  console.log(`NpcWindowResponse: ${NpcWindowResponseNpcWindowEnum[p.Window]}`);

  if (p.Window === NpcWindowResponseNpcWindowEnum.ChaosMachine) {
    runInAction(() => {
      Store.chaosMachine = { items: new Array(CHAOS_MACHINE_SIZE).fill(null) };
      Store.inventoryEnabled = true;
    });
    return;
  }

  // Charon / Messenger of Archangel: entrance of the mini games
  const miniGame: MiniGameKind | null =
    p.Window === NpcWindowResponseNpcWindowEnum.DevilSquare
      ? 'DevilSquare'
      : p.Window === NpcWindowResponseNpcWindowEnum.BloodCastle
        ? 'BloodCastle'
        : null;
  if (miniGame) {
    runInAction(() => {
      Store.miniGameEntry = miniGame;
      Store.miniGameOpening = null;
      Store.inventoryEnabled = true;
    });
    return;
  }

  // Lahap: the dialog stays open on the server (it disconnects players that
  // unpack jewels without it)
  if (p.Window === NpcWindowResponseNpcWindowEnum.Lahap) {
    runInAction(() => {
      Store.lahapOpen = true;
      Store.inventoryEnabled = true;
    });
    return;
  }

  if (p.Window === NpcWindowResponseNpcWindowEnum.VaultStorage) {
    runInAction(() => {
      Store.vault = { items: new Array(VAULT_SIZE).fill(null), money: 0 };
      Store.inventoryEnabled = true;
    });
    return;
  }

  if (!MERCHANT_WINDOWS.includes(p.Window)) {
    const npcId = Store.talkingToNpc ?? 0;
    const feature = UNSUPPORTED_WINDOWS[p.Window] ?? 'This window';
    Store.showNpcDialog({
      npcId,
      name: Store.npcName(npcId),
      text: `${feature} is not available in this client yet.`,
    });
    // the server keeps the dialog open until it is closed
    Store.sendCloseNpcRequest();
    return;
  }

  runInAction(() => {
    Store.npcShop = { npcId: Store.talkingToNpc ?? 0, items: [] };
    Store.inventoryEnabled = true;
  });
});

// Store items: [slot, 12 bytes of item data] after the count at byte 5.
// (the generated getItems() doesn't know the item data size)
const STORE_ITEMS_OFFSET = 6;
const STORE_ITEM_SIZE = 13;

EventBus.on('StoreItemList', packet => {
  const count = packet.getUint8(5);
  const bytes = new Uint8Array(packet.buffer, packet.byteOffset, packet.byteLength);
  const items: { slot: number; item: Item }[] = [];

  for (let i = 0; i < count; i++) {
    const offset = STORE_ITEMS_OFFSET + i * STORE_ITEM_SIZE;
    if (offset + STORE_ITEM_SIZE > bytes.length) break;
    items.push({
      slot: bytes[offset],
      item: ItemSerializer.DeserializeItem(
        bytes.slice(offset + 1, offset + STORE_ITEM_SIZE)
      ),
    });
  }
  console.log(`StoreItemList: ${items.length} items`);

  runInAction(() => {
    // after a mix: the items left in the chaos machine
    if (Store.chaosMachine) {
      const chaosItems = new Array(CHAOS_MACHINE_SIZE).fill(null);
      items.forEach(({ slot, item }) => (chaosItems[slot] = item));
      Store.chaosMachine.items = chaosItems;
      if (Store.heldItemStorage === ItemStorageKind.ChaosMachine) {
        Store.heldItemSlot = null;
      }
    } else if (Store.vault) {
      const vaultItems = new Array(VAULT_SIZE).fill(null);
      items.forEach(({ slot, item }) => (vaultItems[slot] = item));
      Store.vault.items = vaultItems;
    } else if (Store.npcShop) {
      Store.npcShop.items = items;
    }
  });
});

EventBus.on('ItemBought', packet => {
  const p = new ItemBoughtPacket(packet);
  const item = ItemSerializer.DeserializeItem(new Uint8Array(p.ItemData.buffer));
  console.log(`ItemBought: slot ${p.InventorySlot}`, item);

  runInAction(() => {
    Store.playerData.items[p.InventorySlot] = item;
  });
});

EventBus.on('NpcItemBuyFailed', () => {
  Store.addNotification('Cannot buy the item', 'error');
});

EventBus.on('NpcItemSellResult', packet => {
  const p = new NpcItemSellResultPacket(packet);
  const slot = Store.pendingSellSlot;
  Store.pendingSellSlot = null;
  console.log(`NpcItemSellResult: ${p.Success}, money ${p.Money}, slot ${slot}`);

  if (!p.Success) {
    Store.addNotification('Cannot sell the item', 'error');
    return;
  }

  runInAction(() => {
    Store.playerData.money = p.Money;
    if (slot !== null) Store.playerData.items[slot] = null as any;
  });
  if (slot !== null && slot <= InventoryConstants.LastEquippableItemSlotIndex) {
    Store.syncPlayerAppearance();
  }
});


EventBus.on('AreaSkillAnimation', packet => {
  const p = new AreaSkillAnimationPacket(packet);
  const world = Store.world;
  if (!world) return;
  console.log(
    `AreaSkillAnimation: skill ${p.SkillId}, ${p.PlayerId} at (${p.PointX}, ${p.PointY})`
  );

  const caster = world.netObjsQuery.entities.find(
    e => e.netId === (p.PlayerId & 0x7fff)
  );
  playSkillSound(p.SkillId, caster);
  // the local player already started its animation when casting
  if (caster && !caster.localPlayer && caster.playerAnimation) {
    caster.playerAnimation.action = PlayerAction.PLAYER_SKILL_HAND1;
    caster.playerAnimation.oneShotTime = ONE_SHOT_ANIMATION_TIME;
  }

  playSkillEffect(world, p.SkillId, caster, undefined, {
    x: p.PointX,
    y: p.PointY,
  });
});

EventBus.on('VaultMoneyUpdate', packet => {
  const p = new VaultMoneyUpdatePacket(packet);
  console.log(
    `VaultMoneyUpdate: ${p.Success}, vault ${p.VaultMoney}, inventory ${p.InventoryMoney}`
  );
  if (!p.Success) Store.addNotification('Cannot move the money', 'error');

  runInAction(() => {
    if (Store.vault) Store.vault.money = p.VaultMoney;
    Store.playerData.money = p.InventoryMoney;
  });
});

EventBus.on('TradeRequest', packet => {
  const p = new TradeRequestPacket(packet);
  console.log(`TradeRequest from ${p.Name}`);

  runInAction(() => {
    Store.tradeRequestFrom = p.Name;
  });
});

EventBus.on('TradeRequestAnswer', packet => {
  const p = new TradeRequestAnswerPacket(packet);
  console.log(`TradeRequestAnswer: ${p.Accepted} ${p.Name} (${p.TradePartnerLevel})`);

  if (!p.Accepted) {
    runInAction(() => {
      Store.tradeRequestFrom = null;
    });
    Store.closeTrade();
    if (!Store.tradeDeclinedByMe) {
      Store.addNotification('The trade was declined', 'error');
    }
    Store.tradeDeclinedByMe = false;
    return;
  }

  // vault and shop can't be open while trading
  Store.closeNpc();
  runInAction(() => {
    Store.trade = {
      partner: p.Name,
      partnerLevel: p.TradePartnerLevel,
      myItems: new Array(TRADE_SIZE).fill(null),
      partnerItems: new Array(TRADE_SIZE).fill(null),
      myMoney: 0,
      partnerMoney: 0,
      myAccept: false,
      partnerAccept: false,
    };
    Store.inventoryEnabled = true;
  });
});

// The partner changed the offer: release our accept button, so the trade
// is not finished with an offer we didn't see.
function onPartnerOfferChanged() {
  Store.setTradeAccept(false);
  runInAction(() => {
    if (Store.trade) Store.trade.partnerAccept = false;
  });
}

// ToSlot at byte 3, then the 12 bytes of the item
const TRADE_ITEM_OFFSET = 4;
const TRADE_ITEM_SIZE = 12;

EventBus.on('TradeItemAdded', packet => {
  const p = new TradeItemAddedPacket(packet);
  const bytes = new Uint8Array(packet.buffer, packet.byteOffset, packet.byteLength);
  const item = ItemSerializer.DeserializeItem(
    bytes.slice(TRADE_ITEM_OFFSET, TRADE_ITEM_OFFSET + TRADE_ITEM_SIZE)
  );
  console.log(`TradeItemAdded: slot ${p.ToSlot}`, item);

  runInAction(() => {
    if (Store.trade) Store.trade.partnerItems[p.ToSlot] = item;
  });
  onPartnerOfferChanged();
});

EventBus.on('TradeItemRemoved', packet => {
  const p = new TradeItemRemovedPacket(packet);
  console.log(`TradeItemRemoved: slot ${p.Slot}`);

  runInAction(() => {
    if (Store.trade) Store.trade.partnerItems[p.Slot] = null;
  });
  onPartnerOfferChanged();
});

EventBus.on('TradeMoneyUpdate', packet => {
  const p = new TradeMoneyUpdatePacket(packet);
  console.log(`TradeMoneyUpdate: ${p.MoneyAmount}`);

  runInAction(() => {
    if (Store.trade) Store.trade.partnerMoney = p.MoneyAmount;
  });
  onPartnerOfferChanged();
});

EventBus.on('TradeMoneySetResponse', () => {
  console.log(`TradeMoneySetResponse: ${Store.pendingTradeMoney}`);

  runInAction(() => {
    if (Store.trade) Store.trade.myMoney = Store.pendingTradeMoney;
  });
});

EventBus.on('TradeButtonStateChanged', packet => {
  const p = new TradeButtonStateChangedPacket(packet);
  const trade = Store.trade;
  console.log(
    `TradeButtonStateChanged: ${TradeButtonStateChangedTradeButtonStateEnum[p.State]}`
  );
  if (!trade) return;

  runInAction(() => {
    switch (p.State) {
      case TradeButtonStateChangedTradeButtonStateEnum.Red:
        // the money changed: both buttons are released
        trade.myAccept = false;
        trade.partnerAccept = false;
        break;
      case TradeButtonStateChangedTradeButtonStateEnum.Checked:
        // OpenMU sends Checked also when the partner releases the button
        // (TradeButtonAction), so each one toggles the state
        trade.partnerAccept = !trade.partnerAccept;
        break;
      default:
        trade.partnerAccept = false;
    }
  });
});

const TRADE_RESULT_MESSAGES: Record<TradeFinishedTradeResultEnum, string> = {
  [TradeFinishedTradeResultEnum.Cancelled]: 'The trade was cancelled',
  [TradeFinishedTradeResultEnum.Success]: 'Trade completed',
  [TradeFinishedTradeResultEnum.FailedByFullInventory]:
    'The trade failed: the inventory is full',
  [TradeFinishedTradeResultEnum.TimedOut]: 'The trade timed out',
  [TradeFinishedTradeResultEnum.FailedByItemsNotAllowedToTrade]:
    'The trade failed: some items cannot be traded',
};

// the server sends the whole inventory and the money after this
EventBus.on('TradeFinished', packet => {
  const p = new TradeFinishedPacket(packet);
  console.log(`TradeFinished: ${TradeFinishedTradeResultEnum[p.Result]}`);

  Store.closeTrade();
  runInAction(() => {
    Store.tradeRequestFrom = null;
  });
  Store.addNotification(
    TRADE_RESULT_MESSAGES[p.Result] ?? 'The trade was closed',
    p.Result === TradeFinishedTradeResultEnum.Success ? 'info' : 'error'
  );
});

EventBus.on('PartyRequest', packet => {
  const p = new PartyRequestPacket(packet);
  const name = Store.playerNameById(p.RequesterId);
  console.log(`PartyRequest from ${name} (${p.RequesterId})`);

  runInAction(() => {
    Store.partyRequestFrom = { id: p.RequesterId, name };
  });
});

// sent to every member when someone joins or leaves; the first one is the
// leader
EventBus.on('PartyList', packet => {
  const p = new PartyListPacket(packet);
  const members = p.getMembers().map(m => ({
    index: m.Index,
    name: m.Name,
    mapId: m.MapId,
    x: m.PositionX,
    y: m.PositionY,
    health: m.MaximumHealth
      ? Math.floor((m.CurrentHealth / m.MaximumHealth) * 10)
      : 0,
  }));
  console.log(`PartyList: ${members.map(m => m.name).join(', ')}`);

  const joined = !Store.party;
  runInAction(() => {
    Store.party = members;
  });
  if (joined) Store.addNotification('You joined a party');
});

// OpenMU sends it to the member that left or was kicked (and to everyone
// when the party is dissolved); the others get a new PartyList
EventBus.on('RemovePartyMember', packet => {
  const p = new RemovePartyMemberPacket(packet);
  console.log(`RemovePartyMember: ${p.Index}`);
  if (!Store.party) return;

  runInAction(() => {
    Store.party = null;
  });
  Store.addNotification('You are no longer in a party');
});

// health of each member in tenths (0-10)
EventBus.on('PartyHealthUpdate', packet => {
  const p = new PartyHealthUpdatePacket(packet);
  const party = Store.party;
  if (!party) return;

  runInAction(() => {
    for (const { Index, Value } of p.getMembers()) {
      const member = party.find(m => m.index === Index);
      if (member) member.health = Value;
    }
  });
});

const CRAFTING_RESULT_MESSAGES: Partial<
  Record<ItemCraftingResultCraftingResultEnum, string>
> = {
  [ItemCraftingResultCraftingResultEnum.Failed]: 'The combination failed',
  [ItemCraftingResultCraftingResultEnum.Success]: 'The combination succeeded',
  [ItemCraftingResultCraftingResultEnum.NotEnoughMoney]: 'Not enough zen',
  [ItemCraftingResultCraftingResultEnum.TooManyItems]: 'Too many items',
  [ItemCraftingResultCraftingResultEnum.CharacterLevelTooLow]:
    'Your level is too low',
  [ItemCraftingResultCraftingResultEnum.LackingMixItems]:
    'Some items are missing for this combination',
  [ItemCraftingResultCraftingResultEnum.IncorrectMixItems]:
    'These items cannot be combined',
  [ItemCraftingResultCraftingResultEnum.InvalidItemLevel]:
    'The item level is not valid for this combination',
  [ItemCraftingResultCraftingResultEnum.CharacterClassTooLow]:
    'Your class cannot do this combination',
};

// the items left in the chaos machine come after it with StoreItemList
EventBus.on('ItemCraftingResult', packet => {
  const p = new ItemCraftingResultPacket(packet);
  console.log(
    `ItemCraftingResult: ${ItemCraftingResultCraftingResultEnum[p.Result]}`
  );

  if (p.Result === ItemCraftingResultCraftingResultEnum.Success) {
    playSound('Sound/eMix');
  }
  Store.addNotification(
    CRAFTING_RESULT_MESSAGES[p.Result] ?? 'The combination failed',
    p.Result === ItemCraftingResultCraftingResultEnum.Success ? 'info' : 'error'
  );
});

// friend list after entering the game; all offline, FriendOnlineStateUpdate
// tells who is online
EventBus.on('MessengerInitialization', packet => {
  const p = new MessengerInitializationPacket(packet);
  const friends = p.getFriends().map(f => ({ name: f.Name, serverId: f.ServerId }));
  console.log(`MessengerInitialization: ${friends.map(f => f.name).join(', ')}`);

  runInAction(() => {
    Store.friends = friends;
  });
});

function setFriend(name: string, serverId: number) {
  runInAction(() => {
    const friend = Store.friends.find(f => f.name === name);
    if (friend) friend.serverId = serverId;
    else Store.friends.push({ name, serverId });
  });
}

EventBus.on('FriendAdded', packet => {
  const p = new FriendAddedPacket(packet);
  console.log(`FriendAdded: ${p.FriendName} (${p.ServerId})`);
  setFriend(p.FriendName, p.ServerId);
  Store.addNotification(`${p.FriendName} is now your friend`);
});

EventBus.on('FriendOnlineStateUpdate', packet => {
  const p = new FriendOnlineStateUpdatePacket(packet);
  console.log(`FriendOnlineStateUpdate: ${p.FriendName} (${p.ServerId})`);
  setFriend(p.FriendName, p.ServerId);
});

EventBus.on('FriendRequest', packet => {
  const p = new FriendRequestPacket(packet);
  console.log(`FriendRequest from ${p.Requester}`);
  runInAction(() => {
    Store.friendRequestFrom = p.Requester;
  });
});

EventBus.on('FriendDeleted', packet => {
  const p = new FriendDeletedPacket(packet);
  console.log(`FriendDeleted: ${p.FriendName}`);
  runInAction(() => {
    Store.friends = Store.friends.filter(f => f.name !== p.FriendName);
  });
});

// Guild Master NPC: asks if the player wants to create a guild
EventBus.on('ShowGuildMasterDialog', () => {
  runInAction(() => {
    Store.guildMasterDialog = true;
  });
});

EventBus.on('ShowGuildCreationDialog', () => {
  runInAction(() => {
    Store.guildCreationOpen = true;
  });
});

EventBus.on('GuildCreationResult', packet => {
  const p = new GuildCreationResultPacket(packet);
  console.log(`GuildCreationResult: ${p.Success} (${p.Error})`);

  if (!p.Success) {
    Store.addNotification('This guild name is already taken', 'error');
    return;
  }
  runInAction(() => {
    Store.guildCreationOpen = false;
  });
  Store.addNotification('The guild was created');
  Store.requestGuildList();
});

EventBus.on('GuildList', packet => {
  const p = new GuildListPacket(packet);
  const members = p.IsInGuild
    ? p.getMembers().map(m => ({
        name: m.Name,
        serverId: m.ServerId,
        role: m.Role,
      }))
    : null;
  console.log(`GuildList: ${members?.map(m => m.name).join(', ') ?? 'no guild'}`);

  runInAction(() => {
    Store.guild = members;
  });
});

// a player asks to join our guild
EventBus.on('GuildJoinRequest', packet => {
  const p = new GuildJoinRequestPacket(packet);
  const name = Store.playerNameById(p.RequesterId);
  console.log(`GuildJoinRequest from ${name}`);
  runInAction(() => {
    Store.guildJoinRequestFrom = { id: p.RequesterId, name };
  });
});

const GUILD_JOIN_MESSAGES: Record<GuildJoinResponseGuildJoinRequestResultEnum, string> = {
  [GuildJoinResponseGuildJoinRequestResultEnum.Refused]: 'The guild request was refused',
  [GuildJoinResponseGuildJoinRequestResultEnum.Accepted]: 'You joined the guild',
  [GuildJoinResponseGuildJoinRequestResultEnum.GuildFull]: 'The guild is full',
  [GuildJoinResponseGuildJoinRequestResultEnum.Disconnected]: 'The guild master is not online',
  [GuildJoinResponseGuildJoinRequestResultEnum.NotTheGuildMaster]: 'That player is not a guild master',
  [GuildJoinResponseGuildJoinRequestResultEnum.AlreadyHaveGuild]: 'You already have a guild',
  [GuildJoinResponseGuildJoinRequestResultEnum.GuildMasterOrRequesterIsBusy]: 'The guild master is busy',
  [GuildJoinResponseGuildJoinRequestResultEnum.MinimumLevel6]: 'You need level 6 to join a guild',
};

EventBus.on('GuildJoinResponse', packet => {
  const p = new GuildJoinResponsePacket(packet);
  console.log(`GuildJoinResponse: ${GuildJoinResponseGuildJoinRequestResultEnum[p.Result]}`);
  const accepted = p.Result === GuildJoinResponseGuildJoinRequestResultEnum.Accepted;
  Store.addNotification(GUILD_JOIN_MESSAGES[p.Result] ?? 'Guild request failed', accepted ? 'info' : 'error');
  if (accepted) Store.requestGuildList();
});

EventBus.on('GuildKickResponse', packet => {
  const p = new GuildKickResponsePacket(packet);
  const result = GuildKickResponseGuildKickSuccessEnum;
  console.log(`GuildKickResponse: ${result[p.Result]}`);

  switch (p.Result) {
    case result.KickSucceeded:
      Store.addNotification('The member was kicked');
      Store.requestGuildList();
      break;
    case result.GuildDisband:
    case result.GuildMemberWithdrawn:
      Store.addNotification(
        p.Result === result.GuildDisband ? 'The guild was disbanded' : 'You left the guild'
      );
      runInAction(() => {
        Store.guild = null;
      });
      break;
    case result.FailedPasswordIncorrect:
      Store.addNotification('Wrong security code', 'error');
      break;
    default:
      Store.addNotification('Only the guild master can do that', 'error');
  }
});

// a player in view left its guild (also us, or kicked)
EventBus.on('GuildMemberLeftGuild', packet => {
  const p = new GuildMemberLeftGuildPacket(packet);
  const id = p.PlayerId & 0x7fff;
  console.log(`GuildMemberLeftGuild: ${id} (master ${p.IsGuildMaster})`);

  runInAction(() => {
    Store.playerGuilds.delete(id);
    if (id === Store.playerId) Store.guild = null;
  });
  if (Store.guild) Store.requestGuildList();
});

// guild of the players in view; the names come with GuildInformation
EventBus.on('AssignCharacterToGuild', packet => {
  const p = new AssignCharacterToGuildPacket(packet);
  const members = p.getMembers();
  console.log(`AssignCharacterToGuild: ${members.map(m => `${m.PlayerId & 0x7fff}->${m.GuildId}`).join(', ')}`);

  runInAction(() => {
    for (const m of members) {
      Store.playerGuilds.set(m.PlayerId & 0x7fff, {
        guildId: m.GuildId,
        role: m.Role,
      });
    }
  });
  const unknown = new Set(
    members.map(m => m.GuildId).filter(id => !Store.guildInfos.has(id))
  );
  unknown.forEach(id => Store.requestGuildInfo(id));
  // we or someone of our guild (a new member): refresh the member list
  const myGuild =
    Store.playerId != null ? Store.playerGuilds.get(Store.playerId)?.guildId : undefined;
  if (
    members.some(
      m => (m.PlayerId & 0x7fff) === Store.playerId || m.GuildId === myGuild
    )
  ) {
    Store.requestGuildList();
  }
});

EventBus.on('GuildInformation', packet => {
  const p = new GuildInformationPacket(packet);
  const bytes = new Uint8Array(packet.buffer, packet.byteOffset, packet.byteLength);
  const emblem = unpackEmblem(bytes.slice(25, 25 + 32));
  console.log(`GuildInformation: ${p.GuildId} ${p.GuildName}`);

  runInAction(() => {
    Store.guildInfos.set(p.GuildId, { name: p.GuildName, emblem });
  });
});

function setHeroState(playerId: number, state: number) {
  runInAction(() => {
    Store.heroStates.set(playerId, state);
  });
}

// PK state of a player changed (killed another player, or the time passed)
EventBus.on('HeroStateChanged', packet => {
  const p = new HeroStateChangedPacket(packet);
  const id = p.PlayerId & 0x7fff;
  const player = Store.world?.netObjsQuery.entities.find(e => e.netId === id);
  console.log(`HeroStateChanged: ${id} -> ${p.NewState}`);
  setHeroState(id, p.NewState);
  if (player?.localPlayer && p.NewState >= HERO_STATE_PK_WARNING) {
    Store.addNotification('You are a player killer now', 'error');
  }
});

// ---- personal store

EventBus.on('PlayerShopSetItemPriceResponse', packet => {
  const p = new PlayerShopSetItemPriceResponsePacket(packet);
  const result = PlayerShopSetItemPriceResponseItemPriceSetResultEnum;
  const price = Store.pendingShopPrices.get(p.InventorySlot);
  Store.pendingShopPrices.delete(p.InventorySlot);
  console.log(`PlayerShopSetItemPriceResponse: ${p.InventorySlot} ${result[p.Result]}`);

  if (p.Result !== result.Success) {
    Store.addNotification(
      p.Result === result.CharacterLevelTooLow
        ? 'You need level 6 to sell items'
        : p.Result === result.Failed
          ? 'Close the store to change the prices'
          : 'Cannot set the price',
      'error'
    );
    return;
  }
  runInAction(() => {
    if (price) Store.shopPrices.set(p.InventorySlot, price);
    else Store.shopPrices.delete(p.InventorySlot);
  });
});

EventBus.on('PlayerShopOpenSuccessful', packet => {
  const p = new PlayerShopOpenSuccessfulPacket(packet);
  console.log(`PlayerShopOpenSuccessful: ${p.Success}`);
  if (!p.Success) {
    Store.addNotification('Cannot open the store here', 'error');
    return;
  }
  runInAction(() => {
    Store.shopOpen = true;
  });
  Store.addNotification('Your store is open');
});

// stores of the players in view
EventBus.on('PlayerShops', packet => {
  const p = new PlayerShopsPacket(packet);
  const shops = p.getShops();
  console.log(`PlayerShops: ${shops.map(s => `${s.PlayerId & 0x7fff} ${s.StoreName}`).join(', ')}`);
  runInAction(() => {
    for (const shop of shops) {
      const id = shop.PlayerId & 0x7fff;
      Store.playerShops.set(id, shop.StoreName);
      if (id === Store.playerId) Store.shopOpen = true;
    }
  });
});

EventBus.on('PlayerShopClosed', packet => {
  const p = new PlayerShopClosedPacket(packet);
  const id = p.PlayerId & 0x7fff;
  console.log(`PlayerShopClosed: ${id} ${p.Success}`);
  runInAction(() => {
    Store.playerShops.delete(id);
    if (id === Store.playerId) Store.shopOpen = false;
    if (Store.viewedShop?.playerId === id) Store.viewedShop = null;
  });
});

EventBus.on('ClosePlayerShopDialog', packet => {
  const p = new ClosePlayerShopDialogPacket(packet);
  runInAction(() => {
    if (Store.viewedShop?.playerId === (p.PlayerId & 0x7fff)) Store.viewedShop = null;
  });
});

// items of the store we look at (also after an item was sold)
EventBus.on('PlayerShopItemList', packet => {
  const p = new PlayerShopItemListPacket(packet);
  const items = p.getItems().map(i => ({
    slot: i.ItemSlot,
    price: i.Price,
    item: ItemSerializer.DeserializeItem(new Uint8Array(i.ItemData.buffer)),
  }));
  console.log(`PlayerShopItemList: ${p.PlayerName} "${p.ShopName}" ${items.length} items`);
  const playerId = p.PlayerId & 0x7fff;
  // sent again after an item was sold: only for the store we look at
  const isUpdate = p.Action !== PlayerShopItemListActionKindEnum.ByRequest;
  if (isUpdate && Store.viewedShop?.playerId !== playerId) return;
  if (!p.Success) {
    Store.addNotification('The store is closed', 'error');
    return;
  }
  runInAction(() => {
    Store.viewedShop = {
      playerId,
      playerName: p.PlayerName,
      shopName: p.ShopName,
      items,
    };
  });
});

const SHOP_BUY_MESSAGES: Partial<Record<PlayerShopBuyResultResultKindEnum, string>> = {
  [PlayerShopBuyResultResultKindEnum.NotAvailable]: 'The item is not available',
  [PlayerShopBuyResultResultKindEnum.ShopNotOpened]: 'The store is closed',
  [PlayerShopBuyResultResultKindEnum.InTransaction]: 'The store is busy, try again',
  [PlayerShopBuyResultResultKindEnum.LackOfMoney]: 'Not enough zen',
  [PlayerShopBuyResultResultKindEnum.MoneyOverflowOrNotEnoughSpace]: 'Not enough space in the inventory',
  [PlayerShopBuyResultResultKindEnum.ItemBlock]: 'This item cannot be bought',
};

EventBus.on('PlayerShopBuyResult', packet => {
  const p = new PlayerShopBuyResultPacket(packet);
  console.log(`PlayerShopBuyResult: ${PlayerShopBuyResultResultKindEnum[p.Result]} slot ${p.ItemSlot}`);
  if (p.Result !== PlayerShopBuyResultResultKindEnum.Success) {
    Store.addNotification(SHOP_BUY_MESSAGES[p.Result] ?? 'Cannot buy the item', 'error');
    return;
  }
  const item = ItemSerializer.DeserializeItem(new Uint8Array(p.ItemData.buffer));
  runInAction(() => {
    Store.playerData.items[p.ItemSlot] = item;
  });
  playSound('Sound/pGetItem');
  Store.addNotification(`You bought ${getItemName(item)}`);
});

// an item of our store was sold (the money comes with InventoryMoneyUpdate)
EventBus.on('PlayerShopItemSoldToPlayer', packet => {
  const p = new PlayerShopItemSoldToPlayerPacket(packet);
  const item = Store.playerData.items[p.InventorySlot];
  console.log(`PlayerShopItemSoldToPlayer: ${p.InventorySlot} to ${p.BuyerName}`);
  runInAction(() => {
    Store.playerData.items[p.InventorySlot] = null as any;
    Store.shopPrices.delete(p.InventorySlot);
  });
  Store.addNotification(`${p.BuyerName} bought ${item ? getItemName(item) : 'an item'}`);
});

// ---- NPC dialogs

const ELF_SOLDIER = 257;
const GENS_NPCS = [543, 544];

// dialog of the S6 NPCs (Elf Soldier, Gens stewards, mercenaries...)
EventBus.on('OpenNpcDialog', packet => {
  const p = new OpenNpcDialogPacket(packet);
  const npcId = Store.talkingToNpc ?? 0;
  const name = Store.npcName(npcId);
  console.log(`OpenNpcDialog: ${p.NpcNumber} ${name}`);

  if (p.NpcNumber === ELF_SOLDIER) {
    Store.showNpcDialog({
      npcId,
      name,
      text: 'Brave warrior, the road ahead is dangerous. Take my blessing: it will protect you while you are still weak.',
      buff: true,
    });
    return;
  }
  Store.showNpcDialog({
    npcId,
    name,
    text: GENS_NPCS.includes(p.NpcNumber)
      ? `The Gens families are not available in this client yet. (Contribution: ${p.GensContributionPoints})`
      : 'Talking to this NPC is not available in this client yet.',
  });
});

// message over a character or NPC (e.g. "I have no quests for you.")
EventBus.on('ObjectMessage', packet => {
  const p = new ObjectMessagePacket(packet);
  const id = p.ObjectId & 0x7fff;
  const name = Store.npcName(id);
  console.log(`ObjectMessage: ${name}: ${p.Message}`);

  if (id === Store.talkingToNpc) {
    Store.showNpcDialog({ npcId: id, name, text: p.Message });
    return;
  }
  Store.addChatLine({ sender: name, text: p.Message });
});

EventBus.on('MagicEffectStatus', packet => {
  const p = new MagicEffectStatusPacket(packet);
  const id = p.PlayerId & 0x7fff;
  console.log(`MagicEffectStatus: ${id} effect ${p.EffectId} ${p.IsActive ? 'on' : 'off'}`);

  const effects = Store.playerEffects.get(id) ?? new Set<number>();
  if (p.IsActive) effects.add(p.EffectId);
  else effects.delete(p.EffectId);
  Store.playerEffects.set(id, effects);

  if (id !== Store.playerId) return;

  runInAction(() => {
    const effects = Store.activeEffects.filter(e => e !== p.EffectId);
    if (p.IsActive) effects.push(p.EffectId);
    Store.activeEffects = effects;
  });

  if (p.IsActive && Store.pendingNpcBuff) {
    Store.pendingNpcBuff = false;
    Store.addNotification('You received the blessing');
  }
});

// ---- legacy quests (class changes)

const QUESTS_PER_BYTE = 4;

// states of the 4 quests of a state byte, from the quest number
function setQuestStates(questNumber: number, stateByte: number) {
  const first = questNumber - (questNumber % QUESTS_PER_BYTE);
  runInAction(() => {
    for (let i = first; i < first + QUESTS_PER_BYTE; i++) {
      Store.questStates.set(i, questStateIn(stateByte, i));
    }
  });
}

// after entering the game: 2 bits per quest from byte 4
EventBus.on('LegacyQuestStateList', packet => {
  const p = new LegacyQuestStateListPacket(packet);
  const count = p.QuestCount;
  for (let i = 0; i < count; i += QUESTS_PER_BYTE) {
    setQuestStates(i, p.buffer.getUint8(4 + i / QUESTS_PER_BYTE));
  }
  console.log(`LegacyQuestStateList: ${[...Store.questStates].map(([n, s]) => `${n}:${LegacyQuestState[s]}`).join(' ')}`);
});

// talking to a quest NPC (Sevina, Marlon, Priest Devin)
EventBus.on('LegacyQuestStateDialog', packet => {
  const p = new LegacyQuestStateDialogPacket(packet);
  const state = questStateIn(p.State, p.QuestIndex);
  console.log(`LegacyQuestStateDialog: quest ${p.QuestIndex} ${LegacyQuestState[state]}`);
  setQuestStates(p.QuestIndex, p.State);
  runInAction(() => {
    Store.questDialog = {
      npcId: Store.talkingToNpc ?? 0,
      questNumber: p.QuestIndex,
      state,
    };
  });
});

EventBus.on('LegacySetQuestStateResponse', packet => {
  const p = new LegacySetQuestStateResponsePacket(packet);
  const state = questStateIn(p.NewState, p.QuestIndex);
  const name = legacyQuest(p.QuestIndex)?.name ?? `Quest ${p.QuestIndex}`;
  console.log(`LegacySetQuestStateResponse: quest ${p.QuestIndex} result ${p.Result} ${LegacyQuestState[state]}`);
  if (p.Result !== 0) {
    Store.addNotification('The quest could not be changed', 'error');
    return;
  }
  setQuestStates(p.QuestIndex, p.NewState);
  runInAction(() => {
    Store.questKills.clear();
  });
  Store.closeQuestDialog();

  if (state === LegacyQuestState.Active) {
    Store.addNotification(`Quest accepted: ${name}`);
  } else if (state === LegacyQuestState.Complete) {
    playSound('Sound/pLevelUp');
    Store.addNotification(`Quest completed: ${name}`);
  }
});

// reward of a finished quest, also of the other players in view (class change)
EventBus.on('LegacyQuestReward', packet => {
  const p = new LegacyQuestRewardPacket(packet);
  const id = p.PlayerId & 0x7fff;
  const Reward = LegacyQuestRewardQuestRewardTypeEnum;
  console.log(`LegacyQuestReward: ${id} ${Reward[p.Reward]} ${p.Count}`);
  const mine = id === Store.playerId;

  switch (p.Reward) {
    case Reward.CharacterEvolutionFirstToSecond:
    case Reward.CharacterEvolutionSecondToThird: {
      const cls = classAfterQuest(p.Count);
      const player = Store.world?.netObjsQuery.entities.find(e => e.netId === id);
      if (player?.charAppearance) {
        player.charAppearance.charClass = cls;
        player.charAppearance.changed = true;
      }
      if (mine) {
        playSound('Sound/mQuest');
        Store.addNotification(`You are now a ${classDisplayName(cls)}!`);
      }
      break;
    }
    case Reward.LevelUpPoints:
      if (!mine) break;
      runInAction(() => {
        Store.playerData.points += p.Count;
      });
      Store.addNotification(`You received ${p.Count} level up points`);
      break;
    case Reward.LevelUpPointsPerLevelIncrease:
      if (!mine) break;
      runInAction(() => {
        Store.playerData.points += p.Count;
      });
      Store.addNotification(`You receive 1 more point per level (+${p.Count} points)`);
      break;
    case Reward.ComboSkill:
      if (mine) Store.addNotification('You learned the combo skill');
      break;
  }
});

EventBus.on('LegacyQuestMonsterKillInfo', packet => {
  const p = new LegacyQuestMonsterKillInfoPacket(packet);
  const kills = p.getKills(5).filter(k => k.MonsterNumber);
  console.log(`LegacyQuestMonsterKillInfo: quest ${p.QuestIndex} ${kills.map(k => `${k.MonsterNumber}:${k.KillCount}`).join(' ')}`);
  runInAction(() => {
    Store.questKills.clear();
    for (const k of kills) Store.questKills.set(k.MonsterNumber, k.KillCount);
  });
});

// ---- Devil Square / Blood Castle

const MINI_GAME_BY_TYPE: Record<number, MiniGameKind> = { 1: 'DevilSquare', 2: 'BloodCastle' };

EventBus.on('MiniGameOpeningState', packet => {
  const p = new MiniGameOpeningStatePacket(packet);
  const kind = MINI_GAME_BY_TYPE[p.GameType];
  console.log(`MiniGameOpeningState: ${kind} ${p.RemainingEnteringTimeMinutes} min, ${p.UserCount} players`);
  if (!kind) return;
  runInAction(() => {
    Store.miniGameOpening = { kind, minutes: p.RemainingEnteringTimeMinutes, players: p.UserCount };
  });
});

// results of EnterMiniGameAction (0-5 in the protocol, then OpenMU's own)
const ENTER_ERRORS: Record<number, string> = {
  1: 'You cannot enter (check your ticket)',
  2: 'The entrance is not open yet',
  3: 'Your level is too high for this game',
  4: 'Your level is too low for this game',
  5: 'The game is full',
  6: 'Not enough zen',
  7: 'Player killers cannot enter',
};

function onMiniGameEnterResult(kind: MiniGameKind, result: number) {
  const pending = Store.pendingMiniGame;
  Store.pendingMiniGame = null;
  console.log(`${kind}EnterResult: ${result}`);
  if (result !== 0) {
    Store.addNotification(ENTER_ERRORS[result] ?? 'You cannot enter', 'error');
    return;
  }
  runInAction(() => {
    Store.miniGameEntry = null;
    Store.miniGameOpening = null;
    Store.miniGameScore = null;
    Store.miniGame = { kind, level: pending?.kind === kind ? pending.level : 0 };
  });
  // the NPC dialog is over: the server warps the player
  Store.talkingToNpc = null;
  Store.addNotification(`You entered ${MINI_GAMES[kind].name}`);
}

EventBus.on('DevilSquareEnterResult', packet => {
  onMiniGameEnterResult('DevilSquare', new DevilSquareEnterResultPacket(packet).Result);
});

EventBus.on('BloodCastleEnterResult', packet => {
  onMiniGameEnterResult('BloodCastle', new BloodCastleEnterResultPacket(packet).Result);
});

const MINI_GAME_COUNTDOWN = 30;

const MINI_GAME_STATE_TEXT: Partial<Record<UpdateMiniGameStateMiniGameTypeStateEnum, string>> = {
  [UpdateMiniGameStateMiniGameTypeStateEnum.DevilSquareOpened]: 'The entrance of Devil Square is open',
  [UpdateMiniGameStateMiniGameTypeStateEnum.DevilSquareRunning]: 'Devil Square has started!',
  [UpdateMiniGameStateMiniGameTypeStateEnum.DevilSquareClosed]: 'Devil Square starts in 30 seconds!',
  [UpdateMiniGameStateMiniGameTypeStateEnum.BloodCastleOpened]: 'The entrance of Blood Castle is open',
  [UpdateMiniGameStateMiniGameTypeStateEnum.BloodCastleEnding]: 'Blood Castle has started!',
  [UpdateMiniGameStateMiniGameTypeStateEnum.BloodCastleFinished]: 'Blood Castle has ended',
  [UpdateMiniGameStateMiniGameTypeStateEnum.BloodCastleClosed]: 'Blood Castle starts in 30 seconds!',
};

// only sent to the players of the game (and of its entrance)
EventBus.on('UpdateMiniGameState', packet => {
  const p = new UpdateMiniGameStatePacket(packet);
  const State = UpdateMiniGameStateMiniGameTypeStateEnum;
  console.log(`UpdateMiniGameState: ${State[p.State]}`);
  const text = MINI_GAME_STATE_TEXT[p.State];
  if (text) Store.addNotification(text);

  const game = Store.miniGame;
  if (!game) return;
  runInAction(() => {
    // OpenMU sends Closed to the players of the game when the entrance
    // closes: the game starts after a countdown of 30 seconds and lasts its
    // duration (the start itself isn't sent)
    const started =
      (p.State === State.DevilSquareClosed || p.State === State.DevilSquareRunning) &&
      game.kind === 'DevilSquare';
    if (started && game.remaining == null) {
      game.remaining = MINI_GAME_COUNTDOWN + MINI_GAMES.DevilSquare.duration * 60;
      game.remainingAt = performance.now();
    }
  });
});

EventBus.on('BloodCastleState', packet => {
  const p = new BloodCastleStatePacket(packet);
  const buffer = p.buffer;
  const ownerId = buffer.getUint16(10, true);
  console.log(`BloodCastleState: ${BloodCastleStateStatusEnum[p.State]} ${p.RemainSecond}s monsters ${p.CurMonster}/${p.MaxMonster} owner ${ownerId}`);
  runInAction(() => {
    const game = (Store.miniGame ??= { kind: 'BloodCastle', level: 0 });
    if (!game.level) {
      const map = Store.world?.mapIndex;
      game.level = MINI_GAMES.BloodCastle.levels.find(l => l.map === map)?.level ?? 0;
    }
    game.status = p.State;
    game.remaining = p.RemainSecond;
    game.remainingAt = performance.now();
    game.monsters = { max: p.MaxMonster, current: p.CurMonster };
    game.itemOwner =
      ownerId !== 0xff && ownerId !== 0xffff ? Store.playerNameById(ownerId & 0x7fff) : undefined;
  });
  if (p.State === BloodCastleStateStatusEnum.BloodCastleGateDestroyed) {
    Store.addNotification('The castle gate was destroyed!');
  }
});

// both are code 0x93: the score table of Devil Square (5 + 24 bytes per
// player) and the result of Blood Castle (29 bytes); a table with one
// player has 29 bytes too, the game we are in decides
function readString(buffer: DataView, offset: number, length: number) {
  let s = '';
  for (let i = 0; i < length; i++) {
    const c = buffer.getUint8(offset + i);
    if (!c) break;
    s += String.fromCharCode(c);
  }
  return s;
}

function onMiniGameScore(buffer: DataView) {
  const bloodCastle =
    buffer.byteLength === 29 && Store.miniGame?.kind !== 'DevilSquare';
  let score: import('./store').MiniGameScore;
  if (bloodCastle) {
    score = {
      kind: 'BloodCastle',
      success: buffer.getUint8(3) !== 0,
      rows: [
        {
          name: readString(buffer, 5, 10),
          score: buffer.getUint32(17, true),
          experience: buffer.getUint32(21, true),
          money: buffer.getUint32(25, true),
        },
      ],
    };
  } else {
    const count = buffer.getUint8(4);
    const rows = [];
    for (let i = 0; i < count && 5 + (i + 1) * 24 <= buffer.byteLength; i++) {
      const o = 5 + i * 24;
      rows.push({
        name: readString(buffer, o, 10),
        score: buffer.getUint32(o + 12, true),
        experience: buffer.getUint32(o + 16, true),
        money: buffer.getUint32(o + 20, true),
      });
    }
    score = { kind: 'DevilSquare', rank: buffer.getUint8(3), rows };
  }
  console.log('MiniGameScore', JSON.stringify(score));
  runInAction(() => {
    Store.miniGameScore = score;
  });
}

EventBus.on('MiniGameScoreTable', packet => onMiniGameScore(packet));
EventBus.on('BloodCastleScore', packet => onMiniGameScore(packet));

// walkable tiles of the events (gates and bridge of Blood Castle...)
EventBus.on('ChangeTerrainAttributes', packet => {
  const p = new ChangeTerrainAttributesPacket(packet);
  const areas = p.getAreas();
  console.log(`ChangeTerrainAttributes: ${p.Attribute} ${p.RemoveAttribute ? 'removed' : 'set'} ${JSON.stringify(areas)}`);
  const world = Store.world;
  if (!world) return;
  for (const a of areas) {
    world.setTerrainFlag(a.StartX, a.StartY, a.EndX, a.EndY, p.Attribute, !p.RemoveAttribute);
  }
  EventBus.emit('terrainChanged');
});
