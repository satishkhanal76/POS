import knownKeys from "virtual:locale-keys";
import { useMemo, useState } from "react";
import { useLocalePreferences, useLocaleText } from "../../contexts/Locale";
import { LocaleSelection } from "../../localization/locale";
import {
  auditTranslations,
  MissingTranslation,
} from "../../localization/audit";
import Select from "../Forms/Select";
import CatalogSearch from "../Forms/CatalogSearch";
import CustomTableView, { CustomTableColumn } from "../utils/CustomTableView";
import PaginationControls from "../utils/PaginationControls";

export default function MissingTranslationsSettings() {
  const t = useLocaleText();
  const preferences = useLocalePreferences();
  const [language, setLanguage] = useState<LocaleSelection>(
    preferences.selection,
  );
  const [search, setSearch] = useState("");
  const [revision, setRevision] = useState(0);
  const [requestedPage, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const selected =
    language === "custom" && !preferences.custom ? "english" : language;
  const missing = useMemo(() => {
    void revision;
    return auditTranslations(selected, preferences.custom, { keys: knownKeys });
  }, [selected, preferences.custom, revision]);
  const query = search.trim().toLocaleLowerCase();
  const rows = missing.filter((row) =>
    `${row.key} ${row.english ?? ""}`.toLocaleLowerCase().includes(query),
  );
  const size = pageSize || Math.max(1, rows.length);
  const page = Math.min(
    requestedPage,
    Math.max(1, Math.ceil(rows.length / size)),
  );
  const columns: CustomTableColumn<MissingTranslation>[] = [
    {
      key: "key",
      header: t("LOCALE_AUDIT_KEY"),
      render: (row) => <code className="locale-audit-key">{row.key}</code>,
    },
    {
      key: "english",
      header: t("LOCALE_AUDIT_ENGLISH"),
      render: (row) => row.english ?? "—",
    },
    {
      key: "reason",
      header: t("LOCALE_AUDIT_PROBLEM"),
      render: (row) =>
        t(
          row.reason === "missing"
            ? "LOCALE_AUDIT_ABSENT"
            : row.reason === "empty"
              ? "LOCALE_AUDIT_EMPTY"
              : "LOCALE_AUDIT_INVALID",
        ),
    },
    {
      key: "fallback",
      header: t("LOCALE_AUDIT_DISPLAY"),
      render: (row) => (
        <>
          {row.display}
          <small className="locale-audit-fallback">
            {t(
              row.fallback === "english"
                ? "LOCALE_AUDIT_USES_ENGLISH"
                : "LOCALE_AUDIT_USES_KEY",
            )}
          </small>
        </>
      ),
    },
  ];
  return (
    <section
      className="settings-section locale-audit"
      aria-labelledby="locale-audit-title"
    >
      <h3 id="locale-audit-title">{t("LOCALE_AUDIT_TITLE")}</h3>
      <p>{t("LOCALE_AUDIT_HELP")}</p>
      <PaginationControls
        className="catalog-toolbar"
        filters={
          <>
            <label className="pagination-field">
              {t("LOCALE_AUDIT_LANGUAGE")}
              <Select
                aria-label={t("LOCALE_AUDIT_LANGUAGE")}
                value={selected}
                onChange={(value) => {
                  setLanguage(value as LocaleSelection);
                  setPage(1);
                }}
              >
                <option value="english">{t("LOCALE_ENGLISH")}</option>
                <option value="nepali">{t("LOCALE_NEPALI")}</option>
                {preferences.custom && (
                  <option value="custom">{t("LOCALE_CUSTOM")}</option>
                )}
              </Select>
            </label>
            <CatalogSearch
              label={t("LOCALE_AUDIT_SEARCH")}
              placeholder={t("LOCALE_AUDIT_SEARCH")}
              value={search}
              onChange={(value) => {
                setSearch(value);
                setPage(1);
              }}
            />
          </>
        }
        showSort={false}
        page={page}
        pageSize={pageSize}
        sort="newest"
        total={rows.length}
        busy={false}
        onChange={(change) => {
          if (change.pageSize !== undefined) setPageSize(change.pageSize);
          setPage(change.page ?? 1);
        }}
      />
      <div className="workspace-buttons">
        <button type="button" onClick={() => setRevision((value) => value + 1)}>
          {t("DASH_REFRESH")}
        </button>
      </div>
      <p role="status">{t("LOCALE_AUDIT_COUNT", { count: missing.length })}</p>
      <CustomTableView
        label={t("LOCALE_AUDIT_TITLE")}
        columns={columns}
        data={rows.slice((page - 1) * size, page * size)}
        rowKey={(row) => row.key}
        emptyTitle={t(
          query ? "LOCALE_AUDIT_NO_MATCHES" : "LOCALE_AUDIT_COMPLETE",
        )}
      />
    </section>
  );
}
