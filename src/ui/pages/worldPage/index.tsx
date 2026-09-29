import './style.less';
import { observer } from 'mobx-react-lite';
import { WorldObjects } from '../../components/worldObjects';
import { DamageNumbers } from '../../components/damageNumbers';
import { HeldItem } from '../../components/heldItem';
import { MapsList } from './components/mapsList';
import { BottomBar } from './components/bottomBar';
import { CharacterInfo } from './components/characterInfo';
import { Inventory } from './components/inventory';
import { Chat } from './components/chat';
import { NpcShop } from './components/npcShop';
import { Vault } from './components/vault';
import { Trade, TradeRequestDialog } from './components/trade';

const HUD = observer(() => {
  return (
    <div className="hud">
      <BottomBar />
      <div className="panels-stack">
        <NpcShop />
        <Vault />
        <Trade />
        <Inventory />
        <CharacterInfo />
      </div>
      <MapsList />
      <Chat />
      <TradeRequestDialog />
    </div>
  );
});

export const WorldPage = observer(() => {
  return (
    <div className="world-page">
      <WorldObjects />
      <DamageNumbers />
      <HeldItem />
      <HUD />
    </div>
  );
});
