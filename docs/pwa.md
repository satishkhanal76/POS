# Installed App Branding and Startup

The app includes custom home-screen icons, a standalone install manifest, light/dark Apple launch images, install-preview screenshots, a branded first-paint loading screen, install guidance, offline status, and controlled updates.

## Change the Branding

`src/config/appBranding.ts` is the central build-time configuration for names, colors, manifest identity, icons, screenshots, shortcuts, and the supported Apple launch-image viewports. Display names and descriptions come from `Text_EN.json` (`WEB_NAME`, `PWA_APP_NAME`, `PWA_APP_DESCRIPTION`, `PWA_APP_TAGLINE`). The same accent/background values feed the app theme, loading screen, generated assets, and browser theme metadata.

The manifest `id`, scope, and start URL derive from the configured deployment base. Keep the identity stable when changing visual branding, so existing installs continue to identify the same app. Orientation is unrestricted, and the installed app uses a standalone window.

The SVG mark is defined in `scripts/generate-brand-assets.ts`. Regenerate the committed icon and launch-image files after changing the mark or colors:

```sh
npm run assets:generate
```

Outputs include SVG/PNG favicons, 192px and 512px app icons, separate full-bleed maskable icons, a 180px Apple touch icon, and 64 portrait/landscape light/dark startup images. The maskable mark stays within the central safe area. Native startup images have no animated or fake progress indicators.

Capture new install previews using the app's isolated sample workspace:

```sh
PLAYWRIGHT_CHANNEL=chrome npm run assets:screenshots
```

Or omit the environment variable after `npx playwright install chromium`. The capture script starts and stops its own local server, blocks external requests, and never opens your real browser profile. Screenshots are committed in `public/screenshots`; builds do not require a browser or regenerate assets.

## Startup

Vite injects metadata and the startup shell through `src/pwa/startupMarkup.ts`. Loading-screen CSS is inlined before the application bundle. A small early script reads the saved appearance before first paint. The shell displays the icon, app name, tagline, and a restrained spinner; reduced-motion preferences disable rotation. React replaces it as soon as the app renders, without an artificial delay.

`src/pwa/startup.ts` applies the active locale once modules load. A separate inline recovery listener exists before module downloads, so a failed bundle request shows localized default failure text and a Try Again button instead of an endless spinner. Installed/native artwork and the static manifest are build-time assets; custom locale files affect runtime UI rather than rewriting already-installed OS branding.

Safe-area padding supports screen cutouts, browser zoom remains enabled, and saved appearance updates browser theme/status metadata. Locale changes update the document title and built-in language metadata.

## Installation, Offline Use, and Updates

PwaProvider integrates the PWA registration lifecycle and install/display/network events. InstallationSettings offers a native install action when the browser supplies one, otherwise explaining the browser's installation path. AppStatus displays offline and waiting-update notices.

The worker precaches the application shell, scripts, styles, manifest, and icons. Large native launch-image variants and install screenshots are shipped for the platform to request, rather than forcing every device to download all variants into the offline cache. POS records remain in the existing IndexedDB databases; the service worker does not replace or clear them.

Updates use prompt mode. A waiting worker cannot reload the app automatically through the update UI; the user must choose Update App and confirm after finishing/discarding any unposted sale. Accepting an update may reload the page, so unposted in-memory work is not silently treated as saved data.

Platform support differs: Android can generate a launch screen from manifest colors/icons, while Apple platforms use their own home-screen metadata and startup images. Install prompts, shortcut menus, and native splash details remain controlled by the browser/OS. See the [web app manifest guide](https://web.dev/learn/pwa/web-app-manifest) and [Apple web-app configuration reference](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html).

## Verification

Core tests check deployment paths, identity, asset dimensions, opaque maskable backgrounds, Apple media queries, and escaped startup markup. Browser tests check the built manifest/assets, first-paint branding with a delayed bundle and saved dark mode, download failure recovery, installation prompts, offline launches, and a waiting update that does not discard an unposted sale.

`npm run test:browser` builds first, then runs both development interaction tests and production PWA tests. `npm run test:browser:run` reuses an existing build. The production suite serves versioned workers from a private preview-server middleware without modifying built files.

These automated checks use Chromium/Chrome. Native Apple home-screen installation and splash selection should also be reviewed on physical target devices; a desktop emulator does not prove those OS behaviors.


## Local Development and Safari Dock Installs

The development server serves a real manifest with `Cache-Control: no-store`, without enabling a service worker for Vite/HMR files. Branding metadata is injected after Vite's own URL rewrite so a deployment prefix such as `/pos/` is applied exactly once. Development icon and Apple launch-image URLs carry a content revision derived from the icon files; regenerating artwork changes those URLs for the next page load, avoiding reuse of an older native-install icon URL. Production keeps its scoped manifest and offline cache unchanged.

When checking a Dock install, reload the site in Safari before adding it. An existing Dock app can retain OS-managed branding separately from page assets. Avoid clearing website storage as a cache troubleshooting step: the site's IndexedDB contains the POS records. Native web-app name/icon settings are separate from the app's stored data.
