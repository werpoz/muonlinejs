import './style.less';
import { observer } from 'mobx-react-lite';
import { WorldObjects } from '../../components/worldObjects';
import { DamageNumbers } from '../../components/damageNumbers';
import { HeldItem } from '../../components/heldItem';
import { ItemTooltip } from '../../components/itemTooltip';
import { MapsList } from './components/mapsList';
import { BottomBar } from './components/bottomBar';
import { CharacterInfo } from './components/characterInfo';
import { Inventory } from './components/inventory';
import { Chat } from './components/chat';
import { NpcShop } from './components/npcShop';
import { Vault } from './components/vault';
import { ChaosMachine } from './components/chaosMachine';
import { Friends, FriendRequestDialog } from './components/friends';
import { Trade, TradeRequestDialog } from './components/trade';
import { PartyFrame, PartyRequestDialog } from './components/party';

const HUD = observer(() => {
  return (
    <div className="hud">
      <BottomBar />
      <div className="panels-stack">
        <NpcShop />
        <Vault />
        <ChaosMachine />
        <Trade />
        <Inventory />
        <CharacterInfo />
        <Friends />
      </div>
      <MapsList />
      <Chat />
      <TradeRequestDialog />
      <PartyRequestDialog />
      <FriendRequestDialog />
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
