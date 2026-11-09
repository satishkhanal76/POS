import { getLocaleText } from "../localization/locale";
import { loadSettings } from "../settings/settings";
import { applyTheme, SYSTEM_THEME_QUERY } from "../settings/theme";

applyTheme(loadSettings().theme, window.matchMedia(SYSTEM_THEME_QUERY).matches);
const setText = (selector: string, text: string) => {
  const element = document.querySelector(selector);
  if (element) element.textContent = text;
};
setText("[data-boot-name]", getLocaleText("WEB_NAME"));
setText("[data-boot-tagline]", getLocaleText("PWA_APP_TAGLINE"));
setText("[data-boot-message]", getLocaleText("PWA_LOADING"));
setText("[data-boot-retry]", getLocaleText("PWA_RELOAD"));
document
  .querySelector("[data-boot-message]")
  ?.setAttribute("data-boot-failure", getLocaleText("PWA_LOAD_FAILED"));
