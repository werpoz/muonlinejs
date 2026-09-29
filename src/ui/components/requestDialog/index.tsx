import './style.less';
import type { ReactNode } from 'react';

// Question of another player (trade, party...) with the original OK and
// Cancel buttons
export const RequestDialog = ({
  children,
  onAnswer,
}: {
  children: ReactNode;
  onAnswer: (accept: boolean) => void;
}) => (
  <div className="request-dialog">
    <div className="text">{children}</div>
    <div className="buttons">
      <button
        className="dialog-button ok"
        title="Accept"
        onClick={() => onAnswer(true)}
      />
      <button
        className="dialog-button cancel"
        title="Decline"
        onClick={() => onAnswer(false)}
      />
    </div>
  </div>
);
