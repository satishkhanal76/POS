import { useLocaleText } from '../../contexts/Locale';
import { useState } from 'react';
import { workspaceController } from '../../controllers/WorkspaceController';
import './Workspace.css';

export default function DemoSettings() {
  const t = useLocaleText();
  const demo = workspaceController.isDemo();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const run = async (action: () => Promise<void> | void) => {
    setBusy(true); setStatus('');
    try { await action(); }
    catch { setStatus(t('UI_UNABLE_TO_UPDATE_THE_DEMO_WORKSPACE_CHECK_BROWSER_STORAGE')); }
    finally { setBusy(false); }
  };
  return (
    <section className="settings-section demo-settings" aria-labelledby="demo-settings-title">
      <h2 id="demo-settings-title">{t('UI_DEMO_WORKSPACE')}</h2>
      <p>{demo ? t('UI_YOU_ARE_USING_SAMPLE_DATA_ALL_ITEMS_CUSTOMERS_AND') : t('UI_TRY_POS_WITH_SAMPLE_ITEMS_AND_CUSTOMERS_IN_A')}</p>
      <p>{t('UI_YOUR_REAL_WORKSPACE_IS_KEPT_SEPARATELY_SWITCHING_WORKSPACES_RELOADS')}</p>
      {!demo && <p>{t("DEMO_SWITCH_DESCRIPTION")}</p>}
      <div className="workspace-buttons">
        {!demo && <button type="button" disabled={busy} onClick={() => void run(() => workspaceController.useDemoWorkspace())}>{t("DEMO_SWITCH")}</button>}
        <button type="button" disabled={busy} onClick={() => {
          if (window.confirm(t('UI_RESTART_THE_DEMO_WITH_SAMPLE_ITEMS_AND_CUSTOMERS_THIS'))) void run(() => workspaceController.startDemo());
        }}>{demo ? t('UI_RESTART_DEMO') : t('UI_START_FRESH_DEMO')}</button>
        <button type="button" disabled={busy} onClick={() => {
          if (window.confirm(t('UI_CLEAR_ALL_DEMO_ITEMS_CUSTOMERS_AND_TRANSACTIONS_YOUR_REAL'))) void run(async () => {
            await workspaceController.resetDemo(false);
            if (demo) window.location.reload();
            else setStatus(t('UI_DEMO_DATA_CLEARED'));
          });
        }}>{t('UI_CLEAR_DEMO_DATA')}</button>
        {demo && <button type="button" disabled={busy} onClick={() => void run(() => workspaceController.useRealWorkspace())}>{t('UI_USE_MY_REAL_WORKSPACE')}</button>}
      </div>
      <p role="status">{busy ? t('UI_UPDATING_DEMO_WORKSPACE') : status}</p>
    </section>
  );
}
