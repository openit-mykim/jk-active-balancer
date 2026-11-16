/**
 * Top-level destinations, mirroring the jbd-bms-manager information
 * architecture (docs/navigation-design.md there):
 *
 *   overview  - battery snapshot in a few seconds
 *   detail    - device / product information and history
 *   balance   - cell-group condition and balancing (read-oriented)
 *   control   - locked maintenance workspace (settings, diagnostics)
 *   settings  - the app itself, not the device
 *
 * Route names are language-neutral; labels come from `t()`.
 */
export const TABS = ["overview", "detail", "balance", "control", "settings"] as const;
export type Tab = (typeof TABS)[number];

/** Secondary full-screen destination opened from the app bar's device button. */
export type Screen = Tab | "devices";
