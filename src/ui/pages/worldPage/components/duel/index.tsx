import './style.less';
import { observer } from 'mobx-react-lite';
import { Store } from '../../../../../store';
import { MuWindow } from '../../../../components/muWindow';
import { RequestDialog } from '../../../../components/requestDialog';

// OpenMU's duel configuration (DuelConfiguration)
const DUEL_FEE = 30_000;
const DUEL_MAX_SCORE = 10;

export const DuelRequestDialog = observer(() => {
  const from = Store.duelRequestFrom;
  if (!from) return null;

  return (
    <RequestDialog onAnswer={accept => Store.answerDuelRequest(accept)}>
      <b>{from.name}</b> challenges you to a duel ({DUEL_FEE.toLocaleString('en-US')} Zen)
    </RequestDialog>
  );
});

const Bar = ({ value, kind }: { value: number | null; kind: 'hp' | 'sd' }) => (
  <div className={`bar ${kind}${value === null ? ' unknown' : ''}`}>
    <div className="fill" style={{ width: `${Math.max(0, Math.min(100, value ?? 0))}%` }} />
  </div>
);

const percent = (current: number, max: number) => (max > 0 ? (current * 100) / max : 0);

// score, health and shield of both players; leave / stop watching
export const DuelHud = observer(() => {
  const duel = Store.duel;
  const result = Store.duelResult;
  if (!duel) return null;

  // OpenMU sends the health of the duel only to the spectators: ours comes
  // from our stats, the one of the opponent stays unknown
  const { playerData } = Store;
  const [a, b] = duel.players.map(pl =>
    pl.id === Store.playerId && !duel.spectator
      ? {
          ...pl,
          hp: percent(playerData.currentHP, playerData.maxHP),
          sd: percent(playerData.currentSD, playerData.maxSD),
        }
      : pl
  );

  return (
    <div className="duel-hud">
      <div className="title">
        Duel {duel.room + 1}
        {duel.spectator && <span className="watching"> (watching)</span>}
      </div>
      <div className="players">
        {[a, b].map((pl, i) => (
          <div key={pl.id} className={`player ${i ? 'right' : 'left'}${pl.id === Store.playerId ? ' me' : ''}`}>
            <div className="name" title={pl.hp === null ? 'The server sends the health only to the spectators' : undefined}>
              {pl.name}
            </div>
            <Bar value={pl.hp} kind="hp" />
            <Bar value={pl.sd} kind="sd" />
          </div>
        ))}
        <div className="score">
          {a.score} : {b.score}
        </div>
      </div>
      <div className="goal">First to {DUEL_MAX_SCORE} points wins</div>
      {result && (
        <div className="result">
          {result.winner} won the duel!
        </div>
      )}
      {!!duel.spectators.length && (
        <div className="spectators" title={duel.spectators.join(', ')}>
          {duel.spectators.length} watching
        </div>
      )}
      <button className="text-button" onClick={() => Store.leaveDuel()}>
        {duel.spectator ? 'Stop watching' : 'Leave the duel'}
      </button>
    </div>
  );
});

// Gatekeeper Titus: duels running in the rooms of the Duel Arena
export const DuelRooms = observer(() => {
  const rooms = Store.duelRooms;
  if (!rooms) return null;

  return (
    <MuWindow title="Duel Arena" subtitle="Gatekeeper Titus" className="duel-rooms" onClose={() => Store.closeDuelRooms()}>
      <div className="rooms">
        {!rooms.length && <div className="empty">Asking for the duels...</div>}
        {rooms.map((room, i) => (
          <div key={i} className={`room${room.running ? ' running' : ''}`}>
            <div className="room-name">Room {i + 1}</div>
            <div className="room-players">
              {room.running ? `${room.players[0]} vs ${room.players[1]}` : 'Empty'}
            </div>
            <button
              className="small-button"
              disabled={!room.running || !room.open}
              title={!room.running ? 'No duel in this room' : !room.open ? 'The room is full' : undefined}
              onClick={() => Store.watchDuel(i)}
            >
              Watch
            </button>
          </div>
        ))}
      </div>
      <div className="note">
        Challenge a player with /duel name. Both need level 30 and {DUEL_FEE.toLocaleString('en-US')} Zen.
      </div>
    </MuWindow>
  );
});
