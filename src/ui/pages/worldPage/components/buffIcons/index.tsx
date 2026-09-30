import './style.less';
import { observer } from 'mobx-react-lite';
import { Store } from '../../../../../store';

// icons of newui_statusicon*.jpg: 20x28, 10 columns x 8 rows per sheet,
// icon n is the effect number n (like the buff states of the client)
const ICON_WIDTH = 20;
const ICON_HEIGHT = 28;
const COLUMNS = 10;
const ICONS_PER_SHEET = 80;
const SHEETS = 3;

// names of the effects of OpenMU (MagicEffectDefinition)
const EFFECT_NAMES: Record<number, string> = {
  1: 'Greater Damage',
  2: 'Greater Defense',
  3: "Elf Soldier's blessing",
  4: 'Soul Barrier',
  5: 'Critical Damage Increase',
  6: 'Infinity Arrow',
  8: 'Life Swell',
  10: 'Potion of Bless',
  11: 'Potion of Soul',
  18: 'Invisible',
  35: "Jack O'Lantern Blessings",
  36: "Jack O'Lantern Wrath",
  37: "Jack O'Lantern Cry",
  38: "Jack O'Lantern Food",
  39: "Jack O'Lantern Drink",
  55: 'Poisoned',
  56: 'Iced',
  57: 'Frozen',
  58: 'Defense Reduction',
  61: 'Stunned',
  71: 'Reflection',
  72: 'Sleep',
  74: 'Requiem',
  75: 'Explosion',
  76: 'Weakness',
  77: 'Innovation',
  78: 'Cherry Blossom Wine',
  79: 'Cherry Blossom Rice Cake',
  80: 'Cherry Blossom Flower Petal',
  81: 'Berserker',
  82: 'Wizardry Enhance',
  86: 'Cold',
  129: 'Ignore Defense',
  130: 'Increase Health',
  131: 'Increase Block',
  132: 'Decrease Block',
  135: 'Life Swell Proficiency',
  138: 'Wizardry Enhance Strengthener',
  139: 'Wizardry Enhance Mastery',
  148: 'Critical Damage Increase Mastery',
};

const DEBUFFS = [55, 56, 57, 58, 61, 72, 74, 75, 76, 86, 132];

const iconStyle = (effect: number) => {
  const index = effect - 1;
  const sheet = Math.floor(index / ICONS_PER_SHEET) + 1;
  const inSheet = index % ICONS_PER_SHEET;
  return {
    backgroundImage: `url('/interface/status_icons${sheet}.jpg')`,
    backgroundPosition: `-${(inSheet % COLUMNS) * ICON_WIDTH}px -${Math.floor(inSheet / COLUMNS) * ICON_HEIGHT}px`,
  };
};

// Buffs and debuffs of the local player, at the top of the screen like the
// original client; the name on hover
export const BuffIcons = observer(() => {
  // effects without an icon (e.g. 28, the mark of a game master) are hidden
  const effects = Store.activeEffects.filter(
    e => e > 0 && e <= ICONS_PER_SHEET * SHEETS && EFFECT_NAMES[e]
  );
  if (!effects.length) return null;

  return (
    <div className="buff-icons">
      {effects.map(effect => (
        <div
          key={effect}
          className={`buff-icon${DEBUFFS.includes(effect) ? ' debuff' : ''}`}
          style={iconStyle(effect)}
        >
          <span className="buff-name">{EFFECT_NAMES[effect] ?? `Effect ${effect}`}</span>
        </div>
      ))}
    </div>
  );
});
