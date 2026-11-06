import { useLocation, useSearchParams } from "react-router-dom";
import { useClientGlobal } from "../contexts/ClientGlobal";
export default function useDeletedVisibility() {
  const { showSoftDeletedToggle } = useClientGlobal();
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const includeDeleted = showSoftDeletedToggle && params.get("deleted") === "1";
  const change = (include: boolean) =>
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (include) next.set("deleted", "1");
        else next.delete("deleted");
        for (const key of [...next.keys()])
          if (key === "page" || key.endsWith("-page")) next.set(key, "1");
        return next;
      },
      { state: location.state },
    );
  return { enabled: showSoftDeletedToggle, includeDeleted, change };
}
