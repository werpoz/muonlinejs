import {
  CharacterClassNumber,
  ENUM_WORLD,
  SimpleModulusEncryptor,
  Xor32Encryptor,
  Xor3Byte,
} from './common';
import {
  CreateCharacterPacket,
  FocusCharacterPacket,
  LoginShortPasswordPacket,
  RequestCharacterListPacket,
  SelectCharacterPacket,
  WalkRequestPacket,
  HitRequestPacket,
  PickupItemRequestPacket,
  PublicChatMessagePacket,
  ConsumeItemRequestPacket,
  IncreaseCharacterStatPointPacket,
  ItemMoveRequestPacket,
  DropItemRequestPacket,
  TargetedSkillPacket,
  AreaSkillPacket,
  AreaSkillHitPacket,
  EnterGateRequestPacket,
  WarpCommandRequestPacket,
  ClientReadyAfterMapChangePacket,
  TalkToNpcRequestPacket,
  CloseNpcRequestPacket,
  BuyItemFromNpcRequestPacket,
  SellItemToNpcRequestPacket,
  VaultClosedPacket,
  VaultMoveMoneyRequestPacket,
  TradeRequestPacket,
  TradeRequestResponsePacket,
  TradeCancelPacket,
  TradeButtonStateChangePacket,
  SetTradeMoneyPacket,
  VaultMoveMoneyRequestVaultMoneyMoveDirectionEnum,
} from './common/packets/ClientToServerPackets';
import {
  ConnectionInfoRequestPacket,
  ServerListRequestPacket,
  ServerListResponsePacket,
} from './common/packets/ConnectServerPackets';
import { CharacterListPacket } from './common/packets/ServerToClientPackets';
import { stringToBytes } from './common/utils';
import {
  CLIENT_VERSION,
  CS_HOST,
  CS_PORT,
  MAX_PASSWORD_LENGTH,
  MAX_USERNAME_LENGTH,
  WS_HOST,
  WS_PORT,
} from './consts';
import { LocalStorage } from './libs/localStorage';
import { createSocket } from './libs/sockets/createSocket';
import {
  makeObservable,
  observable,
  action,
  remove,
  runInAction,
  computed,
} from 'mobx';
import { Item, World } from './ecs/world';
import { EventBus } from './libs/eventBus';
import { Scalar } from './libs/babylon/exports';
import { InventoryConstants } from './common/inventoryConstants';
import { ItemGroups } from './common/objects/enum';
import { ItemsDatabase } from './common/itemsDatabase';
import { ItemStorageKind } from './common/itemStorageKind';
import {
  UPGRADE_JEWELS,
  isUpgradeJewel,
  isWearable,
} from './common/itemInfo';
import { spawnPlayer } from './logic';

const CONFIG_KEY = '_mu_key';

const xor32 = new Xor32Encryptor();

type ConfigType = {
  csIp?: string;
  csPort?: number;
  wsHost?: string;
  wsPort?: number;
  username?: string;
  password?: string;
};

export enum UIState {
  Preloader,
  Servers,
  Login,
  Characters,
  LoadingWorld,
  World,
}

class ActionBarSlot {
  itemId = 0;
  count = 0;
}

class ActionBar {
  q: ActionBarSlot | null = null;
  w: ActionBarSlot | null = null;
  e: ActionBarSlot | null = null;
  r: ActionBarSlot | null = null;

  num6: ActionBarSlot | null = null;
  num7: ActionBarSlot | null = null;
  num8: ActionBarSlot | null = null;
  num9: ActionBarSlot | null = null;
  num0: ActionBarSlot | null = null;

  selectedSkill = -1;

  constructor() {
    makeObservable(this, {
      q: observable,
      w: observable,
      e: observable,
      r: observable,
      num6: observable,
      num7: observable,
      num8: observable,
      num9: observable,
      num0: observable,
      selectedSkill: observable,
    });
  }
}

class PlayerData {
  money = 0;
  x = 0;
  y = 0;

  tileFlag = 0;

  actionBar = new ActionBar();

  currentHP = 25;
  maxHP = 40;
  currentMP = 80;
  maxMP = 100;
  currentSD = 10;
  maxSD = 12;
  currentAG = 10;
  maxAG = 12;

  level = 1;
  points = 5;

  exp = 50;
  currentLvlExp = 0;
  expToNextLvl = 100;

  str = 10;
  agi = 10;
  sta = 10;
  eng = 10;

  items: Item[] = new Array(
    InventoryConstants.InventoryRows * InventoryConstants.RowSize +
      InventoryConstants.EquippableSlotsCount
  ).fill(null);

  get leftHandSlot() {
    return this.items[InventoryConstants.LeftHandSlot];
  }

  get rightHandSlot() {
    return this.items[InventoryConstants.RightHandSlot];
  }

  get helmetSlot() {
    return this.items[InventoryConstants.HelmSlot];
  }

  get glovesSlot() {
    return this.items[InventoryConstants.GlovesSlot];
  }

  get bootsSlot() {
    return this.items[InventoryConstants.BootsSlot];
  }

  get pantsSlot() {
    return this.items[InventoryConstants.PantsSlot];
  }

  get armorSlot() {
    return this.items[InventoryConstants.ArmorSlot];
  }

  get wingsSlot() {
    return this.items[InventoryConstants.WingsSlot];
  }

  get pendantSlot() {
    return this.items[InventoryConstants.PendantSlot];
  }

  get ring1Slot() {
    return this.items[InventoryConstants.Ring1Slot];
  }

  get ring2Slot() {
    return this.items[InventoryConstants.Ring2Slot];
  }

  get petSlot() {
    return this.items[InventoryConstants.PetSlot];
  }

  get inventoryItems() {
    return this.items.slice(
      InventoryConstants.LastEquippableItemSlotIndex + 1,
      InventoryConstants.LastEquippableItemSlotIndex +
        1 +
        InventoryConstants.InventoryRows * InventoryConstants.RowSize
    );
  }

  get hpPercent() {
    return Scalar.Clamp(this.currentHP / Math.max(this.maxHP, 1), 0, 1);
  }

  get mpPercent() {
    return Scalar.Clamp(this.currentMP / Math.max(this.maxMP, 1), 0, 1);
  }

  get sdPercent() {
    return Scalar.Clamp(this.currentSD / Math.max(this.maxSD, 1), 0, 1);
  }

  get agPercent() {
    return Scalar.Clamp(this.currentAG / Math.max(this.maxAG, 1), 0, 1);
  }

  get expPercent() {
    return Scalar.Clamp(
      (this.exp - this.currentLvlExp) /
        Math.max(this.expToNextLvl - this.currentLvlExp, 1),
      0,
      1
    );
  }

  constructor() {
    makeObservable(this, {
      money: observable,
      x: observable,
      y: observable,
      tileFlag: observable,
      actionBar: observable,
      currentHP: observable,
      maxHP: observable,
      currentMP: observable,
      maxMP: observable,
      currentSD: observable,
      maxSD: observable,
      currentAG: observable,
      maxAG: observable,
      exp: observable,
      currentLvlExp: observable,
      expToNextLvl: observable,
      expPercent: computed,
      hpPercent: computed,
      mpPercent: computed,
      sdPercent: computed,
      agPercent: computed,
      str: observable,
      agi: observable,
      sta: observable,
      eng: observable,
      level: observable,
      points: observable,
      items: observable,
      leftHandSlot: computed,
      rightHandSlot: computed,
      helmetSlot: computed,
      glovesSlot: computed,
      bootsSlot: computed,
      pantsSlot: computed,
      armorSlot: computed,
      wingsSlot: computed,
      pendantSlot: computed,
      ring1Slot: computed,
      ring2Slot: computed,
      petSlot: computed,
      inventoryItems: computed,
    });
  }

  setPosition(x: number, y: number) {
    runInAction(() => {
      this.x = x;
      this.y = y;
    });
  }

  setTileFlag(flag: number) {
    runInAction(() => {
      this.tileFlag = flag;
    });
  }
}

export type NotificationType = 'info' | 'error';

export type ChatLine = { sender: string; text: string; system?: boolean };

// trade window of the original client: 8 columns x 4 rows for each side
export const TRADE_SIZE = 32;

export type TradeState = {
  partner: string;
  partnerLevel: number;
  myItems: (Item | null)[];
  partnerItems: (Item | null)[];
  myMoney: number;
  partnerMoney: number;
  myAccept: boolean;
  partnerAccept: boolean;
};

const MAX_CHAT_LINES = 8;

export type Notification = {
  text: string;
  type: NotificationType;
};

export const Store = new (class _Store {
  csSocket?: WebSocket;
  gsSocket?: WebSocket;

  private encryptor?: SimpleModulusEncryptor;

  username = '';
  password = '';
  serverList: ReturnType<ServerListResponsePacket['getServers']> = [];
  charactersList: ReturnType<CharacterListPacket['getCharacters']> = [];
  uiState = UIState.Preloader;
  playerId?: number;

  loginProcessing = false;
  loginError?: string;

  loadingCharactersList = false;
  newCharName: string = '';
  newCharClass: CharacterClassNumber = CharacterClassNumber.DarkKnight;
  focusedChar: string = '';

  playerData = new PlayerData();

  characterInfoEnabled = false;
  inventoryEnabled = false;

  // inventory slot of the item picked up with the mouse
  heldItemSlot: number | null = null;
  // storage of the held item: inventory or vault
  heldItemStorage: ItemStorageKind = ItemStorageKind.Inventory;

  // open vault (Baz): 120 slots (8x15) and its money
  vault: { items: (Item | null)[]; money: number } | null = null;

  // open trade with another player: 8x4 slots and money of each side, and
  // whether each side pressed the accept button
  trade: TradeState | null = null;
  // name of the player who asked us to trade (answer dialog)
  tradeRequestFrom: string | null = null;
  // money sent with SetTradeMoney, confirmed by TradeMoneySetResponse
  pendingTradeMoney = 0;
  // we declined a request: the server answers "not accepted" to us too
  tradeDeclinedByMe = false;

  // learned skills and the one used with the right mouse button
  skills: { index: number; number: number; level: number }[] = [];
  currentSkill: number | null = null;

  // open NPC shop: items by store slot (8 columns)
  npcShop: { npcId: number; items: { slot: number; item: Item }[] } | null =
    null;
  // move sent to the server, ItemMoved only tells the target slot
  pendingItemMove: {
    from: number;
    to: number;
    fromStorage: ItemStorageKind;
    toStorage: ItemStorageKind;
  } | null = null;

  config: ConfigType = {
    csIp: CS_HOST,
    csPort: CS_PORT,
    wsHost: WS_HOST,
    wsPort: WS_PORT,
  };

  notifications: Notification[] = [];

  chatMessages: ChatLine[] = [];

  world: World | null = null;

  isOffline = location.href.includes('offline');

  constructor() {
    makeObservable(this, {
      username: observable,
      password: observable,
      serverList: observable,
      uiState: observable,
      playerId: observable,
      loginError: observable,
      loginProcessing: observable,
      charactersList: observable,
      loadingCharactersList: observable,
      newCharName: observable,
      newCharClass: observable,
      focusedChar: observable,
      playerData: observable,
      notifications: observable,
      chatMessages: observable,
      world: observable,
      characterInfoEnabled: observable,
      inventoryEnabled: observable,
      heldItemSlot: observable,
      heldItemStorage: observable,
      vault: observable,
      trade: observable,
      tradeRequestFrom: observable,
      skills: observable,
      currentSkill: observable,
      npcShop: observable,
    });
    this.loadConfig();
  }

  playOffline() {
    if (!this.world) return;

    history.replaceState(null, '', '/offline');
    this.isOffline = true;
    this.uiState = UIState.World;
    this.setTestItems();

    const testPlayer = spawnPlayer(this.world);
    this.world.addComponent(testPlayer, 'localPlayer', true);
    this.world.addComponent(testPlayer, 'worldIndex', ENUM_WORLD.WD_0LORENCIA);
    testPlayer.objectNameInWorld = 'TestPlayer';
    EventBus.emit('requestWarp', { map: ENUM_WORLD.WD_0LORENCIA });
  }

  playOnline() {
    this.uiState = UIState.Servers;

    this.connectToConnectServer();
  }

  setTestItems() {
    const DragonSetIndex = 1;

    Store.playerData.items[InventoryConstants.HelmSlot] = {
      num: DragonSetIndex,
      group: ItemGroups.Helm,
      lvl: 9,
      isExcellent: false,
    };

    Store.playerData.items[InventoryConstants.ArmorSlot] = {
      num: DragonSetIndex,
      group: ItemGroups.Armor,
      lvl: 7,
      isExcellent: false,
    };

    Store.playerData.items[InventoryConstants.PantsSlot] = {
      num: DragonSetIndex,
      group: ItemGroups.Pants,
      lvl: 9,
      isExcellent: false,
    };

    Store.playerData.items[InventoryConstants.GlovesSlot] = {
      num: DragonSetIndex,
      group: ItemGroups.Gloves,
      lvl: 5,
      isExcellent: false,
    };

    Store.playerData.items[InventoryConstants.BootsSlot] = {
      num: DragonSetIndex,
      group: ItemGroups.Boots,
      lvl: 1,
      isExcellent: false,
    };

    const weapon = ItemsDatabase.getItem(3, 9); // bill spear
    // const weapon = ItemsDatabase.getItem(1, 1); // small axe

    Store.playerData.items[InventoryConstants.LeftHandSlot] = {
      group: weapon.Group,
      num: weapon.Index,
      lvl: 9,
      isExcellent: false,
    };

    Store.playerData.items[InventoryConstants.LastEquippableItemSlotIndex + 1] =
      {
        group: weapon.Group,
        num: weapon.Index,
        lvl: 9,
        isExcellent: true,
      };

    this.syncPlayerAppearance();
  }

  syncPlayerAppearance() {
    const playerData = this.playerData;
    const playerEntity = this.world?.playerEntity;

    if (!playerEntity || !playerEntity.charAppearance) return;

    playerEntity.charAppearance.helm = playerData.helmetSlot || null;
    playerEntity.charAppearance.armor = playerData.armorSlot || null;
    playerEntity.charAppearance.pants = playerData.pantsSlot || null;
    playerEntity.charAppearance.gloves = playerData.glovesSlot || null;
    playerEntity.charAppearance.boots = playerData.bootsSlot || null;
    playerEntity.charAppearance.leftHand = playerData.leftHandSlot || null;
    playerEntity.charAppearance.rightHand = playerData.rightHandSlot || null;
    playerEntity.charAppearance.wings = playerData.wingsSlot || null;
    playerEntity.charAppearance.changed = true;
  }

  private loadConfig(): void {
    const data = JSON.parse(
      LocalStorage.load(CONFIG_KEY) ?? '{}'
    ) as ConfigType;
    if (data) {
      Object.assign(this.config, data);
    }

    this.username = this.config.username ?? '';
    this.password = this.config.password ?? '';
  }

  saveConfig(): void {
    LocalStorage.save(CONFIG_KEY, JSON.stringify(this.config));
  }

  saveLoginData(): void {
    const c = this.config;
    c.username = this.username;
    c.password = this.password;
    this.saveConfig();
  }

  addNotification(text: string, type: NotificationType = 'info', delay = 3000) {
    const newNotification: Notification = { text, type };

    this.notifications.push(newNotification);

    setTimeout(
      action(() =>
        remove(
          this.notifications,
          this.notifications.indexOf(newNotification) as any
        )
      ),
      delay
    );
  }

  sendToCS(buffer: DataView) {
    this.csSocket?.send(buffer);
  }

  sendToGS(buffer: DataView) {
    let packet = new Uint8Array(buffer.buffer);

    const header = packet[0];
    xor32.Encrypt(packet);
    if (this.encryptor && header >= 0xc3) {
      packet = this.encryptor.Encrypt(packet);
    }

    this.gsSocket?.send(packet);
  }

  async connectToConnectServer() {
    const config = this.config;

    const { socket } = createSocket({
      wsAddress: `${config.wsHost ?? WS_HOST}:${config.wsPort ?? WS_PORT}`,
      tcpIP: config.csIp ?? CS_HOST,
      tcpPort: config.csPort ?? CS_PORT,
    });

    this.csSocket = socket;
  }

  async disconnectFromConnectServer() {
    this.csSocket?.close();
    this.csSocket = undefined;
  }

  async connectToGameServer(ip: string, port: number) {
    const config = this.config;

    const { socket } = createSocket({
      wsAddress: `${config.wsHost ?? WS_HOST}:${config.wsPort ?? WS_PORT}`,
      tcpIP: ip,
      tcpPort: port,
    });

    this.gsSocket = socket;

    this.encryptor = new SimpleModulusEncryptor();
    this.encryptor.encryptionKeys = SimpleModulusEncryptor.DefaultClientKey;
  }

  async disconnectFromGameServer() {
    this.gsSocket?.close();
    this.gsSocket = undefined;
  }

  updateServerListRequest(): void {
    const buffer = ServerListRequestPacket.createPacket().buffer;
    this.sendToCS(buffer);
  }

  getConnectionInfoRequest(serverId: number): void {
    const connectionInfoRequestPacket =
      ConnectionInfoRequestPacket.createPacket();
    connectionInfoRequestPacket.ServerId = serverId;

    this.sendToCS(connectionInfoRequestPacket.buffer);
  }

  loginRequest(username: string, password: string) {
    const usernameBytes = stringToBytes(username, MAX_USERNAME_LENGTH);
    const passwordBytes = stringToBytes(password, MAX_PASSWORD_LENGTH);

    Xor3Byte(usernameBytes);
    Xor3Byte(passwordBytes);

    const loginShortPasswordPacket = LoginShortPasswordPacket.createPacket();
    loginShortPasswordPacket.setUsername(usernameBytes, usernameBytes.length);
    loginShortPasswordPacket.setPassword(passwordBytes, passwordBytes.length);
    loginShortPasswordPacket.setClientVersion(CLIENT_VERSION);

    console.log(`send login`);
    this.sendToGS(loginShortPasswordPacket.buffer);
  }

  refreshCharactersListRequest(): void {
    this.loadingCharactersList = true;
    const packet = RequestCharacterListPacket.createPacket();
    packet.Language = 0; // TODO
    this.sendToGS(packet.buffer);
  }

  focusCharacterRequest(name: string): void {
    const packet = FocusCharacterPacket.createPacket();
    packet.setName(name);
    this.sendToGS(packet.buffer);
  }

  selectCharacterRequest(name: string): void {
    const selectCharacterPacket = SelectCharacterPacket.createPacket();
    selectCharacterPacket.setName(name);

    const character = this.charactersList.find(c => c.Name === name);
    if (character) {
      runInAction(() => {
        this.playerData.level = character.Level;
      });
    }

    console.log(`select character [${name}]`);
    this.sendToGS(selectCharacterPacket.buffer);
  }

  createCharacterRequest(name: string, charClass: CharacterClassNumber): void {
    const packet = CreateCharacterPacket.createPacket();
    packet.setName(name);
    packet.Class = charClass;

    this.sendToGS(packet.buffer);
  }

  sendHitRequest(targetId: number, animation: number, direction: number): void {
    const packet = HitRequestPacket.createPacket();
    packet.TargetId = targetId;
    packet.AttackAnimation = animation;
    packet.LookingDirection = direction;

    this.sendToGS(packet.buffer);
  }

  sendChatMessage(text: string): void {
    const name = this.world?.playerEntity?.objectNameInWorld ?? '';
    // header (3) + character name (10) + message + null terminator
    const packet = PublicChatMessagePacket.createPacket(13 + text.length + 1);
    packet.setCharacter(name);
    packet.setMessage(text);

    this.sendToGS(packet.buffer);
  }

  addChatLine(line: ChatLine): void {
    runInAction(() => {
      this.chatMessages.push(line);
      if (this.chatMessages.length > MAX_CHAT_LINES) this.chatMessages.shift();
    });
  }

  // stat: 0 strength, 1 agility, 2 vitality, 3 energy, 4 leadership
  increaseStat(stat: number): void {
    const packet = IncreaseCharacterStatPointPacket.createPacket();
    packet.StatType = stat;

    this.sendToGS(packet.buffer);
  }

  // Click on an inventory or equipment slot: pick the item up, or put the
  // held item there.
  itemsOf(storage: ItemStorageKind): (Item | null)[] {
    switch (storage) {
      case ItemStorageKind.Vault:
        return this.vault?.items ?? [];
      case ItemStorageKind.Trade:
        return this.trade?.myItems ?? [];
      default:
        return this.playerData.items;
    }
  }

  // the held item, only when it comes from the inventory (drop, sell)
  get heldInventorySlot(): number | null {
    return this.heldItemStorage === ItemStorageKind.Inventory
      ? this.heldItemSlot
      : null;
  }

  onItemSlotClick(
    slot: number,
    storage: ItemStorageKind = ItemStorageKind.Inventory
  ): void {
    runInAction(() => {
      const held = this.heldItemSlot;
      if (held === null) {
        if (this.itemsOf(storage)[slot]) {
          this.heldItemSlot = slot;
          this.heldItemStorage = storage;
        }
        return;
      }

      const heldStorage = this.heldItemStorage;
      this.heldItemSlot = null;

      const inventory = ItemStorageKind.Inventory;
      if (heldStorage === inventory && storage === inventory && held !== slot) {
        if (this.tryUseJewel(held, slot)) return;
      }

      if (held !== slot || heldStorage !== storage) {
        this.moveItem(held, slot, heldStorage, storage);
      }
    });
  }

  // item upgraded with a jewel, to tell the result with InventoryItemUpgraded
  pendingUpgrade: { slot: number; before: Item; jewel: string } | null = null;

  // Jewel of Bless / Soul / Life dropped on an item of the inventory (not
  // equipped, like in OpenMU): use it on that item.
  tryUseJewel(jewelSlot: number, targetSlot: number): boolean {
    const items = this.playerData.items;
    const jewel = items[jewelSlot];
    const target = items[targetSlot];
    if (!isUpgradeJewel(jewel) || !target) return false;
    if (isUpgradeJewel(target) || !isWearable(target.group)) return false;

    if (targetSlot <= InventoryConstants.LastEquippableItemSlotIndex) {
      this.addNotification('Unequip the item to use a jewel on it', 'error');
      return true;
    }

    this.pendingUpgrade = {
      slot: targetSlot,
      before: target,
      jewel: UPGRADE_JEWELS[`${jewel.group}/${jewel.num}`],
    };
    this.consumeItem(jewelSlot, targetSlot);
    return true;
  }

  sendTargetedSkill(skill: number, targetId: number): void {
    const packet = TargetedSkillPacket.createPacket();
    packet.SkillId = skill;
    packet.TargetId = targetId;

    this.sendToGS(packet.buffer);
  }

  enterGate(gateNumber: number): void {
    const packet = EnterGateRequestPacket.createPacket();
    packet.GateNumber = gateNumber;

    console.log(`EnterGateRequest: ${gateNumber}`);
    this.sendToGS(packet.buffer);
  }

  talkingToNpc: number | null = null;

  talkToNpc(npcId: number): void {
    const packet = TalkToNpcRequestPacket.createPacket();
    packet.NpcId = npcId;

    this.talkingToNpc = npcId;
    this.sendToGS(packet.buffer);
  }

  sendCloseNpcRequest(): void {
    this.talkingToNpc = null;
    this.sendToGS(CloseNpcRequestPacket.createPacket().buffer);
  }

  moveVaultMoney(toVault: boolean, amount: number): void {
    const packet = VaultMoveMoneyRequestPacket.createPacket();
    packet.Direction = toVault
      ? VaultMoveMoneyRequestVaultMoneyMoveDirectionEnum.InventoryToVault
      : VaultMoveMoneyRequestVaultMoneyMoveDirectionEnum.VaultToInventory;
    packet.Amount = amount;
    this.sendToGS(packet.buffer);
  }

  // Trade request to another player in view, by name; without a name, to
  // the nearest player.
  requestTrade(name?: string): void {
    const world = this.world;
    const me = world?.playerEntity;
    if (!world || !me) return;

    const players = world.netObjsQuery.entities.filter(
      e => e.charAppearance && !e.localPlayer && e.netId != null
    );
    const distance = (e: (typeof players)[number]) =>
      Math.hypot(
        e.transform.pos.x - me.transform.pos.x,
        e.transform.pos.z - me.transform.pos.z
      );
    const target = name
      ? players.find(
          e => e.objectNameInWorld?.toLowerCase() === name.toLowerCase()
        )
      : players.sort((a, b) => distance(a) - distance(b))[0];

    if (!target) {
      this.addNotification(
        name ? `${name} is not near you` : 'There is nobody near you',
        'error'
      );
      return;
    }
    if (this.trade) {
      this.addNotification('You are already trading', 'error');
      return;
    }

    const packet = TradeRequestPacket.createPacket();
    packet.PlayerId = target.netId!;
    this.sendToGS(packet.buffer);
    this.addNotification(`Trade requested to ${target.objectNameInWorld}`);
  }

  answerTradeRequest(accept: boolean): void {
    runInAction(() => {
      this.tradeRequestFrom = null;
    });
    this.tradeDeclinedByMe = !accept;
    const packet = TradeRequestResponsePacket.createPacket();
    packet.TradeAccepted = accept;
    this.sendToGS(packet.buffer);
  }

  setTradeMoney(amount: number): void {
    if (!this.trade) return;
    // the server only accepts the money while the accept button is released
    this.setTradeAccept(false);

    this.pendingTradeMoney = amount;
    const packet = SetTradeMoneyPacket.createPacket();
    packet.Amount = amount;
    this.sendToGS(packet.buffer);
  }

  setTradeAccept(accept: boolean): void {
    const trade = this.trade;
    if (!trade || trade.myAccept === accept) return;

    runInAction(() => {
      trade.myAccept = accept;
    });
    const packet = TradeButtonStateChangePacket.createPacket();
    packet.NewState = accept ? 1 : 0;
    this.sendToGS(packet.buffer);
  }

  cancelTrade(): void {
    if (!this.trade) return;
    this.sendToGS(TradeCancelPacket.createPacket().buffer);
  }

  // trade closed by the server (finished or cancelled)
  closeTrade(): void {
    runInAction(() => {
      this.trade = null;
      this.pendingItemMove = null;
      if (this.heldItemStorage === ItemStorageKind.Trade) {
        this.heldItemSlot = null;
      }
    });
  }

  closeNpc(): void {
    if (this.vault) {
      runInAction(() => {
        this.vault = null;
        if (this.heldItemStorage === ItemStorageKind.Vault) {
          this.heldItemSlot = null;
        }
      });
      this.talkingToNpc = null;
      this.sendToGS(VaultClosedPacket.createPacket().buffer);
      return;
    }

    if (!this.npcShop) return;
    runInAction(() => {
      this.npcShop = null;
    });
    this.sendCloseNpcRequest();
  }

  buyItem(storeSlot: number): void {
    const packet = BuyItemFromNpcRequestPacket.createPacket();
    packet.ItemSlot = storeSlot;
    this.sendToGS(packet.buffer);
  }

  sellItem(inventorySlot: number): void {
    const packet = SellItemToNpcRequestPacket.createPacket();
    packet.ItemSlot = inventorySlot;

    this.pendingSellSlot = inventorySlot;
    this.sendToGS(packet.buffer);
  }

  // NpcItemSellResult doesn't tell which item was sold
  pendingSellSlot: number | null = null;

  // After a map change the server waits for this before adding the
  // character to the new map (NPCs, monsters and players in scope).
  sendClientReadyAfterMapChange(): void {
    this.sendToGS(ClientReadyAfterMapChangePacket.createPacket().buffer);
  }

  // warpIndex is the index of the warp list in the server configuration
  warp(warpIndex: number): void {
    const packet = WarpCommandRequestPacket.createPacket();
    packet.CommandKey = 0;
    packet.WarpInfoIndex = warpIndex;

    this.sendToGS(packet.buffer);
  }

  private areaSkillCounter = 0;

  // Area skill on the tile (x, y), direction 0-7 like walking. The hits are
  // declared afterwards with AreaSkillHit (see AreaSkillHitSystem), which
  // refers to the animation counter sent here.
  sendAreaSkill(skill: number, x: number, y: number, direction: number): void {
    // 0 is not a valid reference for the hits
    this.areaSkillCounter = (this.areaSkillCounter % 255) + 1;

    const packet = AreaSkillPacket.createPacket();
    packet.SkillId = skill;
    packet.TargetX = x;
    packet.TargetY = y;
    // the original client sends the looking angle scaled to a byte
    packet.Rotation = (direction * 32) & 0xff;
    packet.ExtraTargetId = 0;
    packet.AnimationCounter = this.areaSkillCounter;

    this.sendToGS(packet.buffer);
    EventBus.emit('areaSkillCast', {
      skill,
      x,
      y,
      animationCounter: this.areaSkillCounter,
    });
  }

  sendAreaSkillHit(
    skill: number,
    x: number,
    y: number,
    hitCounter: number,
    targetIds: number[],
    animationCounter: number
  ): void {
    // header (9) + [target id (2), animation counter (1)] per target
    const TARGETS_OFFSET = 9;
    const TARGET_SIZE = 3;
    const packet = AreaSkillHitPacket.createPacket(
      TARGETS_OFFSET + TARGET_SIZE * targetIds.length
    );
    packet.SkillId = skill;
    packet.TargetX = x;
    packet.TargetY = y;
    packet.HitCounter = hitCounter & 0xff;
    packet.TargetCount = targetIds.length;

    targetIds.forEach((id, i) => {
      const offset = TARGETS_OFFSET + i * TARGET_SIZE;
      packet.buffer.setUint16(offset, id, false);
      packet.buffer.setUint8(offset + 2, animationCounter);
    });

    this.sendToGS(packet.buffer);
  }

  selectSkill(skill: number | null): void {
    runInAction(() => {
      this.currentSkill = skill;
    });
  }

  cancelHeldItem(): void {
    runInAction(() => {
      this.heldItemSlot = null;
    });
  }

  // Drop the item of an inventory slot on the ground tile (x, y).
  dropItem(slot: number, x: number, y: number): void {
    this.cancelHeldItem();

    const packet = DropItemRequestPacket.createPacket();
    packet.ItemSlot = slot;
    packet.TargetX = x;
    packet.TargetY = y;

    this.sendToGS(packet.buffer);
  }

  moveItem(
    from: number,
    to: number,
    fromStorage: ItemStorageKind = ItemStorageKind.Inventory,
    toStorage: ItemStorageKind = ItemStorageKind.Inventory
  ): void {
    const item = this.itemsOf(fromStorage)[from];
    if (!item?.raw || this.pendingItemMove) return;

    // items can't be moved into / out of the trade while it is accepted
    const trade = ItemStorageKind.Trade;
    if (fromStorage === trade || toStorage === trade) {
      this.setTradeAccept(false);
    }

    const packet = ItemMoveRequestPacket.createPacket();
    packet.FromStorage = fromStorage;
    packet.FromSlot = from;
    packet.setItemData(item.raw, item.raw.length);
    packet.ToStorage = toStorage;
    packet.ToSlot = to;

    this.pendingItemMove = { from, to, fromStorage, toStorage };
    this.sendToGS(packet.buffer);
  }

  // targetSlot: the item a jewel is used on
  consumeItem(slot: number, targetSlot = 0): void {
    const packet = ConsumeItemRequestPacket.createPacket();
    packet.ItemSlot = slot;
    packet.TargetSlot = targetSlot;

    this.sendToGS(packet.buffer);
  }

  sendPickupRequest(itemId: number): void {
    const packet = PickupItemRequestPacket.createPacket();
    packet.ItemId = itemId;

    this.sendToGS(packet.buffer);
  }

  sendWalkPath(x: number, y: number, dirs: number[]): void {
    const packet = WalkRequestPacket.createPacket(6 + dirs.length);
    packet.SourceX = x;
    packet.SourceY = y;
    packet.StepCount = dirs.length;

    function SetStepData(steps: number[], stepsSize: number) {
      if (stepsSize === 0) return;

      const result = new Array<number>(stepsSize);

      result[0] = ((steps[0] << 4) | stepsSize) & 0xff;
      for (let i = 0; i < stepsSize - 1; i += 2) {
        const index = 1 + i / 2;
        const firstStep = steps[i];
        const secondStep = steps.length > i + 1 ? steps[i + 1] : 0;
        result[index] = ((firstStep << 4) | secondStep) & 0xff;
      }

      return result;
    }

    const newDirs = SetStepData(dirs, dirs.length);
    if (!newDirs) return;

    packet.setDirections(newDirs, newDirs.length);

    this.sendToGS(packet.buffer);

    // console.log(
    //   `send walk path from [${x}, ${y}] steps: ${newDirs.join('->')}`
    // );
  }
})();
