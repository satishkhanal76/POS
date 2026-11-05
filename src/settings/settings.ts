import defaults from '../data/ClientGlobal.json';

export type Settings = typeof defaults;
type Field<K extends keyof Settings> = {
  key: K;
  type: Settings[K] extends boolean ? 'boolean' : Settings[K] extends number ? 'number' : 'text';
  label: string;
  description: string;
  group: 'Prices' | 'Appearance';
  min?: number;
  max?: number;
  integer?: boolean;
  maxLength?: number;
};
export type SettingField = { [K in keyof Settings]: Field<K> }[keyof Settings];

export const settingsSchema: SettingField[] = [
  { key: 'currencyCharacter', type: 'text', label: 'Currency symbol', description: 'Use a symbol or code, such as $, CA$, or ₹.', group: 'Prices', maxLength: 12 },
  { key: 'numOfDecimalPlaces', type: 'number', label: 'Decimal places', description: 'Number of digits displayed after the decimal point.', group: 'Prices', min: 0, max: 6, integer: true },
  { key: 'darkMode', type: 'boolean', label: 'Dark mode', description: 'Use a darker appearance throughout the app.', group: 'Appearance' },
];
export const defaultSettings: Settings = defaults;
export const STORAGE_KEY = 'pos.clientGlobal';
export const UPDATE_EVENT = 'clientGlobal:updated';
export type SettingsDraft = Record<keyof Settings, string | boolean>;
export const toDraft = (settings: Settings): SettingsDraft => Object.fromEntries(
  settingsSchema.map(field => [field.key, field.type === 'boolean' ? settings[field.key] : String(settings[field.key])])
) as SettingsDraft;

export function fieldError(field: SettingField, value: unknown): string | undefined {
  if (field.type === 'boolean') return typeof value === 'boolean' ? undefined : 'Choose on or off.';
  if (field.type === 'text') {
    if (typeof value !== 'string' || !value.trim()) return 'Enter a value.';
    if (field.maxLength && value.trim().length > field.maxLength) return `Use at most ${field.maxLength} characters.`;
    return;
  }
  const number = typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : NaN;
  if (!Number.isFinite(number)) return 'Enter a valid number.';
  if (field.integer && !Number.isInteger(number)) return 'Enter a whole number.';
  if ((field.min !== undefined && number < field.min) || (field.max !== undefined && number > field.max)) return `Enter a number between ${field.min} and ${field.max}.`;
}

export function parseDraft(draft: SettingsDraft): Settings {
  const next = { ...defaultSettings };
  for (const field of settingsSchema) {
    const value = draft[field.key];
    const error = fieldError(field, value);
    if (error) throw new Error(`${field.label}: ${error}`);
    Object.assign(next, { [field.key]: field.type === 'number' ? Number(value) : field.type === 'text' ? String(value).trim() : value });
  }
  return next;
}

export function loadSettings(): Settings {
  const next = { ...defaultSettings };
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return next;
    for (const field of settingsSchema) {
      const value = (parsed as Record<string, unknown>)[field.key];
      const expected = typeof defaultSettings[field.key];
      if (typeof value === expected && !fieldError(field, value)) Object.assign(next, { [field.key]: typeof value === 'string' ? value.trim() : value });
    }
  } catch { /* Missing or unreadable storage falls back to validated defaults. */ }
  return next;
}

export function saveSettings(draft: SettingsDraft): Settings {
  const next = parseDraft(draft);
  // Notify consumers only after persistence succeeds.
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(UPDATE_EVENT));
  return next;
}
