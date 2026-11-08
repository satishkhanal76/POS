import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, access, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { collectLocaleKeys } from "../scripts/localeKeys";

test("locale scan finds missing keys on unvisited pages without treating conditional table names as translations", async (context) => {
  const root = await mkdtemp(path.join(tmpdir(), "pos-locale-scan-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, "src/data"), { recursive: true });
  await writeFile(
    path.join(root, "src/data/Text_EN.json"),
    JSON.stringify({ EXISTING: "English" }),
  );
  await writeFile(
    path.join(root, "src/data/Text_Nepali.json"),
    JSON.stringify({ NEPALI_ONLY: "नेपाली" }),
  );
  await writeFile(
    path.join(root, "src/Page.tsx"),
    `
    t("MISSING_BOTH");
    t(table === "TRANSACTIONS" ? "MISSING_TRUE" : "MISSING_FALSE");
    text.LEGACY_LOOKUP;
    const field = { label: "FIELD_LABEL", note: "FIELD_NOTE" };
    const view = <Page title="SECTION_TITLE" />;
  `,
  );
  const keys = await collectLocaleKeys(root);
  await assert.rejects(access(path.join(root, "src/data/LocaleKeys.json")));
  for (const key of [
    "MISSING_BOTH",
    "MISSING_TRUE",
    "MISSING_FALSE",
    "LEGACY_LOOKUP",
    "FIELD_LABEL",
    "FIELD_NOTE",
    "SECTION_TITLE",
    "EXISTING",
    "NEPALI_ONLY",
  ])
    assert.ok(keys.includes(key), key);
  assert.ok(!keys.includes("TRANSACTIONS"));
});
