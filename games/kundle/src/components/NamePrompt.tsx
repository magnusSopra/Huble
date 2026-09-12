import { useEffect, useRef, useState } from 'react';
import { MAX_NAME_LENGTH } from '../game/leaderboard';

interface NamePromptProps {
  onDismiss: () => void;
  onSave: (name: string) => void;
}

export function NamePrompt({ onDismiss, onSave }: NamePromptProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    inputRef.current?.focus();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="name-dialog"
      aria-labelledby="name-prompt-title"
      aria-describedby="name-prompt-description"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          onDismiss();
        }
      }}
      onCancel={(event) => {
        event.preventDefault();
        onDismiss();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onDismiss();
      }}
    >
      <form className="name-dialog__content" onSubmit={(event) => {
        event.preventDefault();
        if (!name.trim()) {
          setError('Enter a name, or choose Not now.');
          return;
        }
        try {
          onSave(name.trim());
        } catch {
          setError('Your result could not be saved. Browser storage may be blocked or full.');
        }
      }}>
        <div className="modal__header">
          <h2 id="name-prompt-title">Add your name?</h2>
          <button type="button" className="name-dialog__close" aria-label="Close name prompt" title="Close" onClick={onDismiss}>&times;</button>
        </div>
        <p id="name-prompt-description">Join the leaderboard on this browser. Your name is optional.</p>
        <label htmlFor="player-name">Display name</label>
        <input
          ref={inputRef}
          id="player-name"
          name="player-name"
          autoComplete="nickname"
          maxLength={MAX_NAME_LENGTH}
          value={name}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? 'name-prompt-error' : undefined}
          onChange={(event) => {
            setName(event.target.value);
            setError('');
          }}
        />
        {error && <p id="name-prompt-error" className="name-dialog__error" role="alert">{error}</p>}
        <div className="name-dialog__actions">
          <button type="button" className="quiet-button" onClick={onDismiss}>Not now</button>
          <button type="submit" className="primary-button" disabled={!name.trim()}>Join leaderboard</button>
        </div>
      </form>
    </dialog>
  );
}