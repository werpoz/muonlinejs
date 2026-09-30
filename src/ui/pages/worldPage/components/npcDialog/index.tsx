import './style.less';
import { observer } from 'mobx-react-lite';
import { Store } from '../../../../../store';
import { useEventBus } from '../../../../../hooks/useEventBus';

// What an NPC says when it has no window of its own: a message, its
// blessing (Elf Soldier) or a feature that this client doesn't have yet
export const NpcDialog = observer(() => {
  const dialog = Store.npcDialog;

  useEventBus('keyPressed', key => {
    if (key === 'Escape' && Store.npcDialog) Store.closeNpcDialog();
  });

  if (!dialog) return null;

  return (
    <div className="npc-dialog">
      <div className="name">{dialog.name}</div>
      <div className="text">{dialog.text}</div>
      <div className="buttons">
        {dialog.buff && (
          <button className="text-button" onClick={() => Store.requestNpcBuff()}>
            Receive blessing
          </button>
        )}
        <button className="text-button" onClick={() => Store.closeNpcDialog()}>
          Close
        </button>
      </div>
    </div>
  );
});
