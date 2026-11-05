import InstallationSettings from "../Settings/InstallationSettings";
import LocaleSettings from "../Settings/LocaleSettings";
import { useLocaleText } from '../../contexts/Locale';
import PageHeader from "../Layout/PageHeader";
import BackupSettings from "../Settings/BackupSettings";
import DemoSettings from "../Workspace/DemoSettings";
import { useEffect, useState } from 'react';
import { useClientGlobal } from '../../contexts/ClientGlobal';
import { defaultSettings, fieldError, saveSettings, settingsSchema, SettingsDraft, toDraft } from '../../settings/settings';
import './SettingsPage.css';

export default function SettingsPage() {
  const t = useLocaleText();
  const settings = useClientGlobal();
  const [draft, setDraft] = useState(() => toDraft(settings));
  const [status, setStatus] = useState('');
  const savedDraft = toDraft(settings);
  const dirty = JSON.stringify(draft) !== JSON.stringify(savedDraft);
  const invalid = settingsSchema.some(field => fieldError(field, draft[field.key], t));

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
  const preview = fieldError(settingsSchema.find(field => field.key === 'numOfDecimalPlaces')!, displayDraft.numOfDecimalPlaces, t)
    ? t('UI_ENTER_VALID_DECIMAL_PLACES_TO_PREVIEW')
    : `${displayDraft.currencyCharacter}${(1234.5).toFixed(decimals)}`;

  return (
    <main className="settings-page">
      <PageHeader title={t('NAVBAR_SETTINGS')} eyebrow={t('UI_MAKE_IT_YOURS')} description={t('UI_SET_UP_YOUR_WORKSPACE_CHANGES_ARE_SAVED_ON_THIS')} />
      <form noValidate onSubmit={event => {
        event.preventDefault();
        try {
          const next = saveSettings(displayDraft);
          setDraft(toDraft(next));
          setStatus(t('UI_SETTINGS_SAVED'));
        } catch (error) {
          setStatus(error instanceof Error && error.message.includes(':') ? error.message : t('UI_UNABLE_TO_SAVE_SETTINGS_CHECK_BROWSER_STORAGE_AND_TRY'));
        }
      }}>
        {(['Prices', 'Appearance'] as const).map(group => (
          <section className="settings-section" key={group} aria-labelledby={`group-${group}`}>
            <h2 id={`group-${group}`}>{t(group === "Prices" ? "UI_PRICES" : "UI_APPEARANCE")}</h2>
            {settingsSchema.filter(field => field.group === group).map(field => {
              const id = `setting-${field.key}`;
              const error = fieldError(field, displayDraft[field.key], t);
              return (
                <div className="settings-field" key={field.key}>
                  <div><label htmlFor={id}>{t(field.label)}</label><p id={`${id}-help`}>{t(field.description)}</p></div>
                  <div className="settings-control">
                    {field.type === 'boolean' ? (
                      <label className="settings-toggle">
                        <input id={id} type="checkbox" role="switch" checked={Boolean(displayDraft[field.key])} onChange={event => update(field.key, event.target.checked)} aria-describedby={`${id}-help`} />
                        <span aria-hidden="true" className="settings-toggle-track" />
                        <span>{displayDraft[field.key] ? t('UI_ON') : t('UI_OFF')}</span>
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
            {group === 'Prices' && <div className="settings-preview"><span>{t('UI_PRICE_PREVIEW')}</span><output>{preview}</output><small>{t('UI_DISPLAY_FORMATTING_ONLY_TRANSACTION_AMOUNTS_STAY_THE_SAME')}</small></div>}
          </section>
        ))}
        <footer className="settings-actions">
          <div className="settings-action-buttons">
            <button className="settings-save" type="submit" disabled={!dirty || !!invalid}>{t('UI_SAVE_CHANGES_2')}</button>
            <button type="button" disabled={!dirty} onClick={() => { setDraft(savedDraft); setStatus(t('UI_CHANGES_DISCARDED')); }}>{t('UI_DISCARD')}</button>
            <button type="button" onClick={() => { setDraft(toDraft(defaultSettings)); setStatus(t('UI_DEFAULTS_LOADED_SAVE_CHANGES_TO_APPLY')); }}>{t('UI_RESTORE_DEFAULTS')}</button>
          </div>
          <p role="status" aria-live="polite">{status || (dirty ? t('UI_YOU_HAVE_UNSAVED_CHANGES') : t('UI_ALL_CHANGES_SAVED'))}</p>
        </footer>
      </form>
      <InstallationSettings />
      <LocaleSettings />
      <BackupSettings />
      <DemoSettings />
    </main>
  );
}
