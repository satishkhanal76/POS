import { useLocaleText, LocaleKey } from '../../contexts/Locale';
import { useMemo, useRef, useState } from 'react';
import { useDatabase } from '../../contexts/DatabaseContext';
import BackupController from '../../controllers/BackupController';
import { DatabaseBackup } from '../../database/DatabaseBackup';
import { workspaceController } from '../../controllers/WorkspaceController';

export default function BackupSettings() {
  const t = useLocaleText();
  const { database } = useDatabase();
  const controller = useMemo(() => new BackupController(database), [database]);
  const [backup, setBackup] = useState<DatabaseBackup | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [restored, setRestored] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const tableLabels: Record<string, LocaleKey> = { PRODUCTS: 'TABLE_PRODUCTS', CUSTOMER: 'TABLE_CUSTOMER', DISCOUNTS: 'TABLE_DISCOUNTS', TRANSACTIONS: 'TABLE_TRANSACTIONS', TRANSACTION_PRODUCTS: 'TABLE_TRANSACTION_PRODUCTS', TRANSACTION_DISCOUNTS: 'TABLE_TRANSACTION_DISCOUNTS', CUSTOMERS_TRANSACTIONS: 'TABLE_CUSTOMERS_TRANSACTIONS', ITEM_PRICE_CHANGES: 'TABLE_ITEM_PRICE_CHANGES' };
  const workspace = t(workspaceController.isDemo() ? 'WORKSPACE_DEMO' : 'WORKSPACE_REAL');
  const run = async (action: () => Promise<void>) => {
    setBusy(true); setStatus('');
    try { await action(); }
    catch (error) { setStatus(error instanceof Error ? error.message : t('UI_BACKUP_OPERATION_FAILED_PLEASE_TRY_AGAIN')); }
    finally { setBusy(false); }
  };
  return (
    <section className="settings-section" aria-labelledby="backup-title">
      <h2 id="backup-title">{t('UI_DATABASE_BACKUP')}</h2>
      <p>{t("BACKUP_DESCRIPTION", { workspace })}</p>
      <p>{t('UI_BACKUPS_CONTAIN_DATABASE_RECORDS_DISPLAY_SETTINGS_ARE_SAVED_SEPARATELY')}</p>
      <div className="workspace-buttons">
        <button type="button" disabled={busy || restored} onClick={() => void run(async () => { await controller.download(); setStatus(t('UI_BACKUP_DOWNLOAD_STARTED')); })}>{t('UI_DOWNLOAD_FULL_BACKUP')}</button>
        <button type="button" disabled={busy || restored} onClick={() => input.current?.click()}>{t('UI_CHOOSE_BACKUP_TO_RESTORE')}</button>
      </div>
      <input ref={input} type="file" accept=".json,application/json" aria-label={t('UI_CHOOSE_DATABASE_BACKUP')} hidden onChange={event => {
        const file = event.target.files?.[0];
        event.target.value = '';
        setBackup(null);
        if (file) void run(async () => { setBackup(await controller.inspect(file)); });
      }} />
      {backup && !restored && <div className="backup-preview">
        <p><b>{t('BACKUP_SOURCE', { database: backup.sourceDatabase })}</b> · {new Date(backup.createdAt).toLocaleString()}</p>
        <ul>{Object.entries(backup.tables).map(([name, rows]) => <li key={name}>{t('BACKUP_TABLE_COUNT', { table: tableLabels[name] ? t(tableLabels[name]) : name, count: rows.length })}</li>)}</ul>
        <p>{t("BACKUP_RESTORE_DESCRIPTION", { workspace })}</p>
        <div className="workspace-buttons">
          <button type="button" disabled={busy} onClick={() => {
            if (window.confirm(t('UI_REPLACE_ALL_DATA_IN_YOUR_VALUE_WORKSPACE_WITH_THIS', { value0: workspace }))) void run(async () => {
              await controller.restore(backup);
              setBackup(null); setRestored(true); setStatus(t('UI_DATABASE_RESTORED_RELOAD_THE_APP_TO_USE_THE_RESTORED'));
            });
          }}>{t('BACKUP_REPLACE_WORKSPACE', { workspace })}</button>
          <button type="button" disabled={busy} onClick={() => setBackup(null)}>{t('UI_CANCEL')}</button>
        </div>
      </div>}
      {restored && <div className="workspace-buttons"><button type="button" onClick={() => window.location.reload()}>{t('UI_RELOAD_APP')}</button></div>}
      <p role="status">{busy ? t('UI_WORKING') : status}</p>
    </section>
  );
}
