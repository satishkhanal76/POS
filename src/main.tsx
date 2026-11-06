import NotificationProvider from "./components/Notifications/NotificationProvider";
import { PwaProvider } from "./pwa/PwaProvider";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/typography.css";
import "./styles/responsive.css";
import "./styles/forms.css";
import { BrowserRouter } from "react-router-dom";
import { DatabaseProvider } from "./contexts/DatabaseContext.tsx";
import { ClientGlobalProvider } from "./contexts/ClientGlobal.tsx";
import { LocaleProvider } from "./contexts/Locale.tsx";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <LocaleProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL || "/"}>
        <ClientGlobalProvider>
          <DatabaseProvider>
            <PwaProvider><NotificationProvider><App /></NotificationProvider></PwaProvider>
          </DatabaseProvider>
        </ClientGlobalProvider>
      </BrowserRouter>
    </LocaleProvider>
  </React.StrictMode>
);
