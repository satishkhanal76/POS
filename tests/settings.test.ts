import { beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import {
  defaultSettings,
  loadSettings,
  parseDraft,
  saveSettings,
  STORAGE_KEY,
  toDraft,
  UPDATE_EVENT,
} from "../src/settings/settings";
import { resetEnvironment } from "./helpers/environment";

beforeEach(resetEnvironment);
test("new or unreadable settings use defaults", () => {
  assert.deepEqual(loadSettings(), defaultSettings);
  for (const invalid of [
    "null",
    "[]",
    "{broken",
    '{"numOfDecimalPlaces":900,"currencyCharacter":null,"darkMode":"yes"}',
  ]) {
    localStorage.setItem(STORAGE_KEY, invalid);
    assert.deepEqual(loadSettings(), defaultSettings);
  }
});
test("older settings inherit new fields without losing valid stored values", () => {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ currencyCharacter: "NPR", numOfDecimalPlaces: 3 }),
  );
  assert.deepEqual(loadSettings(), {
    ...defaultSettings,
    currencyCharacter: "NPR",
    numOfDecimalPlaces: 3,
  });
});
test("valid drafts save normalized strings, numbers, and booleans", () => {
  const saved = saveSettings({
    ...toDraft(defaultSettings),
    currencyCharacter: " CA$ ",
    numOfDecimalPlaces: "0",
    darkMode: true,
  });
  assert.deepEqual(saved, {
    ...defaultSettings,
    currencyCharacter: "CA$",
    numOfDecimalPlaces: 0,
    darkMode: true,
  });
  assert.deepEqual(loadSettings(), saved);
});
test("invalid decimal values cannot reach the price formatter", () => {
  for (const value of ["", "-1", "7", "1.5", "Infinity", "NaN"]) {
    assert.throws(() =>
      parseDraft({ ...toDraft(defaultSettings), numOfDecimalPlaces: value }),
    );
  }
});
test("invalid text and toggles are rejected", () => {
  assert.throws(() =>
    parseDraft({ ...toDraft(defaultSettings), currencyCharacter: " " }),
  );
  assert.throws(() =>
    parseDraft({ ...toDraft(defaultSettings), darkMode: "true" }),
  );
});
test("subscribers are notified only after storage succeeds", () => {
  let events = 0;
  window.addEventListener(UPDATE_EVENT, () => {
    events++;
  });
  saveSettings(toDraft(defaultSettings));
  assert.equal(events, 1);
  const storage = resetEnvironment();
  storage.local.failWrites = true;
  window.addEventListener(UPDATE_EVENT, () => {
    events++;
  });
  assert.throws(() => saveSettings(toDraft(defaultSettings)));
  assert.equal(events, 1);
});
