import { useEffect, useMemo, useState } from "react";
import { useDatabase } from "../contexts/DatabaseContext";
import { DashboardRange } from "../dashboard/period";
import SupplierInsightsController, {
  SupplierInsightsSummary,
} from "../controllers/SupplierInsightsController";
import SupplierInsightsStore from "../database/SupplierInsightsStore";
import useDeletionRevision from "./useDeletionRevision";

export default function useSupplierInsights(
  range: DashboardRange,
  refresh: number,
) {
  const { database } = useDatabase();
  const revision = useDeletionRevision();
  const controller = useMemo(
    () => new SupplierInsightsController(new SupplierInsightsStore(database)),
    [database],
  );
  const [state, setState] = useState<{
    data: SupplierInsightsSummary | null;
    busy: boolean;
    error: boolean;
  }>({ data: null, busy: true, error: false });
  useEffect(() => {
    let cancelled = false;
    setState({ data: null, busy: true, error: false });
    void controller
      .getSummary(range)
      .then((data) => {
        if (!cancelled) setState({ data, busy: false, error: false });
      })
      .catch(() => {
        if (!cancelled) setState({ data: null, busy: false, error: true });
      });
    return () => {
      cancelled = true;
    };
  }, [controller, range, refresh, revision]);
  return state;
}
