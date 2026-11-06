import { useMemo, useRef, useState } from 'react';
import { useDatabase } from '../../contexts/DatabaseContext';
import { useLocaleText } from '../../contexts/Locale';
import DatabaseResetController from '../../controllers/DatabaseResetController';
import BackupController from '../../controllers/BackupController';
import FullScreenModal from '../Modals/FullScreenModal';
import './DatabaseResetSettings.css';

export default function DatabaseResetSettings() {
  const t = useLocaleText();
  const { database } = useDatabase();
  const controller = useMemo(() => new DatabaseResetController(database), [database]);
  const backup = useMemo(() => new BackupController(database), [database]);
  const [name, setName] = useState('');
  const [typed, setTyped] = useState('');
  const [step, setStep] = useState<'closed' | 'type' | 'confirm' | 'done'>('closed');
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const run = async (action: () => Promise<void>) => {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError(''); setNotice('');
    try { await action(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : t('RESET_FAILED')); }
    finally { locked.current = false; setBusy(false); }
  };
  const close = () => { if (!locked.current) { setStep('closed'); setTyped(''); setError(''); } };
  return <section className="settings-section database-danger" aria-labelledby="database-reset-title">
    <h2 id="database-reset-title">{t('RESET_TITLE')}</h2>
    <p>{t('RESET_DESCRIPTION')}</p>
    <button type="button" className="database-danger-button" disabled={busy} onClick={() => void run(async () => {
      setName(await controller.getName()); setTyped(''); setStep('type');
    })}>{t('RESET_OPEN')}</button>
    {step !== 'closed' && <FullScreenModal title={t(step === 'done' ? 'RESET_DONE_TITLE' : 'RESET_TITLE')} onClose={step === 'done' ? () => window.location.reload() : close}>
      {step === 'done' ? <><p role="status">{t('RESET_DONE', { database: name })}</p><div className="workspace-buttons"><button type="button" onClick={() => window.location.reload()}>{t('UI_RELOAD_APP')}</button></div></> : <>
        <p className="database-reset-warning">{t('RESET_TARGET', { database: name })}</p>
        <p>{t('RESET_CONTENTS')}</p><p>{t('RESET_SCOPE')}</p><p>{t('RESET_BACKUP_ADVICE')}</p><p>{t('RESET_OTHER_TABS')}</p>
        {step === 'type' ? <>
          <label className="database-reset-input" htmlFor="reset-database-name">{t('RESET_TYPE_NAME', { database: name })}
            <input id="reset-database-name" autoComplete="off" spellCheck={false} value={typed} onChange={event => setTyped(event.target.value)} disabled={busy} />
          </label>
          <div className="workspace-buttons"><button type="button" disabled={busy} onClick={() => void run(async () => { await backup.download(); setNotice(t('PWA_BACKUP_CHECK_DOWNLOAD')); })}>{t('UI_DOWNLOAD_FULL_BACKUP')}</button>
            <button type="button" disabled={busy || typed !== name} onClick={() => setStep('confirm')}>{t('RESET_REVIEW')}</button>
            <button type="button" disabled={busy} onClick={close}>{t('UI_CANCEL')}</button></div>
        </> : <>
          <p className="database-reset-warning">{t('RESET_FINAL', { database: name })}</p>
          <div className="workspace-buttons"><button type="button" className="database-danger-button" disabled={busy || typed !== name} onClick={() => void run(async () => {
            await controller.clear(typed); setStep('done'); setTyped('');
          })}>{t(busy ? 'UI_WORKING' : 'RESET_CONFIRM')}</button>
          <button type="button" disabled={busy} onClick={close}>{t('UI_CANCEL')}</button></div>
        </>}
        {notice && <p role="status">{notice}</p>}{error && <p role="alert">{error}</p>}
      </>}
    </FullScreenModal>}
    {step === 'closed' && error && <p role="alert">{error}</p>}
  </section>;
}
