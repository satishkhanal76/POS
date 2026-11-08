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

test("unknown translations display their keys in English, Nepali, and custom locales", () => {
  for (const selection of ["english", "nepali", "custom"] as const) {
    if (selection === "custom") saveCustomLocale({ NAVBAR_MANAGE: "Custom" });
    selectLocale(selection);
    assert.equal(
      getLocaleText("MISSING_FUTURE_FEATURE"),
      "MISSING_FUTURE_FEATURE",
    );
    assert.equal(
      getLocaleState().messages.MISSING_DIRECT_LOOKUP,
      "MISSING_DIRECT_LOOKUP",
    );
    assert.equal(
      rt(getLocaleState().messages.MISSING_TEMPLATE, { amount: 3 }),
      "MISSING_TEMPLATE",
    );
  }
});

test("missing, empty, and invalid dictionary values use English then the key without changing exports", async () => {
  const { createLocaleMessages } = await import("../src/localization/messages");
  const raw = { EXISTING: "Hello ${name}", EMPTY: " ", INVALID: null };
  const messages = createLocaleMessages(raw, {
    EMPTY: "English",
    INVALID: "English value",
  });
  assert.equal(messages.MISSING, "MISSING");
  assert.equal(messages.EMPTY, "English");
  assert.equal(messages.INVALID, "English value");
  assert.equal(messages.toString, "toString");
  assert.equal(rt(messages.EXISTING, { name: "Alex" }), "Hello Alex");
  assert.deepEqual(Object.keys(messages), Object.keys(raw));
  assert.deepEqual(JSON.parse(JSON.stringify(messages)), {
    EXISTING: raw.EXISTING,
    EMPTY: "English",
    INVALID: "English value",
  });
  assert.equal(raw.EMPTY, " ");
});

test("React translation hooks and direct lookups tolerate a partial dictionary", async () => {
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { LocaleContext, useLocale, useLocaleText } =
    await import("../src/contexts/Locale");
  function MissingText() {
    const messages = useLocale();
    const t = useLocaleText();
    return createElement(
      "p",
      null,
      [
        t("MISSING_HOOK_KEY"),
        messages.MISSING_REACT_DIRECT,
        t("PAGINATION_RANGE", { start: 1, end: 2, total: 3 }),
      ].join(" | "),
    );
  }
  const html = renderToStaticMarkup(
    createElement(
      LocaleContext.Provider,
      { value: {} },
      createElement(MissingText),
    ),
  );
  assert.ok(
    html.includes("MISSING_HOOK_KEY | MISSING_REACT_DIRECT | 1–2 of 3"),
  );
});

test("locale references resolve for translated keys, direct lookups, and rt using the active dictionary", () => {
  saveCustomLocale({
    SOFTWARE_NAME: "Corner Shop",
    NAVBAR_ITEM_HOME: "${SOFTWARE_NAME}",
  });
  selectLocale("custom");
  assert.equal(getLocaleText("NAVBAR_ITEM_HOME"), "Corner Shop");
  assert.equal(getLocaleState().messages.NAVBAR_ITEM_HOME, "Corner Shop");
  assert.equal(rt("Welcome to ${SOFTWARE_NAME}", {}), "Welcome to Corner Shop");
  assert.equal(
    getLocaleText("NAVBAR_ITEM_HOME", { SOFTWARE_NAME: "Override" }),
    "Override",
  );
  selectLocale("english");
  assert.equal(getLocaleText("NAVBAR_ITEM_HOME"), english.SOFTWARE_NAME);
});

test("nested references support caller parameters without recursively interpreting user input", async () => {
  const { createLocaleMessages, translateMessage } =
    await import("../src/localization/messages");
  const messages = createLocaleMessages(
    {
      GREETING: "Welcome to ${BRAND}",
      BRAND: "${STORE_NAME} (${city})",
      STORE_NAME: "Shop",
    },
    {},
  );
  assert.equal(
    translateMessage(messages, "GREETING", { city: "Toronto" }),
    "Welcome to Shop (Toronto)",
  );
  assert.equal(
    translateMessage(messages, "GREETING", { BRAND: "${literal}" }),
    "Welcome to ${literal}",
  );
  assert.equal(
    translateMessage(messages, "GREETING", { BRAND: 0 }),
    "Welcome to 0",
  );
  assert.equal(
    translateMessage(messages, "GREETING", { BRAND: "" }),
    "Welcome to ",
  );
});

test("missing references and cycles remain visible without recursive failure", async () => {
  const { createLocaleMessages, translateMessage } =
    await import("../src/localization/messages");
  const messages = createLocaleMessages(
    {
      A: "${B}",
      B: "${A}",
      SELF: "${SELF}",
      UNKNOWN: "${NOT_PRESENT}",
      TWICE: "${NAME} ${NAME}",
      NAME: "Shop",
    },
    {},
  );
  assert.equal(messages.A, "${A}");
  assert.equal(translateMessage(messages, "A"), "${A}");
  assert.equal(messages.SELF, "${SELF}");
  assert.equal(messages.UNKNOWN, "${NOT_PRESENT}");
  assert.equal(messages.TWICE, "Shop Shop");
  assert.equal(
    translateMessage(messages, "A", { A: "Break cycle" }),
    "Break cycle",
  );
  const chain: Record<string, string> = {};
  for (let index = 0; index < 100; index++)
    chain[`KEY_${index}`] = `\${KEY_${index + 1}}`;
  assert.match(createLocaleMessages(chain, {}).KEY_0, /\$\{KEY_\d+\}/);
});

test("custom locale validation resolves reference graphs while preserving required runtime placeholders", () => {
  assert.deepEqual(
    validateCustomLocale({ NAVBAR_ITEM_HOME: "${SOFTWARE_NAME}" }),
    { NAVBAR_ITEM_HOME: "${SOFTWARE_NAME}" },
  );
  assert.throws(() =>
    validateCustomLocale({ NAVBAR_ITEM_HOME: "${unknown_parameter}" }),
  );
  assert.throws(() =>
    validateCustomLocale({
      SOFTWARE_NAME: "${count}",
      NAVBAR_ITEM_HOME: "${SOFTWARE_NAME}",
    }),
  );
  assert.throws(() =>
    validateCustomLocale({ TABLE_RECORD_COUNT_OTHER: "${SOFTWARE_NAME}" }),
  );
  saveCustomLocale({
    SOFTWARE_NAME: "${PWA_APP_NAME}",
    PWA_APP_NAME: "Nested Shop",
  });
  selectLocale("custom");
  assert.equal(getLocaleText("NAVBAR_ITEM_HOME"), "Nested Shop");
});

test("React hooks use the provider's dictionary for references and explicit overrides", async () => {
  const { createElement } = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { LocaleContext, useLocale, useLocaleText } =
    await import("../src/contexts/Locale");
  function ReferencedText() {
    const messages = useLocale();
    const t = useLocaleText();
    return createElement(
      "p",
      null,
      `${messages.NAVBAR_ITEM_HOME} | ${t("NAVBAR_ITEM_HOME", { SOFTWARE_NAME: "Override" })}`,
    );
  }
  const html = renderToStaticMarkup(
    createElement(
      LocaleContext.Provider,
      {
        value: {
          NAVBAR_ITEM_HOME: "${SOFTWARE_NAME}",
          SOFTWARE_NAME: "Provider Shop",
        },
      },
      createElement(ReferencedText),
    ),
  );
  assert.equal(html, "<p>Provider Shop | Override</p>");
});
