import './style.less';
import type { ReactNode } from 'react';

// Window of the original client: 190x429 px with the frame images of
// public/interface; children are positioned in those coordinates. The window
// is scaled with --window-scale (set by the bottom bar to fit the screen).
export const WINDOW_WIDTH = 190;
export const WINDOW_HEIGHT = 429;

export const MuWindow = ({
  title,
  subtitle,
  className,
  onClose,
  onClick,
  children,
}: {
  title: string;
  subtitle?: string;
  className?: string;
  onClose?: () => void;
  onClick?: () => void;
  children: ReactNode;
}) => (
  <div className={`mu-window-slot ${className ?? ''}`}>
    <div className="mu-window" onClick={onClick}>
      <div className="frame-top" />
      <div className="frame-left" />
      <div className="frame-right" />
      <div className="frame-bottom" />
      <span className="title">{title}</span>
      {!!subtitle && <span className="subtitle">{subtitle}</span>}
      {children}
      {!!onClose && (
        <button
          className="exit-button"
          title="Close"
          onClick={e => {
            e.stopPropagation();
            onClose();
          }}
        />
      )}
    </div>
  </div>
);
