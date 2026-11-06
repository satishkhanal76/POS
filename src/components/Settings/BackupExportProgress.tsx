import { BackupProgress } from '../../backup/progress';
import { useLocaleText } from '../../contexts/Locale';
import './BackupSettings.css';

export default function BackupExportProgress({ progress }: { progress: BackupProgress | null }) {
  const t = useLocaleText();
  if (!progress) return null;
  return <div className="restore-progress">
    <p role="status">{t(progress.phase === 'preparing' ? 'EXPORT_PREPARING' : progress.phase === 'finalizing' ? 'EXPORT_FINALIZING' : 'EXPORT_PACKING', { done: progress.completed.toLocaleString(), total: progress.total.toLocaleString() })}</p>
    {progress.total > 0 && <div className="restore-progress-track" role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.completed} aria-label={t('EXPORT_PROGRESS')}><span style={{ width: `${progress.completed / progress.total * 100}%` }} /></div>}
    <p>{t('EXPORT_KEEP_OPEN')}</p>
  </div>;
}
