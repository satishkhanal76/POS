import { test } from "node:test";
import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import sharp from "sharp";
import {
  appBranding,
  buildAppManifest,
  startupAssets,
} from "../src/config/appBranding";
import {
  escapeHtml,
  installMetadata,
  startupMarkup,
} from "../src/pwa/startupMarkup";

for (const base of ["/", "/pos/"]) {
  test(`install identity, shortcuts, and launch URL stay inside ${base}`, () => {
    const manifest = buildAppManifest(base);
    assert.equal(manifest.id, base);
    assert.equal(manifest.start_url, base);
    assert.equal(manifest.scope, base);
    assert.equal(manifest.display, "standalone");
    assert.equal(manifest.theme_color, appBranding.background);
    assert.ok(
      manifest.shortcuts?.every((shortcut) => shortcut.url.startsWith(base)),
    );
    assert.ok(manifest.icons?.some((icon) => icon.purpose === "maskable"));
  });
}
test("all manifest icons and install previews exist at their advertised dimensions", async () => {
  for (const asset of [
    ...buildAppManifest("/").icons!,
    ...buildAppManifest("/").screenshots!,
  ]) {
    const file = new URL(`../public/${asset.src}`, import.meta.url);
    await access(file);
    if (asset.sizes === "any") continue;
    const metadata = await sharp(file.pathname).metadata();
    assert.equal(`${metadata.width}x${metadata.height}`, asset.sizes);
  }
});
test("maskable icons have opaque full-bleed backgrounds", async () => {
  const { data, info } = await sharp(
    new URL("../public/icons/maskable-512.png", import.meta.url).pathname,
  )
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  for (let index = 3; index < data.length; index += info.channels)
    assert.equal(data[index], 255);
});
test("Apple launch images cover both orientations and themes at the correct pixel density", async () => {
  const assets = startupAssets();
  assert.equal(new Set(assets.map((asset) => asset.file)).size, assets.length);
  for (const asset of assets) {
    const metadata = await sharp(
      new URL(`../public/${asset.file}`, import.meta.url).pathname,
    ).metadata();
    const width = asset.orientation === "portrait" ? asset.width : asset.height;
    const height =
      asset.orientation === "portrait" ? asset.height : asset.width;
    assert.equal(metadata.width, width * asset.ratio);
    assert.equal(metadata.height, height * asset.ratio);
    assert.ok(asset.media.includes(`prefers-color-scheme: ${asset.theme}`));
  }
});
test("startup HTML and Apple metadata use the configured deployment path", () => {
  const metadata = installMetadata("/pos/");
  assert.ok(metadata.includes('href="/pos/icons/apple-touch-icon.png"'));
  assert.equal(
    (metadata.match(/apple-touch-startup-image/g) || []).length,
    startupAssets().length,
  );
  const markup = startupMarkup("/pos/");
  assert.ok(markup.includes('src="/pos/icons/app-icon.svg"'));
  assert.ok(markup.includes('role="status"'));
  assert.ok(markup.includes("data-boot-retry hidden"));
});
test("branding text is escaped before insertion into static HTML", () => {
  assert.equal(escapeHtml('<POS "&">'), "&lt;POS &quot;&amp;&quot;&gt;");
});

test("development icon revisions change the native metadata URLs without changing app identity", () => {
  const first = installMetadata("/pos/", "first");
  const next = installMetadata("/pos/", "next");
  assert.ok(first.includes("apple-touch-icon.png?v=first"));
  assert.ok(next.includes("apple-touch-icon.png?v=next"));
  assert.ok(next.includes("app-icon.svg?v=next"));
  assert.equal(buildAppManifest("/pos/").id, "/pos/");
});
