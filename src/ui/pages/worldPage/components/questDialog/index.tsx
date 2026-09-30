import './style.less';
import { observer } from 'mobx-react-lite';
import { Store } from '../../../../../store';
import { useEventBus } from '../../../../../hooks/useEventBus';
import {
  LegacyQuestState,
  canDoQuest,
  hasQuestItem,
  legacyQuest,
  questItemsFor,
} from '../../../../../common/legacyQuests';

const zen = (money: number) => `${money.toLocaleString('en-US')} Zen`;

// ok undefined: an objective of a quest not accepted yet
const Check = ({ ok, children }: { ok?: boolean; children: React.ReactNode }) => (
  <div className={`requirement ${ok === undefined ? 'goal' : ok ? 'ok' : 'missing'}`}>
    <span className="mark">{ok === undefined ? '•' : ok ? '✓' : '✗'}</span>
    {children}
  </div>
);

// Quest of Sevina, Marlon or Priest Devin (class changes): what to do,
// the requirements with what we have, and accept / hand in.
export const QuestDialog = observer(() => {
  const dialog = Store.questDialog;

  useEventBus('keyPressed', key => {
    if (key === 'Escape' && Store.questDialog) Store.closeQuestDialog();
  });

  if (!dialog) return null;

  const quest = legacyQuest(dialog.questNumber);
  const npcName = Store.npcName(dialog.npcId);
  const d = Store.playerData;
  const cls = Store.world?.playerEntity?.charAppearance?.charClass;

  if (!quest) {
    return (
      <div className="quest-dialog">
        <div className="name">{npcName}</div>
        <div className="text">I have no quest for you.</div>
        <div className="buttons">
          <button className="text-button" onClick={() => Store.closeQuestDialog()}>
            Close
          </button>
        </div>
      </div>
    );
  }

  const state = dialog.state;
  const active = state === LegacyQuestState.Active;
  const done = state === LegacyQuestState.Complete;
  const items = questItemsFor(quest, cls);
  const inventory = d.items;
  const hasItems = items.every(i => hasQuestItem(inventory, i));
  const kills = quest.kills ?? [];
  const killsDone = kills.every(k => (Store.questKills.get(k.monster) ?? 0) >= k.count);
  const levelOk = d.level >= quest.level;
  const moneyOk = d.money >= quest.money;
  const classOk = canDoQuest(quest, cls);

  return (
    <div className="quest-dialog">
      <div className="name">{npcName}</div>
      <div className="quest-name">{quest.name}</div>
      <div className="text">
        {done ? 'You already completed this quest.' : quest.text}
      </div>

      {!done && (
        <div className="section">
          <div className="title">{active ? 'Progress' : 'Requirements and goal'}</div>
          {!active && (
            <>
              {!classOk && <Check ok={false}>Not for your class</Check>}
              <Check ok={levelOk}>Level {quest.level}</Check>
              <Check ok={moneyOk}>{zen(quest.money)}</Check>
            </>
          )}
          {items.map(i => (
            <Check key={`${i.num}/${i.lvl}`} ok={active ? hasQuestItem(inventory, i) : undefined}>
              Bring the {i.name}
            </Check>
          ))}
          {kills.map(k => {
            const count = Math.min(Store.questKills.get(k.monster) ?? 0, k.count);
            return (
              <Check key={k.monster} ok={active ? count >= k.count : undefined}>
                Defeat {k.name} {active ? `${count} / ${k.count}` : `x${k.count}`}
              </Check>
            );
          })}
          <div className="hint">{quest.hint}</div>
        </div>
      )}

      {!done && (
        <div className="section">
          <div className="title">Rewards</div>
          {quest.rewards.map(r => (
            <div key={r} className="reward">
              {r}
            </div>
          ))}
        </div>
      )}

      <div className="buttons">
        {!done && !active && (
          <button
            className="text-button"
            disabled={!levelOk || !moneyOk || !classOk}
            onClick={() => Store.setQuestState(quest.number, LegacyQuestState.Active)}
          >
            Accept
          </button>
        )}
        {active && (
          <button
            className="text-button"
            disabled={!hasItems || !killsDone}
            title={hasItems && killsDone ? undefined : 'The quest is not finished yet'}
            onClick={() => Store.setQuestState(quest.number, LegacyQuestState.Complete)}
          >
            Hand in
          </button>
        )}
        <button className="text-button" onClick={() => Store.closeQuestDialog()}>
          Close
        </button>
      </div>
    </div>
  );
});
