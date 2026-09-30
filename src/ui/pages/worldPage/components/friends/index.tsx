import './style.less';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { Store, isFriendOnline } from '../../../../../store';
import { MuWindow } from '../../../../components/muWindow';
import { RequestDialog } from '../../../../components/requestDialog';
import { useEventBus } from '../../../../../hooks/useEventBus';

// character names are up to 10 characters
const MAX_NAME_LENGTH = 10;

export const toggleFriends = () => {
  Store.friendsEnabled = !Store.friendsEnabled;
};

// Friend list of the messenger (F): online state, whisper and delete; add a
// friend by name. Online friends first.
export const Friends = observer(() => {
  const [name, setName] = useState('');

  useEventBus('keyPressed', key => {
    if (key === 'KeyF') toggleFriends();
  });

  if (!Store.friendsEnabled) return null;

  const friends = [...Store.friends].sort(
    (a, b) =>
      Number(isFriendOnline(b)) - Number(isFriendOnline(a)) ||
      a.name.localeCompare(b.name)
  );

  const add = () => {
    const friendName = name.trim();
    if (!friendName) return;
    Store.addFriend(friendName);
    setName('');
  };

  return (
    <MuWindow
      title="Friends"
      subtitle={`${friends.filter(isFriendOnline).length} / ${friends.length} online`}
      className="friends"
      onClose={toggleFriends}
    >
      <div className="friend-list">
        {!friends.length && <div className="empty">No friends yet</div>}
        {friends.map(friend => {
          const online = isFriendOnline(friend);
          return (
            <div
              key={friend.name}
              className={`friend${online ? ' online' : ''}`}
            >
              <span className="state" title={online ? 'Online' : 'Offline'} />
              <span className="name">{friend.name}</span>
              <button
                className="small-button"
                title={`Whisper to ${friend.name}`}
                disabled={!online}
                onClick={() => Store.openChat(`/w ${friend.name} `)}
              >
                W
              </button>
              <button
                className="small-button"
                title={`Delete ${friend.name}`}
                onClick={() => Store.deleteFriend(friend.name)}
              >
                X
              </button>
            </div>
          );
        })}
      </div>

      <div className="friend-add">
        <input
          value={name}
          placeholder="Character name"
          maxLength={MAX_NAME_LENGTH}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
        />
        <button className="small-button" onClick={add}>
          Add
        </button>
      </div>
    </MuWindow>
  );
});

// Dialog to answer a friend request
export const FriendRequestDialog = observer(() => {
  const from = Store.friendRequestFrom;
  if (!from) return null;

  return (
    <RequestDialog onAnswer={accept => Store.answerFriendRequest(accept)}>
      <b>{from}</b> wants to add you as a friend
    </RequestDialog>
  );
});
