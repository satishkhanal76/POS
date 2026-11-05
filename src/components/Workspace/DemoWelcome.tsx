import { useEffect, useRef, useState } from 'react';
import { workspaceController } from '../../controllers/WorkspaceController';
import './Workspace.css';

export default function DemoWelcome() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [offered, setOffered] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    workspaceController.shouldOfferDemo().then(offer => {
      if (!cancelled) setOffered(offer);
    }).catch(() => { /* The regular app remains available if onboarding cannot load. */ });
    return () => { cancelled = true; };
  }, []);
  useEffect(() => {
    if (offered && !dialog.current?.open) dialog.current?.showModal();
  }, [offered]);
  const dismiss = () => {
    try {
      workspaceController.dismissWelcome();
      dialog.current?.close();
      setOffered(false);
    } catch { setError('Allow browser storage to remember your choice.'); }
  };
  return (
    <dialog ref={dialog} className="demo-welcome" aria-labelledby="demo-title" aria-describedby="demo-description"
      onCancel={event => { event.preventDefault(); if (!busy) dismiss(); }}>
      <span className="settings-eyebrow">WELCOME TO POS</span>
      <h2 id="demo-title">Take it for a spin</h2>
      <p id="demo-description">Try a sample café with six items and three customers. Build transactions and explore the app right away.</p>
      <p>Demo activity stays in a separate workspace. You can restart or clear it in Settings, and switch back to your real workspace anytime.</p>
      <div className="workspace-buttons">
        <button autoFocus type="button" disabled={busy} onClick={async () => {
          setBusy(true); setError('');
          try { await workspaceController.startDemo(); }
          catch { setError('Could not start the demo. Check browser storage and try again.'); setBusy(false); }
        }}>{busy ? 'Preparing demo…' : 'Try sample data'}</button>
        <button type="button" disabled={busy} onClick={dismiss}>Start with my own data</button>
      </div>
      {error && <p role="alert">{error}</p>}
    </dialog>
  );
}
