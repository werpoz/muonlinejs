import { useEventBus } from '../../../../../hooks/useEventBus';
import { Store } from '../../../../../store';
import { MuWindow } from '../../../../components/muWindow';
import { CharacterClassNumber } from '../../../../../common/types';
import { computeCharacterStats } from '../../../../../common/characterStats';
import './style.less';
import { observer } from 'mobx-react-lite';

enum StatType {
  Strength = 0,
  Agility = 1,
  Vitality = 2,
  Energy = 3,
}

// 'DarkKnight' -> 'Dark Knight'
const className = (cls: CharacterClassNumber | undefined) =>
  cls === undefined
    ? ''
    : (CharacterClassNumber[cls] ?? '').replace(/([a-z])([A-Z])/g, '$1 $2');

// stat box of the original window (170x21 text box with the level-up button)
const Stat = observer(
  ({
    y,
    label,
    value,
    stat,
    details,
  }: {
    y: number;
    label: string;
    value: number;
    stat: StatType;
    details?: string[];
  }) => (
    <>
      <div className="stat" style={{ top: y }}>
        <span className="label">{label}</span>
        <span className="value">{value}</span>
        {Store.playerData.points > 0 && (
          <button
            className="add-point"
            title="Add a point"
            onClick={() => Store.increaseStat(stat)}
          />
        )}
      </div>
      {details?.map((text, i) => (
        <span key={i} className="detail" style={{ top: y + 25 + i * 12 }}>
          {text}
        </span>
      ))}
    </>
  )
);

const HOT_KEY = `KeyC`;

export const CharacterInfo = observer(() => {
  const d = Store.playerData;

  useEventBus('keyPressed', key => {
    if (key === HOT_KEY) {
      Store.characterInfoEnabled = !Store.characterInfoEnabled;
    }
  });

  if (!Store.characterInfoEnabled) return null;

  const player = Store.world?.playerEntity;
  const stats = computeCharacterStats(
    player?.charAppearance?.charClass,
    { level: d.level, str: d.str, agi: d.agi, vit: d.sta, ene: d.eng },
    d.items
  );
  const wizardry = stats.wizardryDamage
    ? [
        `Wizardry Dmg: ${stats.wizardryDamage[0]} ~ ${stats.wizardryDamage[1]}` +
          (stats.wizardryRise ? ` (+${stats.wizardryRise}%)` : ''),
      ]
    : [];

  return (
    <MuWindow
      title={player?.objectNameInWorld ?? ''}
      subtitle={className(player?.charAppearance?.charClass)}
      className="character-info"
      onClose={() => {
        Store.characterInfoEnabled = false;
      }}
    >
      <span className="line" style={{ top: 52 }}>
        Level: {d.level}
      </span>
      {d.points > 0 && (
        <span className="line points" style={{ top: 52 }}>
          Points: {d.points}
        </span>
      )}
      <span className="line" style={{ top: 66 }}>
        Exp: {d.exp} / {d.expToNextLvl}
      </span>

      <Stat
        y={86}
        label="Strength"
        value={d.str}
        stat={StatType.Strength}
        details={[
          `Attack Dmg: ${stats.damage[0]} ~ ${stats.damage[1]}`,
          `Attack Rate: ${stats.attackRate}`,
        ]}
      />
      <Stat
        y={156}
        label="Agility"
        value={d.agi}
        stat={StatType.Agility}
        details={[
          `Defense: ${stats.defense} (Rate ${stats.defenseRate})`,
          `Attack Speed: ${stats.attackSpeed} / Magic ${stats.magicSpeed}`,
          `SD: ${d.currentSD} / ${d.maxSD}`,
        ]}
      />
      <Stat
        y={238}
        label="Vitality"
        value={d.sta}
        stat={StatType.Vitality}
        details={[`HP: ${d.currentHP} / ${d.maxHP}`]}
      />
      <Stat
        y={284}
        label="Energy"
        value={d.eng}
        stat={StatType.Energy}
        details={[
          `Mana: ${d.currentMP} / ${d.maxMP}`,
          `AG: ${d.currentAG} / ${d.maxAG}`,
          ...wizardry,
        ]}
      />
    </MuWindow>
  );
});
