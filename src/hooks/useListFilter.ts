import { useLocation, useSearchParams } from "react-router-dom";

/** Preserve filters and reset pagination when a selection changes. */
export default function useListFilter(key: string, fallback = "all") {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const value = params.get(key) ?? fallback;
  const change = (value: string) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value === fallback) next.delete(key);
        else next.set(key, value);
        for (const name of [...next.keys()])
          if (name === "page" || name.endsWith("-page")) next.set(name, "1");
        return next;
      },
      { state: location.state },
    );
  return [value, change] as const;
}
