import { useLocaleText } from "../../contexts/Locale";
import { LocaleSelection } from "../../localization/locale";
import Select from "../Forms/Select";

/** The parent settings form owns the draft; selecting an option does not apply it. */
export default function LanguageSettings({
  value,
  customAvailable,
  onChange,
}: {
  value: LocaleSelection;
  customAvailable: boolean;
  onChange: (value: LocaleSelection) => void;
}) {
  const t = useLocaleText();
  return (
    <section
      className="settings-section"
      aria-labelledby="locale-selection-title"
    >
      <h2 id="locale-selection-title">{t("LOCALE_SELECTION_TITLE")}</h2>
      <div className="settings-field">
        <div>
          <label htmlFor="locale-selection">{t("LOCALE_SELECT_LABEL")}</label>
          <p id="locale-selection-help">{t("LOCALE_SELECTION_DESCRIPTION")}</p>
        </div>
        <div className="settings-control">
          <Select
            id="locale-selection"
            value={value}
            aria-describedby="locale-selection-help"
            onChange={(selection) =>
              onChange(
                selection === "nepali"
                  ? "nepali"
                  : selection === "custom"
                    ? "custom"
                    : "english",
              )
            }
          >
            <option value="english">{t("LOCALE_ENGLISH")}</option>
            <option value="nepali">{t("LOCALE_NEPALI")}</option>
            {customAvailable && (
              <option value="custom">{t("LOCALE_CUSTOM")}</option>
            )}
          </Select>
          <p>
            {t(
              customAvailable
                ? "LOCALE_CUSTOM_AVAILABLE"
                : "LOCALE_CUSTOM_UNAVAILABLE",
            )}
          </p>
        </div>
      </div>
    </section>
  );
}
