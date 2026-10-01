// Minimal Phase 1 service worker: enables installability without caching BLE
// state. Data is always live over Web Bluetooth, so there is nothing to serve
// offline yet.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
