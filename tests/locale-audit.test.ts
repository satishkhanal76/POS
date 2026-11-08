import { test } from "node:test";
import assert from "node:assert/strict";
import { auditTranslations } from "../src/localization/audit";
import { createLocaleMessages } from "../src/localization/messages";

const dictionaries = {
  english: {
    PRESENT: "English",
    EMPTY: "Reference",
    INVALID: "Valid",
    ENGLISH_ONLY: "English only",
  },
  nepali: { PRESENT: "अनुवाद", EMPTY: " ", INVALID: 7, NEPALI_ONLY: "नेपाली" },
  keys: [
    "PRESENT",
    "EMPTY",
    "INVALID",
    "ENGLISH_ONLY",
    "NEPALI_ONLY",
    "MISSING_BOTH",
  ],
  observedKeys: [],
};

test("audit reports raw language gaps and distinguishes English fallback from key fallback", () => {
  const rows = auditTranslations("nepali", null, dictionaries);
  assert.deepEqual(
    rows.map((row) => row.key),
    ["EMPTY", "ENGLISH_ONLY", "INVALID", "MISSING_BOTH"],
  );
  assert.equal(rows.find((row) => row.key === "EMPTY")?.reason, "empty");
  assert.equal(rows.find((row) => row.key === "INVALID")?.reason, "invalid");
  assert.equal(
    rows.find((row) => row.key === "ENGLISH_ONLY")?.display,
    "English only",
  );
  assert.equal(
    rows.find((row) => row.key === "MISSING_BOTH")?.display,
    "MISSING_BOTH",
  );
  assert.equal(rows.find((row) => row.key === "MISSING_BOTH")?.fallback, "key");
  assert.deepEqual(
    auditTranslations("english", null, dictionaries).map((row) => row.key),
    ["MISSING_BOTH", "NEPALI_ONLY"],
  );
});

test("audit covers sparse custom files and updates when their entries are filled", () => {
  const missing = auditTranslations(
    "custom",
    { PRESENT: "Custom" },
    dictionaries,
  );
  assert.equal(missing.length, 5);
  assert.equal(
    missing.find((row) => row.key === "INVALID")?.fallback,
    "english",
  );
  const updated = auditTranslations(
    "custom",
    { PRESENT: "Custom", EMPTY: "Filled" },
    dictionaries,
  );
  assert.equal(updated.length, 4);
  assert.ok(!updated.some((row) => row.key === "EMPTY"));
});

test("keys absent from every dictionary remain discoverable from code references and runtime lookups", () => {
  assert.ok(
    auditTranslations("english", null, dictionaries).some(
      (row) => row.key === "MISSING_BOTH",
    ),
  );
  const messages = createLocaleMessages({}, {});
  assert.equal(
    messages.DYNAMIC_MISSING_LOCALE_KEY,
    "DYNAMIC_MISSING_LOCALE_KEY",
  );
  assert.ok(
    auditTranslations("english").some(
      (row) => row.key === "DYNAMIC_MISSING_LOCALE_KEY",
    ),
  );
});

test("audit fallback previews expand shared locale references while retaining the raw English reference", () => {
  const rows = auditTranslations(
    "custom",
    { SOFTWARE_NAME: "My Shop" },
    {
      english: { SOFTWARE_NAME: "POS", HOME: "${SOFTWARE_NAME}" },
      nepali: {},
      keys: ["HOME"],
      observedKeys: [],
    },
  );
  assert.equal(
    rows.find((row) => row.key === "HOME")?.english,
    "${SOFTWARE_NAME}",
  );
  assert.equal(rows.find((row) => row.key === "HOME")?.display, "My Shop");
});
