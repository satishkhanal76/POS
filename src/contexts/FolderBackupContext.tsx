import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useDatabase } from "./DatabaseContext";
import { useLocaleText } from "./Locale";
import { workspaceController } from "../controllers/WorkspaceController";
import FolderBackupController from "../controllers/FolderBackupController";
import {
  folderBackupSupported,
  FolderBackupSettings,
} from "../backup/folderAccess";

function useFolderBackupState() {
  const t = useLocaleText();
  const { database } = useDatabase();
  const workspace = workspaceController.isDemo() ? "POS_DEMO" : "POS";
  const controller = useMemo(
    () => new FolderBackupController(database, workspace),
    [database, workspace],
  );
  const supported = folderBackupSupported();
  const [settings, setSettings] = useState<FolderBackupSettings>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const lock = useRef(false);

  const run = useCallback(
    async (action: () => Promise<void>) => {
      if (lock.current) return;
      lock.current = true;
      setBusy(true);
      try {
        await action();
        setSettings(await controller.settings());
        setError("");
      } catch (failure) {
        if (!(failure instanceof DOMException && failure.name === "AbortError"))
          setError(
            failure instanceof DOMException || !(failure instanceof Error)
              ? t("FOLDER_BACKUP_FAILED")
              : failure.message,
          );
      } finally {
        lock.current = false;
        setBusy(false);
      }
    },
    [controller, t],
  );

  useEffect(() => {
    if (!supported) return;
    const check = () => {
      if (document.visibilityState === "visible")
        void run(() => controller.backup());
    };
    check();
    document.addEventListener("visibilitychange", check);
    const timer = window.setInterval(check, 60_000);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, [controller, run, supported]);

  return { controller, supported, settings, busy, error, run };
}

const FolderBackupContext = createContext<ReturnType<
  typeof useFolderBackupState
> | null>(null);

export function FolderBackupProvider({ children }: { children: ReactNode }) {
  const value = useFolderBackupState();
  return (
    <FolderBackupContext.Provider value={value}>
      {children}
    </FolderBackupContext.Provider>
  );
}

export function useFolderBackup() {
  return useContext(FolderBackupContext)!;
}
