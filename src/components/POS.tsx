import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useClientGlobal } from "../contexts/ClientGlobal";
import OrderModeSwitch, { OrderMode } from "./POS/OrderModeSwitch";
import PurchasePOS from "./POS/PurchasePOS";
import SalePOS from "./POS/SalePOS";

export default function POS() {
  const { purchasing } = useClientGlobal();
  const [params, setParams] = useSearchParams();
  const requested = params.get("mode");
  const [mode, setMode] = useState<OrderMode>(
    requested === "purchase" ? "purchase" : "sale",
  );
  const [purchaseMounted, setPurchaseMounted] = useState(purchasing);
  useEffect(() => {
    if (purchasing) setPurchaseMounted(true);
  }, [purchasing]);
  useEffect(() => {
    setMode(requested === "purchase" ? "purchase" : "sale");
  }, [requested]);
  const activeMode = purchasing ? mode : "sale";
  const renderModeSwitch = (disabled: boolean) =>
    purchasing ? (
      <OrderModeSwitch
        mode={activeMode}
        disabled={disabled}
        onChange={(next) => {
          setMode(next);
          setParams(
            (current) => {
              const query = new URLSearchParams(current);
              query.set("mode", next);
              return query;
            },
            { replace: true },
          );
        }}
      />
    ) : null;
  // Keep both workspaces mounted so switching modes preserves each unsaved draft.
  return (
    <>
      <div className="pos-mode-panel" hidden={activeMode !== "sale"}>
        <SalePOS
          active={activeMode === "sale"}
          renderModeSwitch={renderModeSwitch}
        />
      </div>
      {purchaseMounted && (
        <div className="pos-mode-panel" hidden={activeMode !== "purchase"}>
          <PurchasePOS
            renderModeSwitch={renderModeSwitch}
            initialSupplierId={params.get("supplier") ?? undefined}
          />
        </div>
      )}
    </>
  );
}
