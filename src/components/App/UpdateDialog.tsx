import { useMemo, useRef, useState } from 'react';
import { useDatabase } from '../../contexts/DatabaseContext';
import { useLocaleText } from '../../contexts/Locale';
import BackupController from '../../controllers/BackupController';
import { workspaceController } from '../../controllers/WorkspaceController';
import FullScreenModal from '../Modals/FullScreenModal';
import '../Workspace/Workspace.css';

/** Give users time to save a local backup before activating a waiting app version. */
export default function UpdateDialog({ onClose, onUpdate }: { onClose: () => void; onUpdate: () => Promise<void> }) {
  const t = useLocaleText();
  const { database } = useDatabase();
  const backup = useMemo(() => new BackupController(database), [database]);
  const [busy, setBusy] = useState<'backup' | 'update' | null>(null);
  const inFlight = useRef(false);
  const [downloaded, setDownloaded] = useState(false);
  const [error, setError] = useState('');
  const run = async (action: 'backup' | 'update') => {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(action); setError('');
    try {
      if (action === 'backup') { await backup.download(); setDownloaded(true); }
      else { await onUpdate(); onClose(); }
    } catch { setError(t(action === 'backup' ? 'UI_BACKUP_OPERATION_FAILED_PLEASE_TRY_AGAIN' : 'PWA_UPDATE_FAILED')); }
    finally { inFlight.current = false; setBusy(null); }
  };
  return <FullScreenModal title={t('PWA_UPDATE_TITLE')} onClose={() => { if (!inFlight.current) onClose(); }}>
    <p>{t('PWA_BACKUP_RECOMMENDATION')}</p>
    <p>{t('PWA_BACKUP_WORKSPACE', { workspace: t(workspaceController.isDemo() ? 'WORKSPACE_DEMO' : 'WORKSPACE_REAL') })}</p>
    <p>{t('PWA_UPDATE_UNSAVED')}</p>
    <div className="workspace-buttons">
      <button type="button" disabled={!!busy} onClick={() => void run('backup')}>{t(busy === 'backup' ? 'UI_WORKING' : 'UI_DOWNLOAD_FULL_BACKUP')}</button>
      <button type="button" disabled={!!busy} onClick={() => void run('update')}>{t(busy === 'update' ? 'PWA_UPDATING' : 'PWA_UPDATE_ACTION')}</button>
      <button type="button" disabled={!!busy} onClick={onClose}>{t('PWA_UPDATE_LATER')}</button>
    </div>
    {downloaded && <p role="status">{t('PWA_BACKUP_CHECK_DOWNLOAD')}</p>}
    {error && <p role="alert">{error}</p>}
  </FullScreenModal>;
}
