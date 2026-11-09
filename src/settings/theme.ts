import { appBranding } from "../config/appBranding";

export const themeOptions = ["system", "light", "dark"] as const;
export type ThemePreference = (typeof themeOptions)[number];
export const SYSTEM_THEME_QUERY = "(prefers-color-scheme: dark)";

export function isThemePreference(value: unknown): value is ThemePreference {
  return themeOptions.some((theme) => theme === value);
}

export function applyTheme(preference: ThemePreference, systemDark: boolean) {
  const dark = preference === "dark" || (preference === "system" && systemDark);
  const theme = dark ? "dark" : "light";
  document.body.classList.toggle("light-theme", !dark);
  document.documentElement.style.colorScheme = theme;
  document.documentElement.dataset.appTheme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute(
      "content",
      dark ? appBranding.darkBackground : appBranding.background,
    );
  document
    .querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')
    ?.setAttribute("content", dark ? "black" : "default");
}
