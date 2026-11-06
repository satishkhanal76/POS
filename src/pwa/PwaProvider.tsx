import { InstallPrompt, PwaContext } from "./PwaContext";
import { ReactNode, useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import UpdateDialog from "../components/App/UpdateDialog";

const isInstalled = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

export function PwaProvider({ children }: { children: ReactNode }) {
  const [updateOpen, setUpdateOpen] = useState(false);
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(isInstalled);
  const [online, setOnline] = useState(navigator.onLine);
  const [setupFailed, setSetupFailed] = useState(false);
  const [previouslyCached, setPreviouslyCached] = useState(false);
  const {
    offlineReady: [offlineReady],
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError: (error) => {
      setSetupFailed(true);
      console.warn("[PWA] Service worker registration failed", error);
    },
    onRegisteredSW: (_url, registration) =>
      setPreviouslyCached(Boolean(registration?.active)),
  });
  useEffect(() => {
    const available = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const completed = () => {
      setInstalled(true);
      setPrompt(null);
    };
    const network = () => setOnline(navigator.onLine);
    const display = window.matchMedia("(display-mode: standalone)");
    const displayChanged = () => setInstalled(isInstalled());
    window.addEventListener("beforeinstallprompt", available);
    window.addEventListener("appinstalled", completed);
    window.addEventListener("online", network);
    window.addEventListener("offline", network);
    display.addEventListener("change", displayChanged);
    return () => {
      window.removeEventListener("beforeinstallprompt", available);
      window.removeEventListener("appinstalled", completed);
      window.removeEventListener("online", network);
      window.removeEventListener("offline", network);
      display.removeEventListener("change", displayChanged);
    };
  }, []);
  const install = async () => {
    if (!prompt) return null;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    setPrompt(null);
    return choice.outcome;
  };
  const update = async () => {
    setUpdateOpen(true);
  };
  return (
    <PwaContext.Provider
      value={{
        installed,
        canInstall: !!prompt && !installed,
        online,
        offlineReady: offlineReady || previouslyCached,
        needRefresh,
        setupFailed,
        install,
        update,
      }}
    >
      {children}
      {updateOpen && (
        <UpdateDialog
          onClose={() => setUpdateOpen(false)}
          onUpdate={() => updateServiceWorker(true)}
        />
      )}
    </PwaContext.Provider>
  );
}
