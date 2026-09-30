import './style.less';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { Store } from '../../../../../store';
import { ItemIcon } from '../../../../components/itemIcon';
import { useEventBus } from '../../../../../hooks/useEventBus';
import { SKILL_ICONS, getSkillInfo } from '../../../../../common/skills';

// Skill slots of the main frame (640x51 coordinates, see bottomBar):
// 1-5 hold the learned skills in order, the green one is the selected skill.
const SLOTS_X = [222, 254, 287, 320, 352];
const CURRENT_SLOT_X = 387;
const SLOT_Y = 4;
const SLOT_W = 30;
const SLOT_H = 36;

// public/interface/skill_icons.png: 20x24 icons, 8 per row, in skill number
// order (skill 1 is the first icon); it holds the skills up to 56
const ICON_W = 20;
const ICON_H = 24;
const ICONS_PER_ROW = 8;
const LAST_SKILL_IN_SHEET = 56;

const SkillIcon = ({ skill }: { skill: number }) => {
  if (skill >= 1 && skill <= LAST_SKILL_IN_SHEET) {
    const index = skill - 1;
    return (
      <span
        className="skill-icon"
        style={{
          backgroundPosition: `-${(index % ICONS_PER_ROW) * ICON_W}px -${
            Math.floor(index / ICONS_PER_ROW) * ICON_H
          }px`,
        }}
      />
    );
  }

  // not in the sheet: icon of the scroll/orb that teaches it
  const item = SKILL_ICONS[skill];
  return item ? <ItemIcon group={item.group} num={item.num} /> : null;
};

// Right click on a monster (or the ground for area skills) uses the
// selected skill.
export const SkillBar = observer(() => {
  const [listOpen, setListOpen] = useState(false);
  const skills = Store.skills;
  const current = Store.currentSkill;

  useEventBus('keyPressed', code => {
    const index = SLOTS_X.findIndex((_, i) => code === `Digit${i + 1}`);
    const skill = skills[index];
    if (skill) Store.selectSkill(skill.number);
  });

  const slotStyle = (x: number) => ({
    left: x,
    top: SLOT_Y,
    width: SLOT_W,
    height: SLOT_H,
  });

  return (
    <>
      {SLOTS_X.map((x, i) => {
        const skill = skills[i];
        const selected = !!skill && skill.number === current;
        return (
          <button
            key={x}
            className={`skill-slot${selected ? ' selected' : ''}`}
            style={slotStyle(x)}
            title={skill ? `${getSkillInfo(skill.number).name} (${i + 1})` : undefined}
            onClick={() => skill && Store.selectSkill(skill.number)}
          >
            {!!skill && <SkillIcon skill={skill.number} />}
          </button>
        );
      })}

      <button
        className="skill-slot skill-current"
        style={slotStyle(CURRENT_SLOT_X)}
        title={current !== null ? getSkillInfo(current).name : 'No skill'}
        onClick={() => setListOpen(open => !open)}
      >
        {current !== null && <SkillIcon skill={current} />}
      </button>

      {listOpen && (
        <div className="skill-list">
          {skills.length === 0 && <span>No skills learned</span>}
          {skills.map(skill => (
            <button
              key={skill.number}
              className={`skill-slot${skill.number === current ? ' selected' : ''}`}
              title={getSkillInfo(skill.number).name}
              onClick={() => {
                Store.selectSkill(skill.number);
                setListOpen(false);
              }}
            >
              <SkillIcon skill={skill.number} />
            </button>
          ))}
        </div>
      )}
    </>
  );
});
