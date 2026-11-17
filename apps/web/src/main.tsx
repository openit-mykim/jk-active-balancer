import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { registerServiceWorker } from "./pwa";
import { applyThemeVars } from "./theme-vars";
import { installCrashHandler } from "./crash-store";
import "./styles.css";

installCrashHandler();
applyThemeVars();

const container = document.getElementById("root");
if (container === null) {
  throw new Error("missing #root container");
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

registerServiceWorker();
