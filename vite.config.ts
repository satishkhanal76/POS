import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vite';
import dotenv from 'dotenv';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import english from './src/data/Text_EN.json';
import { appBranding, buildAppManifest } from './src/config/appBranding';
import { escapeHtml, installMetadata, startupMarkup, startupRecoveryScript, startupThemeScript } from './src/pwa/startupMarkup';

export interface ENV { BASE_URL: string; }
const environment = dotenv.config().parsed;
const base = (environment?.BASE_URL || '/').replace(/\/?$/, '/');
const brandingVariables = `:root { --app-brand-accent: ${appBranding.accent}; --app-brand-light-bg: ${appBranding.background}; --app-brand-dark-bg: ${appBranding.darkBackground}; --boot-light-text: ${appBranding.foreground}; --boot-dark-text: ${appBranding.darkForeground}; --boot-light-muted: ${appBranding.mutedForeground}; --boot-dark-muted: ${appBranding.darkMutedForeground}; }`;
const developmentIconRevision = () => createHash('sha256')
  .update(readFileSync(new URL('./public/icons/app-icon.svg', import.meta.url)))
  .update(readFileSync(new URL('./public/icons/apple-touch-icon.png', import.meta.url)))
  .digest('hex').slice(0, 12);
const startupStyles = brandingVariables + readFileSync(new URL('./src/pwa/startup.css', import.meta.url), 'utf8');

export default defineConfig(({ command }) => ({
  base,
  plugins: [
    react(),
    {
      name: 'pos-install-branding',
      configureServer(server) {
        // Install metadata is useful in development without caching Vite/HMR files.
        server.middlewares.use((request, response, next) => {
          const pathname = request.url?.split('?')[0];
          if (pathname !== `${base}manifest.webmanifest` && pathname !== '/manifest.webmanifest') { next(); return; }
          response.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
          response.setHeader('Cache-Control', 'no-store');
          response.end(JSON.stringify(buildAppManifest(base)));
        });
      },
      transformIndexHtml: {
        order: 'post',
        handler: html => html.replace('__APP_TITLE__', escapeHtml(english.PWA_APP_NAME))
          .replace('__INSTALL_METADATA__', installMetadata(base, command === 'serve' ? developmentIconRevision() : '') + (command === 'serve' ? `\n<link rel="manifest" href="${base}manifest.webmanifest">` : ''))
          .replace('__STARTUP_STYLES__', startupStyles)
          .replace('__STARTUP_MARKUP__', startupMarkup(base))
          .replace('__STARTUP_RECOVERY__', startupRecoveryScript)
          .replace('__STARTUP_THEME__', startupThemeScript),
      },
    },
    VitePWA({
      registerType: 'prompt',
      injectRegister: null,
      manifest: buildAppManifest(base),
      includeAssets: ['icons/*.png', 'icons/*.svg'],
      workbox: {
        clientsClaim: true,
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        navigateFallbackDenylist: [/\/analytics\.js$/],
      },
    }),
  ],
}));
