import english from '../data/Text_EN.json';
import { getLocaleText, LocaleSelection, LocaleValidationError, saveCustomLocale, selectLocale, validateCustomLocale } from '../localization/locale';

/** File and preference operations; React components own presentation only. */
export default class LocaleController {
  public downloadTemplate(): void {
    const url = URL.createObjectURL(new Blob([JSON.stringify(english, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Text_EN.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  public async upload(file: File): Promise<void> {
    let value: unknown;
    try { value = JSON.parse(await file.text()); }
    catch { throw new Error(getLocaleText('LOCALE_FILE_INVALID')); }
    try { saveCustomLocale(validateCustomLocale(value)); }
    catch (error) { throw this.userError(error); }
  }

  public select(selection: LocaleSelection): void {
    try { selectLocale(selection); }
    catch (error) { throw this.userError(error); }
  }

  private userError(error: unknown): Error {
    return new Error(error instanceof LocaleValidationError
      ? getLocaleText(error.key, error.parameters)
      : getLocaleText('LOCALE_STORAGE_ERROR'));
  }
}
