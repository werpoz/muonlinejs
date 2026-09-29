import './style.less';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { Store } from '../../../../../store';
import { ItemIcon } from '../../../../components/itemIcon';
import { MuWindow } from '../../../../components/muWindow';
import { ItemsDatabase } from '../../../../../common/itemsDatabase';
import { ItemStorageKind } from '../../../../../common/itemStorageKind';
import { Item } from '../../../../../ecs/world';
import { useEventBus } from '../../../../../hooks/useEventBus';

// each side of the trade: 8x4 cells of 20px
const COLUMNS = 8;
const ROWS = 4;
const CELL = 20;
const GRID_X = 15;
const PARTNER_GRID_Y = 50;
const MY_GRID_Y = 178;

const TRADE = ItemStorageKind.Trade;

const itemName = (item: Item) =>
  (ItemsDatabase.getItem(item.group, item.num)?.ItemName ?? 'Item') +
  (item.lvl ? ` +${item.lvl}` : '');

const formatZen = (money: number) => `${money.toLocaleString('en-US')} Zen`;

// Items of one side. Our side can be clicked like the inventory: pick an item
// up and put it in a cell of the trade or of the inventory.
const TradeGrid = observer(
  ({
    items,
    top,
    mine,
  }: {
    items: (Item | null)[];
    top: number;
    mine: boolean;
  }) => {
    const onClick = mine
      ? (slot: number) => Store.onItemSlotClick(slot, TRADE)
      : undefined;

    return (
      <>
        <div
          className="trade-grid"
          style={{
            left: GRID_X,
            top,
            width: COLUMNS * CELL,
            height: ROWS * CELL,
          }}
        >
          {items.map((_, slot) => (
            <div
              key={slot}
              className={`trade-cell${mine ? ' mine' : ''}`}
              onClick={() => onClick?.(slot)}
            />
          ))}
        </div>

        {items.map((item, slot) => {
          if (!item) return null;
          const config = ItemsDatabase.getItem(item.group, item.num);
          const held =
            mine &&
            Store.heldItemSlot === slot &&
            Store.heldItemStorage === TRADE;

          return (
            <div
              key={slot}
              className={`trade-item${mine ? ' mine' : ''}${held ? ' held' : ''}`}
              title={itemName(item)}
              style={{
                left: GRID_X + (slot % COLUMNS) * CELL,
                top: top + Math.floor(slot / COLUMNS) * CELL,
                width: (config?.X ?? 1) * CELL,
                height: (config?.Y ?? 1) * CELL,
              }}
              onClick={() => onClick?.(slot)}
            >
              <ItemIcon {...item} />
            </div>
          );
        })}
      </>
    );
  }
);

// Trade with another player: the partner's offer at the top, ours below.
// The trade is done when both players press the accept button.
export const Trade = observer(() => {
  const [amount, setAmount] = useState('');
  const trade = Store.trade;

  useEventBus('keyPressed', key => {
    if (key === 'Escape') Store.cancelTrade();
  });

  if (!trade) return null;

  const setMoney = () => {
    const value = Math.floor(Number(amount || 0));
    if (!(value >= 0) || value > Store.playerData.money + trade.myMoney) {
      Store.addNotification('Not enough zen', 'error');
      return;
    }
    Store.setTradeMoney(value);
    setAmount('');
  };

  return (
    <MuWindow
      title="Trade"
      subtitle={`${trade.partner} (Lv. ${trade.partnerLevel})`}
      className="trade"
      onClose={() => Store.cancelTrade()}
    >
      <TradeGrid items={trade.partnerItems} top={PARTNER_GRID_Y} mine={false} />
      <div className="trade-money partner">{formatZen(trade.partnerMoney)}</div>
      <div
        className={`trade-state${trade.partnerAccept ? ' accepted' : ''}`}
        style={{ top: 152 }}
      >
        {trade.partnerAccept ? `${trade.partner} accepted` : 'Not accepted'}
      </div>

      <div className="trade-divider">Your offer</div>

      <TradeGrid items={trade.myItems} top={MY_GRID_Y} mine />
      <div className="trade-money mine">{formatZen(trade.myMoney)}</div>

      <input
        className="trade-money-input"
        value={amount}
        placeholder="Zen"
        inputMode="numeric"
        onChange={e => setAmount(e.target.value.replace(/\D/g, ''))}
        onKeyDown={e => e.key === 'Enter' && setMoney()}
      />
      <button
        className="trade-button money"
        title="Put zen in the trade"
        onClick={setMoney}
      />
      <button
        className={`trade-button accept${trade.myAccept ? ' pressed' : ''}`}
        title={trade.myAccept ? 'Release the accept button' : 'Accept'}
        onClick={() => Store.setTradeAccept(!trade.myAccept)}
      />
      <div
        className={`trade-state${trade.myAccept ? ' accepted' : ''}`}
        style={{ top: 322 }}
      >
        {trade.myAccept
          ? trade.partnerAccept
            ? 'Trading...'
            : `Waiting for ${trade.partner}`
          : 'Press accept to trade'}
      </div>
    </MuWindow>
  );
});

// Dialog to answer a trade request of another player
export const TradeRequestDialog = observer(() => {
  const from = Store.tradeRequestFrom;
  if (!from) return null;

  return (
    <div className="trade-request">
      <div className="text">
        <b>{from}</b> wants to trade with you
      </div>
      <div className="buttons">
        <button
          className="dialog-button ok"
          title="Accept"
          onClick={() => Store.answerTradeRequest(true)}
        />
        <button
          className="dialog-button cancel"
          title="Decline"
          onClick={() => Store.answerTradeRequest(false)}
        />
      </div>
    </div>
  );
});
