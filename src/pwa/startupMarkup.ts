import { SETTINGS_STORAGE_KEY } from "../settings/storage";
import english from "../data/Text_EN.json";
import { appBranding, startupAssets } from "../config/appBranding";

export const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ]!,
  );

export function installMetadata(base: string, revision = "") {
  const version = revision ? `?v=${encodeURIComponent(revision)}` : "";
  return `
    <meta name="description" content="${escapeHtml(appBranding.description)}">
    <meta name="application-name" content="${escapeHtml(appBranding.shortName)}">
    <meta name="theme-color" content="${appBranding.background}">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-title" content="${escapeHtml(appBranding.shortName)}">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <link rel="icon" type="image/svg+xml" href="${base}icons/app-icon.svg${version}">
    <link rel="icon" type="image/png" sizes="32x32" href="${base}icons/favicon-32.png${version}">
    <link rel="apple-touch-icon" sizes="180x180" href="${base}icons/apple-touch-icon.png${version}">
    ${startupAssets()
      .map(
        (asset) =>
          `<link rel="apple-touch-startup-image" href="${base}${asset.file}${version}" media="${asset.media}">`,
      )
      .join("\n    ")}`;
}
export function startupMarkup(base: string) {
  return `<div class="app-boot" role="status" aria-live="polite">
    <img class="app-boot-icon" src="${base}icons/app-icon.svg" width="80" height="80" alt="">
    <p class="app-boot-name" data-boot-name>${escapeHtml(appBranding.shortName)}</p>
    <p class="app-boot-tagline" data-boot-tagline>${escapeHtml(appBranding.tagline)}</p>
    <span class="app-boot-spinner" aria-hidden="true"></span>
    <p class="app-boot-message" data-boot-message data-boot-failure="${escapeHtml(english.PWA_LOAD_FAILED)}">${escapeHtml(english.PWA_LOADING)}</p>
    <button class="app-boot-retry" data-boot-retry hidden>${escapeHtml(english.PWA_RELOAD)}</button>
    <noscript><p>${escapeHtml(english.PWA_NOSCRIPT)}</p></noscript>
  </div>`;
}

/** Runs before module downloads, so a failed application bundle still offers recovery. */
export const startupRecoveryScript = `
  document.addEventListener('click', function(event) {
    if (event.target instanceof Element && event.target.closest('[data-boot-retry]')) window.location.reload();
  });
  window.addEventListener('error', function(event) {
    var boot = document.querySelector('.app-boot');
    if (!boot) return;
    var moduleFailure = event.target instanceof HTMLScriptElement && event.target.type === 'module';
    if (!moduleFailure && !(event instanceof ErrorEvent)) return;
    if (event instanceof ErrorEvent && event.filename && !event.filename.startsWith(window.location.origin)) return;
    var message = boot.querySelector('[data-boot-message]');
    if (message) message.textContent = message.getAttribute('data-boot-failure');
    var spinner = boot.querySelector('.app-boot-spinner');
    if (spinner) spinner.hidden = true;
    var retry = boot.querySelector('[data-boot-retry]');
    if (retry) retry.hidden = false;
  }, true);
`;

/** Apply the saved appearance before first paint, without waiting for JavaScript bundles. */
export const startupThemeScript = `
  (function() {
    var dark = false;
    try { dark = JSON.parse(localStorage.getItem('${SETTINGS_STORAGE_KEY}') || '{}').darkMode === true; } catch (_) {}
    document.documentElement.dataset.appTheme = dark ? 'dark' : 'light';
    var theme = document.querySelector('meta[name="theme-color"]');
    if (theme) theme.setAttribute('content', dark ? '${appBranding.darkBackground}' : '${appBranding.background}');
  })();
`;
