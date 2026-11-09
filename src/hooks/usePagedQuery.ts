import { useEffect, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import {
  PageOptions,
  PageResult,
  historySorts,
  PageSort,
  pageSizes,
} from "../database/Pagination";

/** URL-backed controls preserve the selected page when returning from detail views. */
export default function usePagedQuery<T>(
  query: (options: PageOptions) => Promise<PageResult<T>>,
  prefix = "",
  defaultSort: PageSort = "newest",
  allowedSorts: readonly PageSort[] = historySorts,
  defaultPageSize = 10,
) {
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const param = (key: string) => (prefix ? `${prefix}-${key}` : key);
  const page = Math.max(1, Number(params.get(param("page"))) || 1);
  const requestedSize = Number(params.get(param("pageSize")));
  const pageSize =
    params.has(param("pageSize")) &&
    pageSizes.some((size) => size === requestedSize)
      ? requestedSize
      : defaultPageSize;
  const requestedSort = params.get(param("sort")) as PageSort;
  const sort = allowedSorts.includes(requestedSort)
    ? requestedSort
    : defaultSort;
  const [state, setState] = useState<{
    result: PageResult<T> | null;
    loading: boolean;
    error: boolean;
  }>({ result: null, loading: true, error: false });
  useEffect(() => {
    let cancelled = false;
    setState({ result: null, loading: true, error: false });
    query({ page, pageSize, sort })
      .then((result) => {
        if (!cancelled) setState({ result, loading: false, error: false });
      })
      .catch(() => {
        if (!cancelled) setState({ result: null, loading: false, error: true });
      });
    return () => {
      cancelled = true;
    };
  }, [query, page, pageSize, sort]);
  const change = (changes: Partial<PageOptions>) => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.set(param("page"), String(changes.page ?? 1));
        if (changes.pageSize !== undefined)
          next.set(param("pageSize"), String(changes.pageSize));
        if (changes.sort) next.set(param("sort"), changes.sort);
        return next;
      },
      { state: location.state },
    );
  };
  return { ...state, page: state.result?.page ?? page, pageSize, sort, change };
}
