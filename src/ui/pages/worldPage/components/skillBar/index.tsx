import './style.less';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { Store } from '../../../../../store';
import { ItemIcon } from '../../../../components/itemIcon';
import { useEventBus } from '../../../../../hooks/useEventBus';
import { SKILL_ICONS, getSkillInfo } from '../../../../../common/skills';

// hotkey slots of the bottom bar, filled with the learned skills in order
const HOT_KEYS = ['6', '7', '8', '9', '0'];

// icon of the scroll/orb that teaches the skill (several look alike, so the
// name is shown too)
const SkillIcon = ({ skill }: { skill: number }) => {
  const icon = SKILL_ICONS[skill];
  return (
    <>
      {!!icon && <ItemIcon group={icon.group} num={icon.num} />}
      <span className="skill-name">{getSkillInfo(skill).name}</span>
    </>
  );
};

// Skills in the bottom bar: hotkeys 6-0 select a skill, "Current" shows the
// selected one and opens the list of all learned skills. Right click on a
// monster (or the ground for area skills) uses it.
export const SkillBar = observer(() => {
  const [listOpen, setListOpen] = useState(false);
  const skills = Store.skills;

  useEventBus('keyPressed', code => {
    const index = HOT_KEYS.findIndex(k => code === `Digit${k}`);
    const skill = skills[index];
    if (skill) Store.selectSkill(skill.number);
  });

  const current = Store.currentSkill;

  return (
    <div className="skills">
      {HOT_KEYS.map((key, i) => {
        const skill = skills[i];
        const selected = !!skill && skill.number === current;
        return (
          <button
            key={key}
            className={`skill-slot${selected ? ' selected' : ''}`}
            title={skill ? getSkillInfo(skill.number).name : undefined}
            onClick={() => skill && Store.selectSkill(skill.number)}
          >
            <span className="hot-key">{key}</span>
            {!!skill && <SkillIcon skill={skill.number} />}
          </button>
        );
      })}
      <button
        className="skill-slot skill-current"
        title={current !== null ? getSkillInfo(current).name : 'No skill'}
        onClick={() => setListOpen(open => !open)}
      >
        {current !== null ? <SkillIcon skill={current} /> : 'Skill'}
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
    </div>
  );
});
