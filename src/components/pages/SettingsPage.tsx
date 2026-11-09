import Select from "../Forms/Select";
import DatabaseResetSettings from "../Settings/DatabaseResetSettings";
import LanguageSettings from "../Settings/LanguageSettings";
import { LocaleSelection, selectLocale } from "../../localization/locale";
import InstallationSettings from "../Settings/InstallationSettings";
import LocaleSettings from "../Settings/LocaleSettings";
import {
  getLocaleText,
  useLocalePreferences,
  useLocaleText,
} from "../../contexts/Locale";
import PageHeader from "../Layout/PageHeader";
import BackupSettings from "../Settings/BackupSettings";
import DemoSettings from "../Workspace/DemoSettings";
import { ReactNode, useEffect, useState } from "react";
import { useClientGlobal } from "../../contexts/ClientGlobal";
import {
  getDeviceDefaults,
  fieldError,
  orderModeError,
  saveSettings,
  settingsSchema,
  SettingField,
  SettingsDraft,
  toDraft,
} from "../../settings/settings";
import "./SettingsPage.css";

function SettingsCategory({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <details className="settings-category">
      <summary>
        <h2>{title}</h2>
      </summary>
      <div className="settings-category-content">{children}</div>
    </details>
  );
}

export default function SettingsPage() {
  const t = useLocaleText();
  const settings = useClientGlobal();
  const preferences = useLocalePreferences();
  const [draft, setDraft] = useState<{
    settings: SettingsDraft;
    language: LocaleSelection;
  } | null>(null);
  const [status, setStatus] = useState("");
  const savedDraft = toDraft(settings);
  const displayDraft = draft?.settings ?? savedDraft;
  const displayLanguage = draft?.language ?? preferences.selection;
  const dirty =
    JSON.stringify(displayDraft) !== JSON.stringify(savedDraft) ||
    displayLanguage !== preferences.selection;
  const modeError = orderModeError(displayDraft, t);
  const invalid =
    modeError ||
    settingsSchema.some((field) =>
      fieldError(field, displayDraft[field.key], t),
    ) ||
    (displayLanguage === "custom" && !preferences.custom);

  // Preserve edits if another tab changes settings; Discard loads the latest values.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const update = (key: keyof SettingsDraft, value: string | boolean) => {
    setDraft({
      settings: { ...displayDraft, [key]: value },
      language: displayLanguage,
    });
    setStatus("");
  };
  const decimals = Number(displayDraft.numOfDecimalPlaces);
  const preview = fieldError(
    settingsSchema.find((field) => field.key === "numOfDecimalPlaces")!,
    displayDraft.numOfDecimalPlaces,
    t,
  )
    ? t("UI_ENTER_VALID_DECIMAL_PLACES_TO_PREVIEW")
    : `${displayDraft.currencyCharacter}${(1234.5).toFixed(decimals)}`;

  const renderGroup = (
    group: SettingField["group"],
    label: string,
    collapsible = false,
  ) => {
    const heading = <h3 id={`group-${group}`}>{t(label)}</h3>;
    const section = (
      <section className="settings-section" aria-labelledby={`group-${group}`}>
        {!collapsible && heading}
        {settingsSchema
          .filter((field) => field.group === group)
          .map((field) => {
            const id = `setting-${field.key}`;
            const error = fieldError(field, displayDraft[field.key], t);
            return (
              <div className="settings-field" key={field.key}>
                <div>
                  <label htmlFor={id}>{t(field.label)}</label>
                  <p id={`${id}-help`}>{t(field.description)}</p>
                </div>
                <div className="settings-control">
                  {field.type === "boolean" ? (
                    <label className="settings-toggle">
                      <input
                        id={id}
                        type="checkbox"
                        role="switch"
                        disabled={
                          (field.key === "forceStockAdherence" &&
                            !displayDraft.stockManagement) ||
                          ((field.key === "showOrderActions" ||
                            field.key === "compactOtherViews") &&
                            !displayDraft.compactUI)
                        }
                        checked={Boolean(displayDraft[field.key])}
                        onChange={(event) =>
                          update(field.key, event.target.checked)
                        }
                        aria-describedby={`${id}-help`}
                      />
                      <span
                        aria-hidden="true"
                        className="settings-toggle-track"
                      />
                      <span>
                        {displayDraft[field.key] ? t("UI_ON") : t("UI_OFF")}
                      </span>
                    </label>
                  ) : field.type === "select" ? (
                    <Select
                      id={id}
                      value={String(displayDraft[field.key])}
                      aria-describedby={`${id}-help`}
                      onChange={(value) => update(field.key, value)}
                    >
                      {field.options.map(({ value, label }) => (
                        <option key={value} value={value}>
                          {label ? t(label) : value}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <input
                      id={id}
                      type={field.type === "number" ? "number" : "text"}
                      value={String(displayDraft[field.key])}
                      min={field.min}
                      max={field.max}
                      step={field.integer ? 1 : "any"}
                      maxLength={field.maxLength}
                      aria-invalid={!!error}
                      aria-describedby={`${id}-help${error ? ` ${id}-error` : ""}`}
                      onChange={(event) =>
                        update(field.key, event.target.value)
                      }
                    />
                  )}
                  {error && (
                    <p className="settings-error" id={`${id}-error`}>
                      {error}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        {group === "Purchasing" && modeError && (
          <p className="settings-error" role="alert">
            {modeError}
          </p>
        )}
        {group === "Prices" && (
          <div className="settings-preview">
            <span>{t("UI_PRICE_PREVIEW")}</span>
            <output>{preview}</output>
            <small>
              {t(
                "UI_DISPLAY_FORMATTING_ONLY_TRANSACTION_AMOUNTS_STAY_THE_SAME",
              )}
            </small>
          </div>
        )}
      </section>
    );
    return collapsible ? (
      <details className="settings-category settings-subcategory">
        <summary>{heading}</summary>
        {section}
      </details>
    ) : (
      section
    );
  };

  return (
    <main className="settings-page">
      <PageHeader
        title={t("NAVBAR_SETTINGS")}
        eyebrow={t("UI_MAKE_IT_YOURS")}
        description={t("UI_SET_UP_YOUR_WORKSPACE_CHANGES_ARE_SAVED_ON_THIS")}
        actions={
          <div className="settings-actions">
            <div className="settings-action-buttons">
              <button
                type="button"
                disabled={!dirty}
                onClick={() => {
                  setDraft(null);
                  setStatus(t("UI_CHANGES_DISCARDED"));
                }}
              >
                {t("UI_DISCARD")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraft({
                    settings: toDraft(getDeviceDefaults()),
                    language: "english",
                  });
                  setStatus(t("UI_DEFAULTS_LOADED_SAVE_CHANGES_TO_APPLY"));
                }}
              >
                {t("UI_RESTORE_DEFAULTS")}
              </button>
              <button
                className="settings-save"
                type="submit"
                form="workspace-settings"
                disabled={!dirty || !!invalid}
              >
                {t("UI_SAVE_CHANGES_2")}
              </button>
            </div>
            <p role="status" aria-live="polite">
              {status ||
                (dirty
                  ? t("UI_YOU_HAVE_UNSAVED_CHANGES")
                  : t("UI_ALL_CHANGES_SAVED"))}
            </p>
          </div>
        }
      />
      <form
        id="workspace-settings"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (!dirty || invalid) return;
          try {
            saveSettings(displayDraft);
            if (displayLanguage !== preferences.selection)
              selectLocale(displayLanguage);
            setDraft(null);
            setStatus(getLocaleText("UI_SETTINGS_SAVED"));
          } catch (error) {
            setStatus(
              error instanceof Error && error.message.includes(":")
                ? error.message
                : t("UI_UNABLE_TO_SAVE_SETTINGS_CHECK_BROWSER_STORAGE_AND_TRY"),
            );
          }
        }}
      >
        <SettingsCategory title={t("SETTINGS_ORDER_ENTRY")}>
          {renderGroup("Purchasing", "ORDER_MODES_SETTINGS")}
          {renderGroup("Order", "PICKER_SETTINGS")}
          {renderGroup("Stock", "STOCK_TITLE")}
        </SettingsCategory>
        <SettingsCategory title={t("SETTINGS_DISPLAY")}>
          {renderGroup("Appearance", "UI_APPEARANCE")}
          {renderGroup("Prices", "UI_PRICES")}
        </SettingsCategory>
        <SettingsCategory title={t("SETTINGS_HISTORY")}>
          {renderGroup("History", "SETTINGS_HISTORY_FILTERS", true)}
          {renderGroup("Dashboard", "REPORT_DASHBOARD", true)}
          {renderGroup("Overview", "REPORT_OVERVIEW", true)}
        </SettingsCategory>
        <SettingsCategory title={t("SETTINGS_LANGUAGE")}>
          <LanguageSettings
            value={displayLanguage}
            customAvailable={!!preferences.custom}
            onChange={(language) => {
              setDraft({ settings: displayDraft, language });
              setStatus("");
            }}
          />
          <LocaleSettings />
        </SettingsCategory>
        <SettingsCategory title={t("SETTINGS_WORKSPACE_DATA")}>
          <DemoSettings />
          <BackupSettings />
          {renderGroup("Deletion", "DELETED_CATEGORY")}
          <DatabaseResetSettings />
        </SettingsCategory>
        <SettingsCategory title={t("SETTINGS_INSTALLATION")}>
          <InstallationSettings />
        </SettingsCategory>
      </form>
    </main>
  );
}
