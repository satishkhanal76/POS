import { useMemo, useRef, useState } from 'react';
import { useDatabase } from '../../contexts/DatabaseContext';
import BackupController from '../../controllers/BackupController';
import { DatabaseBackup } from '../../database/DatabaseBackup';
import { workspaceController } from '../../controllers/WorkspaceController';

export default function BackupSettings() {
  const { database } = useDatabase();
  const controller = useMemo(() => new BackupController(database), [database]);
  const [backup, setBackup] = useState<DatabaseBackup | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [restored, setRestored] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const workspace = workspaceController.isDemo() ? 'demo' : 'real';
  const run = async (action: () => Promise<void>) => {
    setBusy(true); setStatus('');
    try { await action(); }
    catch (error) { setStatus(error instanceof Error ? error.message : 'Backup operation failed. Please try again.'); }
    finally { setBusy(false); }
  };
  return (
    <section className="settings-section" aria-labelledby="backup-title">
      <h2 id="backup-title">Database backup</h2>
      <p>Download every table in your current <b>{workspace} workspace</b> as one JSON file, including items, customers, discounts, transactions, and their relationships. Keep the file to restore later.</p>
      <p>Backups contain database records. Display settings are saved separately in this browser.</p>
      <div className="workspace-buttons">
        <button type="button" disabled={busy || restored} onClick={() => void run(async () => { await controller.download(); setStatus('Backup download started.'); })}>Download full backup</button>
        <button type="button" disabled={busy || restored} onClick={() => input.current?.click()}>Choose backup to restore</button>
      </div>
      <input ref={input} type="file" accept=".json,application/json" aria-label="Choose database backup" hidden onChange={event => {
        const file = event.target.files?.[0];
        event.target.value = '';
        setBackup(null);
        if (file) void run(async () => { setBackup(await controller.inspect(file)); });
      }} />
      {backup && !restored && <div className="backup-preview">
        <p><b>Backup from {backup.sourceDatabase}</b> · {new Date(backup.createdAt).toLocaleString()}</p>
        <ul>{Object.entries(backup.tables).map(([name, rows]) => <li key={name}>{name}: {rows.length} records</li>)}</ul>
        <p>Restoring replaces all records in your current <b>{workspace} workspace</b>. Download a backup first if you want to keep its current data. Reload afterward to refresh the app; unposted transactions will be discarded.</p>
        <div className="workspace-buttons">
          <button type="button" disabled={busy} onClick={() => {
            if (window.confirm(`Replace all data in your ${workspace} workspace with this backup?`)) void run(async () => {
              await controller.restore(backup);
              setBackup(null); setRestored(true); setStatus('Database restored. Reload the app to use the restored data.');
            });
          }}>Replace {workspace} workspace</button>
          <button type="button" disabled={busy} onClick={() => setBackup(null)}>Cancel</button>
        </div>
      </div>}
      {restored && <div className="workspace-buttons"><button type="button" onClick={() => window.location.reload()}>Reload app</button></div>}
      <p role="status">{busy ? 'Working…' : status}</p>
    </section>
  );
}
