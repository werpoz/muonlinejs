import './style.less';
import { observer } from 'mobx-react-lite';
import { Store } from '../../../../../store';
import { RequestDialog } from '../../../../components/requestDialog';

// hp bar of the original client: 10 segments of 69x3 px
const HP_BAR_WIDTH = 69;

// Party members at the top right, like the original client: name, health
// (in tenths) and a flag on the leader. The leader can kick anyone and every
// member can leave with the X on its own box.
export const PartyFrame = observer(() => {
  const party = Store.party;
  if (!party) return null;

  const me = Store.characterName;
  const leader = party[0]?.name;
  const myMapId = party.find(m => m.name === me)?.mapId;

  return (
    <div className="party-frame">
      {party.map(member => {
        const isMe = member.name === me;
        const canKick = isMe || leader === me;
        const otherMap = member.mapId !== myMapId;

        return (
          <div
            key={member.index}
            className={`party-member${isMe ? ' me' : ''}${otherMap ? ' far' : ''}`}
            title={otherMap ? `${member.name} is in another map` : member.name}
          >
            {member.name === leader && <span className="flag" />}
            <span className="name">{member.name}</span>
            <div
              className="hp"
              style={{ width: Math.round((HP_BAR_WIDTH * member.health) / 10) }}
            />
            {canKick && (
              <button
                className="kick"
                title={isMe ? 'Leave the party' : `Kick ${member.name}`}
                onClick={() =>
                  isMe ? Store.leaveParty() : Store.kickFromParty(member.index)
                }
              />
            )}
          </div>
        );
      })}
    </div>
  );
});

// Dialog to answer a party invitation
export const PartyRequestDialog = observer(() => {
  const from = Store.partyRequestFrom;
  if (!from) return null;

  return (
    <RequestDialog onAnswer={accept => Store.answerPartyRequest(accept)}>
      <b>{from.name}</b> invites you to a party
    </RequestDialog>
  );
});
