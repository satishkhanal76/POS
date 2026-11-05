import { useLocaleText } from '../../contexts/Locale';
import { useEffect, useRef, useState } from 'react';
import { workspaceController } from '../../controllers/WorkspaceController';
import './Workspace.css';

export default function DemoWelcome() {
  const t = useLocaleText();
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
    } catch { setError(t('UI_ALLOW_BROWSER_STORAGE_TO_REMEMBER_YOUR_CHOICE')); }
  };
  return (
    <dialog ref={dialog} className="demo-welcome" aria-labelledby="demo-title" aria-describedby="demo-description"
      onCancel={event => { event.preventDefault(); if (!busy) dismiss(); }}>
      <span className="settings-eyebrow">{t('UI_WELCOME_TO_POS')}</span>
      <h2 id="demo-title">{t('UI_TAKE_IT_FOR_A_SPIN')}</h2>
      <p id="demo-description">{t('UI_TRY_A_SAMPLE_CAF_WITH_SIX_ITEMS_AND_THREE')}</p>
      <p>{t('UI_DEMO_ACTIVITY_STAYS_IN_A_SEPARATE_WORKSPACE_YOU_CAN')}</p>
      <div className="workspace-buttons">
        <button autoFocus type="button" disabled={busy} onClick={async () => {
          setBusy(true); setError('');
          try { await workspaceController.startDemo(); }
          catch { setError(t('UI_COULD_NOT_START_THE_DEMO_CHECK_BROWSER_STORAGE_AND')); setBusy(false); }
        }}>{busy ? t('UI_PREPARING_DEMO') : t('UI_TRY_SAMPLE_DATA')}</button>
        <button type="button" disabled={busy} onClick={dismiss}>{t('UI_START_WITH_MY_OWN_DATA')}</button>
      </div>
      {error && <p role="alert">{error}</p>}
    </dialog>
  );
}
