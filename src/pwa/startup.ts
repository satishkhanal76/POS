import { getLocaleText } from '../localization/locale';
import { loadSettings } from '../settings/settings';
import { appBranding } from '../config/appBranding';

const dark = loadSettings().darkMode;
document.documentElement.dataset.appTheme = dark ? 'dark' : 'light';
document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? appBranding.darkBackground : appBranding.background);
const setText = (selector: string, text: string) => {
  const element = document.querySelector(selector);
  if (element) element.textContent = text;
};
setText('[data-boot-name]', getLocaleText('WEB_NAME'));
setText('[data-boot-tagline]', getLocaleText('PWA_APP_TAGLINE'));
setText('[data-boot-message]', getLocaleText('PWA_LOADING'));
setText('[data-boot-retry]', getLocaleText('PWA_RELOAD'));
document.querySelector('[data-boot-message]')?.setAttribute('data-boot-failure', getLocaleText('PWA_LOAD_FAILED'));
