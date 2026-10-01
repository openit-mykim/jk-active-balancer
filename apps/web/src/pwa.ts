/** Register the Phase 1 service worker when running in a secure context. */
export function registerServiceWorker(): void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("./sw.js");
  });
}
