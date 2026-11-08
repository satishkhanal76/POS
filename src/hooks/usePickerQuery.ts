import {
  PICKER_USAGE_UPDATED,
  PICKER_CATALOG_UPDATED,
} from "../pickers/events";
import FirstPageCache from "../pickers/FirstPageCache";
import { useCallback, useEffect, useRef, useState } from "react";
import useDeletionRevision from "./useDeletionRevision";
import { PickerOptions, PickerPage } from "../pickers/types";

/** Debounced database search with generation guards for close/reopen, typing and load-more races. */
export default function usePickerQuery<T extends { getId: () => string }>(
  open: boolean,
  load: (options: PickerOptions) => Promise<PickerPage<T>>,
  limit: number,
  recentFirst: boolean,
  purchase = false,
  preload = false,
) {
  const [query, setQuery] = useState(""),
    [retry, setRetry] = useState(0),
    [refresh, setRefresh] = useState(0);
  const [state, setState] = useState<{
    rows: T[];
    hasMore: boolean;
    loading: boolean;
    loadingMore: boolean;
    error: boolean;
  }>({
    rows: [],
    hasMore: false,
    loading: false,
    loadingMore: false,
    error: false,
  });
  const revision = useDeletionRevision(),
    generation = useRef(0),
    inFlight = useRef(false),
    active = useRef<PickerOptions | null>(null);
  const firstPage = useRef(new FirstPageCache<T>());
  useEffect(() => {
    if (!preload) return;
    let timer: ReturnType<typeof setTimeout>;
    let catalogDirty = false;
    const focus = () => {
      clearTimeout(timer);
      catalogDirty = false;
      setRetry((value) => value + 1);
    };
    const usageChanged = () => {
      // Coalesce bursts, but prioritize catalog invalidation over ranking refreshes.
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (catalogDirty) focus();
        else {
          firstPage.current.expire();
          setRefresh((value) => value + 1);
        }
      }, 40);
    };
    const catalogChanged = () => {
      catalogDirty = true;
      usageChanged();
    };
    window.addEventListener("focus", focus);
    window.addEventListener(PICKER_CATALOG_UPDATED, catalogChanged);
    window.addEventListener(PICKER_USAGE_UPDATED, usageChanged);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", focus);
      window.removeEventListener(PICKER_CATALOG_UPDATED, catalogChanged);
      window.removeEventListener(PICKER_USAGE_UPDATED, usageChanged);
    };
  }, [preload]);
  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);
  const invalidate = useCallback(() => ++generation.current, []);
  useEffect(() => {
    const current = invalidate();
    inFlight.current = false;
    active.current = null;
    if (!open && !preload) {
      setState({
        rows: [],
        hasMore: false,
        loading: false,
        loadingMore: false,
        error: false,
      });
      return;
    }
    const options = {
      query: open ? query : "",
      limit,
      recentFirst,
      purchase,
      offset: 0,
      now: Date.now(),
    };
    const cached =
      preload && !options.query.trim()
        ? firstPage.current.get(load, options, `${revision}:${retry}`)
        : null;
    active.current = cached?.options ?? options;
    inFlight.current = true;
    setState(
      cached?.result
        ? { ...cached.result, loading: false, loadingMore: false, error: false }
        : {
            rows: [],
            hasMore: false,
            loading: true,
            loadingMore: false,
            error: false,
          },
    );
    const run = () => {
      void (cached?.promise ?? load(options))
        .then((result) => {
          if (generation.current === current) {
            inFlight.current = false;
            setState({
              ...result,
              loading: false,
              loadingMore: false,
              error: false,
            });
          }
        })
        .catch(() => {
          if (generation.current === current) {
            inFlight.current = false;
            setState({
              rows: [],
              hasMore: false,
              loading: false,
              loadingMore: false,
              error: true,
            });
          }
        });
    };
    const timer = cached
      ? undefined
      : setTimeout(run, options.query.trim() ? 150 : 0);
    if (cached) run();
    return () => {
      clearTimeout(timer);
      invalidate();
    };
  }, [
    open,
    preload,
    load,
    query,
    limit,
    recentFirst,
    purchase,
    revision,
    retry,
    refresh,
    invalidate,
  ]);
  const loadMore = async () => {
    if (inFlight.current || state.loading || !state.hasMore || !active.current)
      return;
    inFlight.current = true;
    const current = generation.current;
    setState((value) => ({ ...value, loadingMore: true, error: false }));
    try {
      const result = await load({
        ...active.current,
        offset: state.rows.length,
      });
      if (current === generation.current)
        setState((value) => ({
          rows: [
            ...value.rows,
            ...result.rows.filter(
              (row) =>
                !value.rows.some(
                  (previous) => previous.getId() === row.getId(),
                ),
            ),
          ],
          hasMore: result.hasMore,
          loading: false,
          loadingMore: false,
          error: false,
        }));
    } catch {
      if (current === generation.current)
        setState((value) => ({ ...value, loadingMore: false, error: true }));
    } finally {
      if (current === generation.current) inFlight.current = false;
    }
  };
  return {
    ...state,
    query,
    setQuery,
    loadMore,
    retry: () => setRetry((value) => value + 1),
  };
}
