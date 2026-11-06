import useDeletionRevision from "./useDeletionRevision";
import { useEffect, useMemo, useState } from "react";
import { useDatabase } from "../contexts/DatabaseContext";
import DashboardController, {
  DashboardSummary,
} from "../controllers/DashboardController";
import DashboardOS from "../database/DashboardOS";
import { DashboardRange } from "../dashboard/period";

/** Ignore stale requests when date controls or the active workspace change. */
export default function useDashboardSummary(
  range: DashboardRange | null,
  refresh: number,
) {
  const revision = useDeletionRevision();
  const { database } = useDatabase();
  const controller = useMemo(
    () => new DashboardController(new DashboardOS(database)),
    [database],
  );
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState(false);
  const start = range?.start,
    end = range?.end,
    all = range?.all,
    includeDeleted = range?.includeDeleted;
  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(false);
    if (start === undefined || end === undefined) {
      setBusy(false);
      return;
    }
    setBusy(true);
    controller
      .getSummary({ start, end, all, includeDeleted })
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [controller, start, end, all, includeDeleted, refresh, revision]);
  return { data, busy, error };
}
