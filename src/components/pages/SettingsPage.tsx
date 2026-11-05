import BackupSettings from "../Settings/BackupSettings";
import DemoSettings from "../Workspace/DemoSettings";
import { useEffect, useState } from 'react';
import { useClientGlobal } from '../../contexts/ClientGlobal';
import { defaultSettings, fieldError, saveSettings, settingsSchema, SettingsDraft, toDraft } from '../../settings/settings';
import './SettingsPage.css';

export default function SettingsPage() {
  const settings = useClientGlobal();
  const [draft, setDraft] = useState(() => toDraft(settings));
  const [status, setStatus] = useState('');
  const savedDraft = toDraft(settings);
  const dirty = JSON.stringify(draft) !== JSON.stringify(savedDraft);
  const invalid = settingsSchema.some(field => fieldError(field, draft[field.key]));

  // Preserve edits if another tab changes settings; Discard loads the latest values.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const displayDraft = dirty ? draft : savedDraft;
  const update = (key: keyof SettingsDraft, value: string | boolean) => {
    setDraft({ ...displayDraft, [key]: value });
    setStatus('');
  };
  const decimals = Number(displayDraft.numOfDecimalPlaces);
  const preview = fieldError(settingsSchema.find(field => field.key === 'numOfDecimalPlaces')!, displayDraft.numOfDecimalPlaces)
    ? 'Enter valid decimal places to preview.'
    : `${displayDraft.currencyCharacter}${(1234.5).toFixed(decimals)}`;

  return (
    <main className="settings-page">
      <header className="settings-header">
        <span className="settings-eyebrow">MAKE IT YOURS</span>
        <h1>Settings</h1>
        <p>Set up your workspace. Changes are saved on this browser and device.</p>
      </header>
      <form noValidate onSubmit={event => {
        event.preventDefault();
        try {
          const next = saveSettings(displayDraft);
          setDraft(toDraft(next));
          setStatus('Settings saved.');
        } catch (error) {
          setStatus(error instanceof Error && error.message.includes(':') ? error.message : 'Unable to save settings. Check browser storage and try again.');
        }
      }}>
        {(['Prices', 'Appearance'] as const).map(group => (
          <section className="settings-section" key={group} aria-labelledby={`group-${group}`}>
            <h2 id={`group-${group}`}>{group}</h2>
            {settingsSchema.filter(field => field.group === group).map(field => {
              const id = `setting-${field.key}`;
              const error = fieldError(field, displayDraft[field.key]);
              return (
                <div className="settings-field" key={field.key}>
                  <div><label htmlFor={id}>{field.label}</label><p id={`${id}-help`}>{field.description}</p></div>
                  <div className="settings-control">
                    {field.type === 'boolean' ? (
                      <label className="settings-toggle">
                        <input id={id} type="checkbox" role="switch" checked={Boolean(displayDraft[field.key])} onChange={event => update(field.key, event.target.checked)} aria-describedby={`${id}-help`} />
                        <span aria-hidden="true" className="settings-toggle-track" />
                        <span>{displayDraft[field.key] ? 'On' : 'Off'}</span>
                      </label>
                    ) : (
                      <input id={id} type={field.type === 'number' ? 'number' : 'text'} value={String(displayDraft[field.key])}
                        min={field.min} max={field.max} step={field.integer ? 1 : 'any'} maxLength={field.maxLength}
                        aria-invalid={!!error} aria-describedby={`${id}-help${error ? ` ${id}-error` : ''}`}
                        onChange={event => update(field.key, event.target.value)} />
                    )}
                    {error && <p className="settings-error" id={`${id}-error`}>{error}</p>}
                  </div>
                </div>
              );
            })}
            {group === 'Prices' && <div className="settings-preview"><span>Price preview</span><output>{preview}</output><small>Display formatting only; transaction amounts stay the same.</small></div>}
          </section>
        ))}
        <footer className="settings-actions">
          <div className="settings-action-buttons">
            <button className="settings-save" type="submit" disabled={!dirty || !!invalid}>Save changes</button>
            <button type="button" disabled={!dirty} onClick={() => { setDraft(savedDraft); setStatus('Changes discarded.'); }}>Discard</button>
            <button type="button" onClick={() => { setDraft(toDraft(defaultSettings)); setStatus('Defaults loaded. Save changes to apply.'); }}>Restore defaults</button>
          </div>
          <p role="status" aria-live="polite">{status || (dirty ? 'You have unsaved changes.' : 'All changes saved.')}</p>
        </footer>
      </form>
      <BackupSettings />
      <DemoSettings />
    </main>
  );
}
