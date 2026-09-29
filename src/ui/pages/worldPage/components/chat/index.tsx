import './style.less';
import { observer } from 'mobx-react-lite';
import { useRef, useState } from 'react';
import { Store } from '../../../../../store';
import { useEventBus } from '../../../../../hooks/useEventBus';

const MAX_MESSAGE_LENGTH = 60;

// Enter opens the input, Enter sends, Escape closes.
export const Chat = observer(() => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEventBus('keyPressed', key => {
    if (key !== 'Enter' && key !== 'NumpadEnter') return;
    setOpen(true);
    setTimeout(() => inputRef.current?.focus());
  });

  const close = () => {
    setText('');
    setOpen(false);
  };

  return (
    <div className="chat">
      <div className="lines">
        {Store.chatMessages.map((line, i) => (
          <div key={i} className={line.system ? 'line system' : 'line'}>
            {line.sender && <span className="sender">{line.sender}: </span>}
            {line.text}
          </div>
        ))}
      </div>
      {open && (
        <input
          ref={inputRef}
          value={text}
          maxLength={MAX_MESSAGE_LENGTH}
          onChange={e => setText(e.target.value)}
          onBlur={close}
          onKeyDown={e => {
            if (e.key === 'Escape') close();
            if (e.key !== 'Enter') return;

            const message = text.trim();
            // /trade [name]: trade with that player (or the nearest one)
            const trade = /^\/trade(?:\s+(\S+))?$/i.exec(message);
            if (trade) Store.requestTrade(trade[1]);
            else if (message) Store.sendChatMessage(message);
            close();
          }}
        />
      )}
    </div>
  );
});
