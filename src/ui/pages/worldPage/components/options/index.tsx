import './style.less';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { Store } from '../../../../../store';
import { MuWindow } from '../../../../components/muWindow';
import {
  loadAudioSettings,
  playSound,
  saveAudioSettings,
  type AudioSettings,
} from '../../../../../libs/gameSounds';

export const toggleOptions = () => {
  Store.optionsEnabled = !Store.optionsEnabled;
};

const Slider = ({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) => (
  <label className="option-slider">
    <span className="label">{label}</span>
    <input
      type="range"
      min={0}
      max={100}
      value={Math.round(value * 100)}
      onChange={e => onChange(Number(e.target.value) / 100)}
    />
    <span className="value">{Math.round(value * 100)}</span>
  </label>
);

// Options (menu button): music and sound effects volume, saved in the
// browser
export const Options = observer(() => {
  const [settings, setSettings] = useState<AudioSettings>(loadAudioSettings);

  if (!Store.optionsEnabled) return null;

  const update = (change: Partial<AudioSettings>) => {
    const next = { ...settings, ...change };
    setSettings(next);
    saveAudioSettings(next);
  };

  return (
    <MuWindow title="Options" className="options" onClose={toggleOptions}>
      <div className="options-list">
        <Slider
          label="Music"
          value={settings.music}
          onChange={music => update({ music })}
        />
        <Slider
          label="Sound effects"
          value={settings.effects}
          onChange={effects => {
            update({ effects });
            playSound('Sound/iButtonClick');
          }}
        />
        <div className="keys">
          <div>I / V: inventory · C: character · F: friends</div>
          <div>G: guild · M: maps · Tab: map · F3: debug</div>
          <div>Q W E R: potions · 1-5: skills</div>
          <div>Enter: chat (/w, /r, /trade, /party, /guild, @, ~)</div>
        </div>
      </div>
    </MuWindow>
  );
});
