import type { ManifestOptions } from "vite-plugin-pwa";
import { englishMessages as english } from "../localization/messages";

/** Build-time install branding. Keep the app ID stable when changing its appearance. */
export const appBranding = {
  name: english.PWA_APP_NAME,
  shortName: english.SOFTWARE_NAME,
  tagline: english.PWA_APP_TAGLINE,
  description: english.PWA_APP_DESCRIPTION,
  accent: "#d97706",
  background: "#f1f5f9",
  foreground: "#161619",
  darkBackground: "#262626",
  darkForeground: "#f1f5f9",
  mutedForeground: "#686870",
  darkMutedForeground: "#94a3b8",
};

/** CSS viewport sizes, not model names; each gets portrait/landscape and light/dark art. */
export const startupViewports = [
  { width: 320, height: 568, ratio: 2 },
  { width: 375, height: 667, ratio: 2 },
  { width: 414, height: 736, ratio: 3 },
  { width: 375, height: 812, ratio: 3 },
  { width: 414, height: 896, ratio: 2 },
  { width: 414, height: 896, ratio: 3 },
  { width: 390, height: 844, ratio: 3 },
  { width: 393, height: 852, ratio: 3 },
  { width: 402, height: 874, ratio: 3 },
  { width: 428, height: 926, ratio: 3 },
  { width: 430, height: 932, ratio: 3 },
  { width: 440, height: 956, ratio: 3 },
  { width: 768, height: 1024, ratio: 2 },
  { width: 820, height: 1180, ratio: 2 },
  { width: 834, height: 1194, ratio: 2 },
  { width: 1024, height: 1366, ratio: 2 },
];
export function startupAssets() {
  return startupViewports.flatMap((viewport) =>
    (["portrait", "landscape"] as const).flatMap((orientation) =>
      (["light", "dark"] as const).map((theme) => ({
        ...viewport,
        orientation,
        theme,
        file: `startup/${viewport.width}x${viewport.height}-${viewport.ratio}-${orientation}-${theme}.png`,
        media: `(device-width: ${viewport.width}px) and (device-height: ${viewport.height}px) and (-webkit-device-pixel-ratio: ${viewport.ratio}) and (orientation: ${orientation}) and (prefers-color-scheme: ${theme})`,
      })),
    ),
  );
}

export function buildAppManifest(base: string): Partial<ManifestOptions> {
  return {
    id: base,
    name: appBranding.name,
    short_name: appBranding.shortName,
    description: appBranding.description,
    lang: "en",
    dir: "ltr",
    start_url: base,
    scope: base,
    display: "standalone",
    orientation: "any",
    theme_color: appBranding.background,
    background_color: appBranding.background,
    categories: ["business", "productivity"],
    prefer_related_applications: false,
    icons: [
      {
        src: "icons/app-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "icons/maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: english.UI_POINT_OF_SALE,
        url: base,
        icons: [{ src: "icons/icon-192.png", sizes: "192x192" }],
      },
      { name: english.ITEMS_TITLE, url: `${base}items` },
      { name: english.CUSTOMERS_TITLE, url: `${base}customers` },
      { name: english.TRANSACTIONS_TITLE, url: `${base}transactions` },
    ],
    screenshots: [
      {
        src: "screenshots/desktop.png",
        sizes: "1280x900",
        type: "image/png",
        form_factor: "wide",
        label: english.PWA_SCREENSHOT_WIDE,
      },
      {
        src: "screenshots/mobile.png",
        sizes: "390x844",
        type: "image/png",
        form_factor: "narrow",
        label: english.PWA_SCREENSHOT_NARROW,
      },
    ],
  };
}
