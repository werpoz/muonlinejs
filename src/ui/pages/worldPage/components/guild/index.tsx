import './style.less';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import {
  EMBLEM_SIZE,
  GUILD_COLORS,
  GuildRole,
  Store,
} from '../../../../../store';
import { MuWindow } from '../../../../components/muWindow';
import { RequestDialog } from '../../../../components/requestDialog';
import { useEventBus } from '../../../../../hooks/useEventBus';

const OFFLINE = 0xff;
const MAX_GUILD_NAME = 8;

const ROLE_NAMES: Partial<Record<GuildRole, string>> = {
  [GuildRole.GuildMaster]: 'Guild Master',
  [GuildRole.BattleMaster]: 'Battle Master',
};

// 8x8 emblem of a guild
export const GuildEmblem = ({
  colors,
  size,
  onPaint,
}: {
  colors: number[];
  size: number;
  onPaint?: (index: number) => void;
}) => (
  <div
    className={`guild-emblem${onPaint ? ' editable' : ''}`}
    style={{ width: size, height: size }}
  >
    {colors.map((color, i) => (
      <div
        key={i}
        style={{ background: GUILD_COLORS[color] }}
        onPointerDown={() => onPaint?.(i)}
        onPointerEnter={e => e.buttons === 1 && onPaint?.(i)}
      />
    ))}
  </div>
);

// Guild Master: create a guild?
export const GuildMasterDialog = observer(() => {
  if (!Store.guildMasterDialog) return null;
  return (
    <RequestDialog onAnswer={create => Store.answerGuildMaster(create)}>
      Do you want to create a guild?
    </RequestDialog>
  );
});

// Name and emblem of the new guild
export const GuildCreation = observer(() => {
  const [name, setName] = useState('');
  const [color, setColor] = useState(3);
  const [emblem, setEmblem] = useState<number[]>(() =>
    new Array(EMBLEM_SIZE * EMBLEM_SIZE).fill(0)
  );

  if (!Store.guildCreationOpen) return null;

  const paint = (index: number) =>
    setEmblem(old => old.map((c, i) => (i === index ? color : c)));

  const create = () => {
    const guildName = name.trim();
    if (guildName.length < 2) {
      Store.addNotification('The guild name needs 2 to 8 characters', 'error');
      return;
    }
    if (emblem.every(c => c === 0)) {
      Store.addNotification('Paint the guild emblem', 'error');
      return;
    }
    Store.createGuild(guildName, emblem);
  };

  return (
    <MuWindow
      title="Create Guild"
      className="guild-creation"
      onClose={() => Store.cancelGuildCreation()}
    >
      <label className="guild-name">
        Name
        <input
          value={name}
          maxLength={MAX_GUILD_NAME}
          onChange={e => setName(e.target.value.replace(/\s/g, ''))}
        />
      </label>

      <div className="emblem-editor">
        <GuildEmblem colors={emblem} size={128} onPaint={paint} />
      </div>

      <div className="palette">
        {GUILD_COLORS.map((c, i) => (
          <div
            key={i}
            className={`swatch${i === color ? ' selected' : ''}${i === 0 ? ' eraser' : ''}`}
            style={{ background: c }}
            title={i === 0 ? 'Eraser' : undefined}
            onClick={() => setColor(i)}
          />
        ))}
      </div>

      <div className="guild-buttons">
        <button className="small-button" onClick={create}>
          Create
        </button>
        <button
          className="small-button"
          onClick={() => setEmblem(emblem.map(() => 0))}
        >
          Clear
        </button>
      </div>
    </MuWindow>
  );
});

export const toggleGuild = () => {
  Store.guildEnabled = !Store.guildEnabled;
  if (Store.guildEnabled) Store.requestGuildList();
};

// Our guild (G): emblem, members with their role and online state; the
// master kicks members, anyone can leave (the master disbands the guild).
export const Guild = observer(() => {
  const [securityCode, setSecurityCode] = useState('');

  useEventBus('keyPressed', key => {
    if (key === 'KeyG') toggleGuild();
  });

  if (!Store.guildEnabled) return null;

  const members = Store.guild;
  const me = Store.characterName;
  const myRole = members?.find(m => m.name === me)?.role;
  const isMaster = myRole === GuildRole.GuildMaster;
  const guildId =
    Store.playerId != null ? Store.playerGuilds.get(Store.playerId)?.guildId : undefined;
  const info = guildId != null ? Store.guildInfos.get(guildId) : undefined;

  return (
    <MuWindow
      title={info?.name ?? 'Guild'}
      subtitle={
        members ? `${members.filter(m => m.serverId !== OFFLINE).length} / ${members.length} online` : undefined
      }
      className="guild"
      onClose={toggleGuild}
    >
      {!members && (
        <div className="no-guild">
          You are not in a guild.
          <br />
          <br />
          Talk to the Guild Master (level 100) to create one, or write
          <b> /guild name</b> near a guild master to join its guild.
        </div>
      )}

      {members && (
        <>
          {info && (
            <div className="guild-header">
              <GuildEmblem colors={info.emblem} size={48} />
            </div>
          )}
          <div className="guild-members">
            {members.map(m => {
              const online = m.serverId !== OFFLINE;
              return (
                <div key={m.name} className={`guild-member${online ? ' online' : ''}`}>
                  <span className="state" />
                  <span className="name">{m.name}</span>
                  <span className="role">{ROLE_NAMES[m.role] ?? ''}</span>
                  {isMaster && m.name !== me && (
                    <button
                      className="small-button"
                      title={`Kick ${m.name}`}
                      onClick={() => Store.kickGuildMember(m.name, securityCode)}
                    >
                      X
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <div className="guild-footer">
            <input
              value={securityCode}
              placeholder="Security code"
              title="Needed to kick or leave when the account has one"
              onChange={e => setSecurityCode(e.target.value)}
            />
            <button
              className="small-button"
              onClick={() => Store.kickGuildMember(me, securityCode)}
            >
              {isMaster ? 'Disband' : 'Leave'}
            </button>
          </div>
          <div className="guild-help">Write @text in the chat to talk to the guild</div>
        </>
      )}
    </MuWindow>
  );
});

// a player asks to join our guild
export const GuildJoinDialog = observer(() => {
  const from = Store.guildJoinRequestFrom;
  if (!from) return null;
  return (
    <RequestDialog onAnswer={accept => Store.answerGuildJoin(accept)}>
      <b>{from.name}</b> wants to join your guild
    </RequestDialog>
  );
});
