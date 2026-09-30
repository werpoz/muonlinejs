import './style.less';
import { observer } from 'mobx-react-lite';
import { WorldObjects } from '../../components/worldObjects';
import { DamageNumbers } from '../../components/damageNumbers';
import { HeldItem } from '../../components/heldItem';
import { ItemTooltip } from '../../components/itemTooltip';
import { MapsList } from './components/mapsList';
import { Options } from './components/options';
import { Minimap } from './components/minimap';
import { BottomBar } from './components/bottomBar';
import { CharacterInfo } from './components/characterInfo';
import { Inventory } from './components/inventory';
import { Chat } from './components/chat';
import { NpcShop } from './components/npcShop';
import { Vault } from './components/vault';
import { ChaosMachine } from './components/chaosMachine';
import { Friends, FriendRequestDialog } from './components/friends';
import {
  Guild,
  GuildCreation,
  GuildJoinDialog,
  GuildMasterDialog,
} from './components/guild';
import { Trade, TradeRequestDialog } from './components/trade';
import { PartyFrame, PartyRequestDialog } from './components/party';
import { PersonalShop, ViewedShop } from './components/playerShop';
import { NpcDialog } from './components/npcDialog';
import { QuestDialog } from './components/questDialog';
import { BuffIcons } from './components/buffIcons';
import { Lahap } from './components/lahap';
import { DuelHud, DuelRequestDialog, DuelRooms } from './components/duel';
import { MiniGameEntry, MiniGameHud, MiniGameScore } from './components/miniGame';

const HUD = observer(() => {
  return (
    <div className="hud">
      <BottomBar />
      <div className="panels-stack">
        <NpcShop />
        <Vault />
        <ChaosMachine />
        <Lahap />
        <DuelRooms />
        <MiniGameEntry />
        <Trade />
        <ViewedShop />
        <PersonalShop />
        <Inventory />
        <CharacterInfo />
        <Friends />
        <Options />
        <Guild />
        <GuildCreation />
      </div>
      <MapsList />
      <Minimap />
      <Chat />
      <BuffIcons />
      <MiniGameHud />
      <DuelHud />
      <DuelRequestDialog />
      <MiniGameScore />
      <NpcDialog />
      <QuestDialog />
      <TradeRequestDialog />
      <PartyRequestDialog />
      <FriendRequestDialog />
      <GuildMasterDialog />
      <GuildJoinDialog />
      <PartyFrame />
    </div>
  );
});

export const WorldPage = observer(() => {
  return (
    <div className="world-page">
      <WorldObjects />
      <DamageNumbers />
      <HeldItem />
      <ItemTooltip />
      <HUD />
    </div>
  );
});
