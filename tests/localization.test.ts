import nepali from "../src/data/Text_Nepali.json";
import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import english from "../src/data/Text_EN.json";
import {
  getLocaleState,
  getLocaleText,
  rt,
  saveCustomLocale,
  selectLocale,
  subscribeLocale,
  validateCustomLocale,
} from "../src/localization/locale";
import LocaleController from "../src/controllers/LocaleController";
import { resetEnvironment, storageChanged } from "./helpers/environment";

beforeEach(resetEnvironment);
test("the downloadable English dictionary is a valid custom locale", () => {
  assert.deepEqual(validateCustomLocale(english), english);
});
test("Nepali uses bundled translations and interpolates names", () => {
  selectLocale("nepali");
  assert.equal(getLocaleText("NAVBAR_ITEM_1"), nepali.NAVBAR_ITEM_1);
  assert.equal(getLocaleText("NAVBAR_SETTINGS"), nepali.NAVBAR_SETTINGS);
  assert.equal(
    getLocaleText("CUSTOMER_TRANSACTIONS_TITLE", { CUSTOMER_NAME: "Alex" }),
    rt(nepali.CUSTOMER_TRANSACTIONS_TITLE, { CUSTOMER_NAME: "Alex" }),
  );
});
test("upload saves custom text without changing the selected language", async () => {
  await new LocaleController().upload(
    new File([JSON.stringify({ NAVBAR_MANAGE: "Gérer" })], "custom.json"),
  );
  assert.equal(getLocaleState().selection, "english");
  assert.ok(getLocaleState().custom);
  selectLocale("custom");
  assert.equal(getLocaleText("NAVBAR_MANAGE"), "Gérer");
  assert.equal(getLocaleText("NAVBAR_SETTINGS"), english.NAVBAR_SETTINGS);
});
test("custom messages preserve interpolation and can reorder placeholders", () => {
  saveCustomLocale({ PAGINATION_RANGE: "${total}: ${start}–${end}" });
  selectLocale("custom");
  assert.equal(
    getLocaleText("PAGINATION_RANGE", { start: 1, end: 10, total: 35 }),
    "35: 1–10",
  );
  assert.equal(rt("Hello ${name}", { name: "Alex" }), "Hello Alex");
});
test("invalid JSON uploads and non-text entries are rejected", async () => {
  const controller = new LocaleController();
  await assert.rejects(() => controller.upload(new File(["{bad"], "bad.json")));
  for (const value of [
    null,
    [],
    { unknown: "x" },
    { NAVBAR_MANAGE: 3 },
    { NAVBAR_MANAGE: "" },
  ])
    assert.throws(() => validateCustomLocale(value));
  assert.equal(getLocaleState().custom, null);
});
test("missing or added placeholders cannot replace a valid custom locale", () => {
  saveCustomLocale({ NAVBAR_MANAGE: "Gérer" });
  for (const text of ["No count", "${wrong}", "${count} ${extra}"])
    assert.throws(() => saveCustomLocale({ TABLE_RECORD_COUNT_OTHER: text }));
  assert.equal(getLocaleState().custom?.NAVBAR_MANAGE, "Gérer");
});
test("switching back to English retains the custom dictionary", () => {
  saveCustomLocale({ NAVBAR_MANAGE: "Gérer" });
  selectLocale("custom");
  selectLocale("english");
  assert.equal(getLocaleText("NAVBAR_MANAGE"), "Manage");
  assert.ok(getLocaleState().custom);
});
test("custom cannot be selected before a file exists", () => {
  assert.throws(() => selectLocale("custom"));
  assert.equal(getLocaleState().selection, "english");
});
test("language selection persists and storage events refresh subscribers", () => {
  let updates = 0;
  const unsubscribe = subscribeLocale(() => {
    updates++;
  });
  selectLocale("nepali");
  assert.equal(
    JSON.parse(localStorage.getItem("pos.locale")!).selection,
    "nepali",
  );
  localStorage.setItem(
    "pos.locale",
    JSON.stringify({ selection: "custom", custom: { NAVBAR_MANAGE: "Gérer" } }),
  );
  storageChanged("pos.locale");
  assert.equal(getLocaleText("NAVBAR_MANAGE"), "Gérer");
  assert.equal(updates, 2);
  unsubscribe();
});
test("corrupt or cleared language preferences fall back to English", () => {
  const unsubscribe = subscribeLocale(() => {});
  localStorage.setItem("pos.locale", "{broken");
  storageChanged("pos.locale");
  assert.equal(getLocaleState().selection, "english");
  selectLocale("nepali");
  localStorage.clear();
  storageChanged(null);
  assert.equal(getLocaleState().selection, "english");
  unsubscribe();
});
test("failed storage writes do not change the active locale or notify subscribers", () => {
  const environment = resetEnvironment();
  let updates = 0;
  const unsubscribe = subscribeLocale(() => {
    updates++;
  });
  const before = getLocaleState();
  environment.local.failWrites = true;
  assert.throws(() => selectLocale("nepali"));
  assert.equal(getLocaleState(), before);
  assert.equal(updates, 0);
  unsubscribe();
});
