import { useState } from 'react';
import { workspaceController } from '../../controllers/WorkspaceController';
import './Workspace.css';

export default function DemoSettings() {
  const demo = workspaceController.isDemo();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const run = async (action: () => Promise<void> | void) => {
    setBusy(true); setStatus('');
    try { await action(); }
    catch { setStatus('Unable to update the demo workspace. Check browser storage and try again.'); }
    finally { setBusy(false); }
  };
  return (
    <section className="settings-section demo-settings" aria-labelledby="demo-settings-title">
      <h2 id="demo-settings-title">Demo workspace</h2>
      <p>{demo ? 'You are using sample data. All items, customers, and transactions here belong to the demo.' : 'Try POS with sample items and customers in a separate workspace.'}</p>
      <p>Your real workspace is kept separately. Switching workspaces reloads the app and discards any unposted transaction. The demo selection applies to this tab; demo records are shared by tabs using the demo.</p>
      <div className="workspace-buttons">
        <button type="button" disabled={busy} onClick={() => {
          if (window.confirm('Restart the demo with sample items and customers? This removes all previous demo activity.')) void run(() => workspaceController.startDemo());
        }}>{demo ? 'Restart demo' : 'Start fresh demo'}</button>
        <button type="button" disabled={busy} onClick={() => {
          if (window.confirm('Clear all demo items, customers, and transactions? Your real workspace will be kept.')) void run(async () => {
            await workspaceController.resetDemo(false);
            if (demo) window.location.reload();
            else setStatus('Demo data cleared.');
          });
        }}>Clear demo data</button>
        {demo && <button type="button" disabled={busy} onClick={() => void run(() => workspaceController.useRealWorkspace())}>Use my real workspace</button>}
      </div>
      <p role="status">{busy ? 'Updating demo workspace…' : status}</p>
    </section>
  );
}
