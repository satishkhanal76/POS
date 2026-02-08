import React, { useEffect, useMemo, useState } from "react";
import defaultClientGlobal from "../../data/ClientGlobal.json";

type ClientGlobal = typeof defaultClientGlobal;

type FieldType = "string" | "number" | "boolean";

type FieldSchema = {
  key: keyof ClientGlobal;
  label: string;
  description?: string;
  type: FieldType;
  // number
  min?: number;
  max?: number;
  step?: number;
  // string
  options?: string[]; // if provided, render as a select
};

const STORAGE_KEY = "pos.clientGlobal";
const UPDATE_EVENT = "clientGlobal:updated";

function loadClientGlobal(): ClientGlobal {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultClientGlobal } as ClientGlobal;

    const parsed = JSON.parse(raw) as Partial<ClientGlobal>;
    return { ...defaultClientGlobal, ...parsed } as ClientGlobal;
  } catch {
    return { ...defaultClientGlobal } as ClientGlobal;
  }
}

function saveClientGlobal(next: ClientGlobal) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  // Let the rest of the app react without a hard dependency.
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: next }));
}

function resetClientGlobal() {
  localStorage.removeItem(STORAGE_KEY);
  const reset = { ...defaultClientGlobal } as ClientGlobal;
  window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: reset }));
  return reset;
}

const SettingsPage = () => {
  const schema: FieldSchema[] = useMemo(
    () => [
      {
        key: "currencyCharacter",
        label: "Currency symbol",
        description: "Shown next to prices (e.g., $, CA$, EUR, NPR).",
        type: "string",
        options: ["$", "CA$", "USD", "EUR", "GBP", "NPR", "INR", "JPY"],
      },
      {
        key: "numOfDecimalPlaces",
        label: "Decimal places",
        description: "How many digits to show after the decimal (e.g., 2 for $9.99).",
        type: "number",
        min: 0,
        max: 6,
        step: 1,
      },
    ],
    []
  );

  const [draft, setDraft] = useState<ClientGlobal>(() => {
    // localStorage is available in browser only; safe in a client app.
    return loadClientGlobal();
  });

  const [savedSnapshot, setSavedSnapshot] = useState<ClientGlobal>(() => loadClientGlobal());
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    // If another tab or another part of the app updates the settings, reflect it here.
    const onUpdated = (e: Event) => {
      const ce = e as CustomEvent<ClientGlobal>;
      if (!ce.detail) return;
      setDraft(ce.detail);
      setSavedSnapshot(ce.detail);
    };

    window.addEventListener(UPDATE_EVENT, onUpdated as EventListener);

    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      const next = loadClientGlobal();
      setDraft(next);
      setSavedSnapshot(next);
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener(UPDATE_EVENT, onUpdated as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const dirty = useMemo(() => {
    return JSON.stringify(draft) !== JSON.stringify(savedSnapshot);
  }, [draft, savedSnapshot]);

  const updateField = (key: keyof ClientGlobal, value: unknown) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setStatus("");
  };

  const validate = (): string | null => {
    const decimals = draft.numOfDecimalPlaces;
    if (!Number.isInteger(decimals)) return "Decimal places must be an integer.";
    if (decimals < 0 || decimals > 6) return "Decimal places must be between 0 and 6.";

    const cur = (draft.currencyCharacter ?? "").trim();
    if (!cur) return "Currency symbol cannot be empty.";

    return null;
  };

  const onSave = () => {
    const err = validate();
    if (err) {
      setStatus(err);
      return;
    }

    const next = {
      ...draft,
      currencyCharacter: draft.currencyCharacter.trim(),
    } as ClientGlobal;

    saveClientGlobal(next);
    setSavedSnapshot(next);
    setDraft(next);
    setStatus("Saved.");
  };

  const onReset = () => {
    const reset = resetClientGlobal();
    setSavedSnapshot(reset);
    setDraft(reset);
    setStatus("Reset to defaults.");
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "1.25rem" }}>
      <h1 style={{ marginBottom: "0.25rem" }}>Settings</h1>
      <p style={{ marginTop: 0, opacity: 0.85 }}>
        Change how the app displays values. These settings are saved locally on this device.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: "1rem",
        }}
      >
        <div
          style={{
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 10,
            padding: "1rem",
          }}
        >
          {schema.map((field) => {
            const value = draft[field.key];

            return (
              <div key={String(field.key)} style={{ padding: "0.75rem 0" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem" }}>
                  <label style={{ fontWeight: 700 }}>{field.label}</label>
                  {field.description ? (
                    <span style={{ opacity: 0.75, fontSize: "0.95rem" }}>{field.description}</span>
                  ) : null}
                </div>

                <div style={{ marginTop: "0.5rem" }}>
                  {field.type === "string" && field.options?.length ? (
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                      <select
                        value={String(value ?? "")}
                        onChange={(e) => updateField(field.key, e.target.value)}
                        style={{ padding: "0.5rem 0.6rem", borderRadius: 8 }}
                      >
                        {field.options.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                        <option value="__custom__">Custom...</option>
                      </select>

                      {String(value) === "__custom__" ? null : (
                        <input
                          type="text"
                          value={String(value ?? "")}
                          onChange={(e) => updateField(field.key, e.target.value)}
                          placeholder="$"
                          aria-label={field.label}
                          style={{ padding: "0.5rem 0.6rem", borderRadius: 8, width: 140 }}
                        />
                      )}

                      <span style={{ opacity: 0.8 }}>
                        Preview: <strong>{String(draft.currencyCharacter)}9.99</strong>
                      </span>
                    </div>
                  ) : field.type === "string" ? (
                    <input
                      type="text"
                      value={String(value ?? "")}
                      onChange={(e) => updateField(field.key, e.target.value)}
                      aria-label={field.label}
                      style={{ padding: "0.5rem 0.6rem", borderRadius: 8, width: 220 }}
                    />
                  ) : field.type === "number" ? (
                    <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
                      <input
                        type="number"
                        value={Number(value)}
                        min={field.min}
                        max={field.max}
                        step={field.step ?? 1}
                        onChange={(e) => updateField(field.key, Number(e.target.value))}
                        aria-label={field.label}
                        style={{ padding: "0.5rem 0.6rem", borderRadius: 8, width: 140 }}
                      />
                      <span style={{ opacity: 0.8 }}>
                        Preview: <strong>{String(draft.currencyCharacter)}{(9.9).toFixed(draft.numOfDecimalPlaces)}</strong>
                      </span>
                    </div>
                  ) : field.type === "boolean" ? (
                    <label style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
                      <input
                        type="checkbox"
                        checked={Boolean(value)}
                        onChange={(e) => updateField(field.key, e.target.checked)}
                      />
                      <span>{Boolean(value) ? "On" : "Off"}</span>
                    </label>
                  ) : null}
                </div>
              </div>
            );
          })}

          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              alignItems: "center",
              flexWrap: "wrap",
              paddingTop: "0.75rem",
              borderTop: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <button
              onClick={onSave}
              disabled={!dirty}
              style={{
                padding: "0.55rem 1rem",
                borderRadius: 999,
                cursor: dirty ? "pointer" : "not-allowed",
              }}
            >
              Save
            </button>

            <button
              onClick={onReset}
              style={{
                padding: "0.55rem 1rem",
                borderRadius: 999,
              }}
            >
              Reset
            </button>

            <span style={{ opacity: status ? 0.9 : 0.6 }}>{status || (dirty ? "Unsaved changes." : "Up to date.")}</span>
          </div>
        </div>

        <div
          style={{
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 10,
            padding: "1rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <h2 style={{ margin: 0 }}>Current values</h2>
            <span style={{ opacity: 0.7, fontSize: "0.9rem" }}>Stored in localStorage</span>
          </div>
          <pre
            style={{
              marginTop: "0.75rem",
              padding: "0.85rem",
              borderRadius: 10,
              overflow: "auto",
              background: "rgba(0,0,0,0.25)",
            }}
          >
            {JSON.stringify(draft, null, 2)}
          </pre>
        </div>
      </div>

      <div style={{ marginTop: "1.25rem", opacity: 0.85 }}>
        <p style={{ marginBottom: "0.25rem" }}>
          <strong>Best practice going forward:</strong> keep this JSON as the defaults, and define a small
          schema (label/description/min/max/options) so the UI can render correctly for each type.
        </p>
        <p style={{ marginTop: 0 }}>
          Then provide these settings to the rest of your app via a Context/store. This page already emits
          a window event ("{UPDATE_EVENT}") so you can subscribe anywhere.
        </p>
      </div>
    </div>
  );
};

export default SettingsPage;