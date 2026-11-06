import Select from '../Forms/Select';
import { useRef, useState } from 'react';
import { getLocaleText, LocaleKey, useLocalePreferences, useLocaleText } from '../../contexts/Locale';
import LocaleController from '../../controllers/LocaleController';
import './LocaleSettings.css';

const controller = new LocaleController();
export default function LocaleSettings() {
  const t = useLocaleText();
  const preferences = useLocalePreferences();
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<LocaleKey | null>(null);
  const [error, setError] = useState('');
  return <>
    <section className="settings-section" aria-labelledby="locale-files-title">
      <h2 id="locale-files-title">{t('LOCALE_FILES_TITLE')}</h2>
      <p>{t('LOCALE_FILES_DESCRIPTION')}</p>
      <div className="workspace-buttons">
        <button type="button" disabled={busy} onClick={() => {
          setError(''); setNotice(null);
          try { controller.downloadTemplate(); } catch { setError(t('LOCALE_TEMPLATE_FAILED')); }
        }}>{t('LOCALE_DOWNLOAD_TEMPLATE')}</button>
        <button type="button" disabled={busy} onClick={() => fileInput.current?.click()}>{t('LOCALE_UPLOAD_CUSTOM')}</button>
      </div>
      <input ref={fileInput} hidden type="file" accept=".json,application/json" aria-label={t('LOCALE_FILE_LABEL')} onChange={async event => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;
        setBusy(true); setError(''); setNotice(null);
        try {
          await controller.upload(file);
          setNotice(preferences.selection === 'custom' ? 'LOCALE_UPLOAD_APPLIED' : 'LOCALE_UPLOAD_SUCCESS');
        } catch (failure) { setError(failure instanceof Error ? failure.message : getLocaleText('LOCALE_FILE_INVALID')); }
        finally { setBusy(false); }
      }} />
      <p role="status">{busy ? t('LOCALE_UPLOADING') : notice ? t(notice) : ''}</p>
      {error && <p role="alert">{error}</p>}
    </section>
    <section className="settings-section" aria-labelledby="locale-selection-title">
      <h2 id="locale-selection-title">{t('LOCALE_SELECTION_TITLE')}</h2>
      <p>{t('LOCALE_SELECTION_DESCRIPTION')}</p>
      <div className="locale-selection-control">
        <label htmlFor="locale-selection">{t('LOCALE_SELECT_LABEL')}</label>
        <Select id="locale-selection" value={preferences.selection} disabled={busy} onChange={value => {
          setError(''); setNotice(null);
          try {
            controller.select(value === 'nepali' ? 'nepali' : value === 'custom' ? 'custom' : 'english');
            setNotice('LOCALE_CHANGE_SAVED');
          } catch (failure) { setError(failure instanceof Error ? failure.message : t('LOCALE_STORAGE_ERROR')); }
        }}>
          <option value="english">{t('LOCALE_ENGLISH')}</option>
          <option value="nepali">{t('LOCALE_NEPALI')}</option>
          {preferences.custom && <option value="custom">{t('LOCALE_CUSTOM')}</option>}
        </Select>
      </div>
      <p>{t(preferences.custom ? 'LOCALE_CUSTOM_AVAILABLE' : 'LOCALE_CUSTOM_UNAVAILABLE')}</p>
    </section>
  </>;
}
