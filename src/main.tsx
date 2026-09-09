import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { I18nProvider } from "./i18n";
import "./index.css";

try {
  if (localStorage.getItem("md-viewer-theme") === "dark") {
    document.documentElement.classList.add("dark");
  }
} catch {
  /* ignore */
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </React.StrictMode>,
);
