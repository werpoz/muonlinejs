import './style.less';
import { runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useEffect, useState } from 'react';
import { Store } from '../../../../../store';
import { MuWindow } from '../../../../components/muWindow';
import { InventoryConstants } from '../../../../../common/inventoryConstants';
import { BloodCastleStateStatusEnum } from '../../../../../common/packets/ServerToClientPackets';
import {
  MINI_GAMES,
  canEnterLevel,
  levelRange,
  suitableLevel,
  ticketsOf,
} from '../../../../../common/miniGames';

const FIRST_INVENTORY_SLOT = InventoryConstants.LastEquippableItemSlotIndex + 1;
// OpenMU sends 0xFF when there is no timetable
const NO_TIMETABLE = 0xff;

const clock = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

// Charon (Devil Square) / Messenger of Archangel (Blood Castle): the
// levels of the game, the one of the character, its tickets and when the
// entrance opens
export const MiniGameEntry = observer(() => {
  const kind = Store.miniGameEntry;
  const d = Store.playerData;
  const cls = Store.world?.playerEntity?.charAppearance?.charClass;
  const suitable = kind ? suitableLevel(kind, cls, d.level) : undefined;

  useEffect(() => {
    if (kind && suitable) Store.requestMiniGameOpening(kind, suitable.level);
  }, [kind, suitable?.level]);

  if (!kind) return null;

  const game = MINI_GAMES[kind];
  const tickets = ticketsOf(kind, d.items.slice(0, FIRST_INVENTORY_SLOT + 64), FIRST_INVENTORY_SLOT);
  const opening = Store.miniGameOpening?.kind === kind ? Store.miniGameOpening : null;

  let openingText = 'Asking when the entrance opens...';
  if (opening) {
    openingText =
      opening.minutes === 0
        ? `The entrance is open! (${opening.players} players)`
        : opening.minutes === NO_TIMETABLE
          ? 'The game has no timetable'
          : `The entrance opens in ${opening.minutes} minute${opening.minutes === 1 ? '' : 's'}`;
  }

  return (
    <MuWindow title={game.name} subtitle={`Ticket: ${game.ticket.name}`} className="mini-game-entry" onClose={() => Store.closeNpc()}>
      <div className="entry-content">
        <div className={`opening${opening?.minutes === 0 ? ' open' : ''}`}>{openingText}</div>
        <div className="levels">
          {game.levels.map(l => {
            const [min, max] = levelRange(l, cls);
            const ticket = tickets.find(t => t.level === l.level);
            const mine = canEnterLevel(l, cls, d.level);
            return (
              <div key={l.level} className={`level-row${mine ? ' mine' : ''}`}>
                <span className="level-name">
                  {game.name} {l.level}
                </span>
                <span className="level-range">
                  {l.masterClass ? '3rd class' : `${min}-${max}`}
                </span>
                <span className={`ticket${ticket ? ' have' : ''}`} title={`${game.ticket.name} +${l.level}`}>
                  {ticket ? '✓' : '—'}
                </span>
                <button
                  className="small-button"
                  disabled={!mine || !ticket}
                  title={
                    !mine
                      ? 'Not for your level'
                      : !ticket
                        ? `You need a ${game.ticket.name} +${l.level}`
                        : undefined
                  }
                  onClick={() => ticket && Store.enterMiniGame(kind, l.level, ticket.slot)}
                >
                  Enter
                </button>
              </div>
            );
          })}
        </div>
        <div className="note">
          {suitable
            ? `Your level fits ${game.name} ${suitable.level}.`
            : `There is no ${game.name} for your level.`}{' '}
          The entrance is open a short time before each game; a game lasts{' '}
          {game.duration} minutes.
        </div>
      </div>
    </MuWindow>
  );
});

// what to do in each phase of Blood Castle
function bloodCastleGoal(game: NonNullable<typeof Store.miniGame>): string | undefined {
  const Status = BloodCastleStateStatusEnum;
  const monstersLeft = game.monsters && game.monsters.current < game.monsters.max;
  switch (game.status) {
    case Status.BloodCastleStarted:
      return 'The bridge opens soon';
    case Status.BloodCastleGateNotDestroyed:
      return monstersLeft ? 'Defeat the monsters to open the bridge' : 'Destroy the castle gate';
    case Status.BloodCastleGateDestroyed:
      if (game.itemOwner) return 'Take the weapon to the Archangel';
      return monstersLeft
        ? 'Defeat the magic skeletons'
        : 'Break the statue and take the weapon';
    case Status.BloodCastleEnded:
      return 'The game has ended';
  }
  return undefined;
}

// time left and monsters of the game we are in
export const MiniGameHud = observer(() => {
  const game = Store.miniGame;
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!game) return;
    const timer = setInterval(() => setTick(t => t + 1), 500);
    return () => clearInterval(timer);
  }, [!!game]);

  if (!game) return null;

  const info = MINI_GAMES[game.kind];
  const left =
    game.remaining != null && game.remainingAt != null
      ? game.remaining - (performance.now() - game.remainingAt) / 1000
      : null;
  const status = game.kind === 'BloodCastle' ? bloodCastleGoal(game) : undefined;

  return (
    <div className="mini-game-hud">
      <div className="title">
        {info.name} {game.level || ''}
      </div>
      {left != null ? <div className="time">{clock(left)}</div> : <div className="waiting">Waiting for the start...</div>}
      {game.monsters && game.monsters.max > 0 && (
        <div className="monsters">
          Monsters {game.monsters.current} / {game.monsters.max}
        </div>
      )}
      {status && <div className="status">{status}</div>}
      {game.itemOwner && <div className="owner">{game.itemOwner} carries the weapon</div>}
    </div>
  );
});

// scores when a game ends
export const MiniGameScore = observer(() => {
  const score = Store.miniGameScore;
  if (!score) return null;

  const close = () =>
    runInAction(() => {
      Store.miniGameScore = null;
    });

  return (
    <div className="mini-game-score">
      <div className="title">
        {MINI_GAMES[score.kind].name}
        {score.success !== undefined && (
          <span className={score.success ? 'success' : 'failed'}>
            {score.success ? ' — Success!' : ' — Failed'}
          </span>
        )}
      </div>
      {score.rank !== undefined && <div className="rank">Your rank: {score.rank}</div>}
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Score</th>
            <th>Experience</th>
            <th>Zen</th>
          </tr>
        </thead>
        <tbody>
          {score.rows.map((r, i) => (
            <tr key={i}>
              <td>{r.name}</td>
              <td>{r.score.toLocaleString('en-US')}</td>
              <td>{r.experience.toLocaleString('en-US')}</td>
              <td>{r.money.toLocaleString('en-US')}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="buttons">
        <button className="text-button" onClick={close}>
          Close
        </button>
      </div>
    </div>
  );
});
