import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { registerServiceWorker } from "./pwa";
import "./styles.css";

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
