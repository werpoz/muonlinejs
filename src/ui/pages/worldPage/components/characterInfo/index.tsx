import { useEventBus } from '../../../../../hooks/useEventBus';
import { Store } from '../../../../../store';
import './style.less';
import { observer } from 'mobx-react-lite';

enum StatType {
  Strength = 0,
  Agility = 1,
  Vitality = 2,
  Energy = 3,
}

const Stat = observer(
  ({ label, value, stat }: { label: string; value: number; stat: StatType }) => {
    return (
      <div className="stat">
        <span className="label">{label}</span>
        <span className="value">{value}</span>
        {Store.playerData.points > 0 && (
          <button className="add-point" onClick={() => Store.increaseStat(stat)}>
            +
          </button>
        )}
      </div>
    );
  }
);

const AttributeValue = ({ text }: { text: string }) => {
  return <span className="attribute-value">{text}</span>;
};

const HOT_KEY = `KeyC`;

export const CharacterInfo = observer(() => {
  const playerData = Store.playerData;

  const dmg = `Dmg(rate): 6~14(48)`;
  const attackRate = `Attack rate: 96`;
  const defense = `Defense(rate): 51(6+0)`;
  const attackSpeed = `Attack speed: 29`;
  const defenceRate = `Defense rate: 14`;
  const hp = `HP: ${playerData.currentHP} / ${playerData.maxHP}`;
  const mp = `Mana: ${playerData.currentMP} / ${playerData.maxMP}`;
  const skillDamage = `Skill Damage: 201%`;

  useEventBus('keyPressed', key => {
    if (key === HOT_KEY) {
      Store.characterInfoEnabled = !Store.characterInfoEnabled;
    }
  });

  if (!Store.characterInfoEnabled) {
    return null;
  }

  return (
    <div className="character-info">
      <span className="nickname">
        {Store.world?.playerEntity?.objectNameInWorld}
      </span>
      <span className="status">(Dark Knight)</span>
      <div className="level-points">
        <span className="level">Level: {playerData.level}</span>
        {playerData.points > 0 && (
          <span className="points">Points: {playerData.points}</span>
        )}
      </div>
      <span className="exp">
        Exp:{playerData.exp}/{playerData.expToNextLvl}
      </span>
      <div className="stats">
        <Stat label="STR" value={playerData.str} stat={StatType.Strength} />
        <AttributeValue text={dmg} />
        <AttributeValue text={attackRate} />
        <Stat label="AGI" value={playerData.agi} stat={StatType.Agility} />
        <AttributeValue text={defense} />
        <AttributeValue text={attackSpeed} />
        <AttributeValue text={defenceRate} />
        <Stat label="STA" value={playerData.sta} stat={StatType.Vitality} />
        <AttributeValue text={hp} />
        <Stat label="ENG" value={playerData.eng} stat={StatType.Energy} />
        <AttributeValue text={mp} />
        <AttributeValue text={skillDamage} />
      </div>
    </div>
  );
});
