/**
 * Protocol family. `UNKNOWN` marks a device the app supports at the product
 * level but whose BLE protocol has not been confirmed from upstream or a
 * physical capture yet: no frame decoder is applied to it (design section 44).
 */
export type JkProtocol = "JK04" | "UNKNOWN";

/** Capability flags for a device profile (design sections 16, 41.4). */
export interface DeviceCapabilities {
  readonly deviceInfo: boolean;
  readonly cellVoltage: boolean;
  readonly balanceCurrent: boolean;
  /** Per-cell wire resistance (upstream decodes it at offsets 102..198). */
  readonly cellWireResistance: boolean;
  readonly balancerSwitch: boolean;
  readonly settingsRead: boolean;
  readonly settingsWrite: boolean;
}

/**
 * Product facts from the seller specification sheet (owner-provided image,
 * 2026-11-16). They drive the UI (cell range, rated current, interface badges)
 * but are never protocol evidence (design section 43).
 */
export interface ProductSpec {
  /** Display name, e.g. "JK-B4A24S". */
  readonly model: string;
  /** Supported series cell count (same for Li-ion, LiFePO4 and LTO). */
  readonly minCells: number;
  readonly maxCells: number;
  /** Rated active-balancing current in amps. */
  readonly ratedBalanceCurrent: number;
  readonly interfaces: {
    readonly bluetooth: boolean;
    readonly rs485: boolean;
    readonly can: boolean;
    /** NTC temperature detection. */
    readonly ntc: boolean;
  };
}

/** A device profile: product facts plus what is verified about its protocol. */
export interface DeviceProfile {
  readonly id: string;
  readonly modelPatterns: readonly RegExp[];
  /** Hardware revisions the protocol was verified against (design section 17). */
  readonly hardwareVersions: readonly string[];
  /** Software revisions the protocol was verified against. */
  readonly softwareVersions: readonly string[];
  readonly protocol: JkProtocol;
  /** Same as `spec.maxCells`; kept for the design section 16 shape. */
  readonly maxCells: number;
  readonly spec: ProductSpec;
  /** Where the protocol claim (or its absence) comes from. */
  readonly protocolEvidence: string;
  readonly capabilities: DeviceCapabilities;
}

const NO_CAPABILITIES: DeviceCapabilities = {
  deviceInfo: true,
  cellVoltage: false,
  balanceCurrent: false,
  cellWireResistance: false,
  balancerSwitch: false,
  settingsRead: false,
  settingsWrite: false,
};

/** A product whose BLE protocol still has to be captured (decision D015). */
function captureFirst(
  id: string,
  pattern: RegExp,
  spec: ProductSpec,
  protocolEvidence: string,
): DeviceProfile {
  return {
    id,
    modelPatterns: [pattern],
    hardwareVersions: [],
    softwareVersions: [],
    protocol: "UNKNOWN",
    maxCells: spec.maxCells,
    spec,
    protocolEvidence,
    capabilities: NO_CAPABILITIES,
  };
}

/**
 * JK-B2A16S - upstream `syssi/esphome-jk-bms@3.0.0` README: "JK-B2A16S,
 * hw 3.0, sw 3.3.0, using JK04". The only product with BLE protocol evidence.
 *
 * The write capabilities are deliberately `false`: upstream defines a JK04
 * balancer-switch register, but no physical read-back has been performed yet
 * (design sections 15, 35). Flip them only with hardware evidence.
 */
export const JK_B2A16S_PROFILE: DeviceProfile = {
  id: "jk-b2a16s-hw3",
  modelPatterns: [/^JK[-_]?B2A16S/i],
  hardwareVersions: ["3.0"],
  softwareVersions: ["3.3.0"],
  protocol: "JK04",
  maxCells: 16,
  spec: {
    model: "JK-B2A16S",
    minCells: 8,
    maxCells: 16,
    ratedBalanceCurrent: 2,
    interfaces: { bluetooth: true, rs485: false, can: false, ntc: false },
  },
  protocolEvidence: "upstream syssi/esphome-jk-bms@3.0.0 README: hw 3.0 / sw 3.3.0 using JK04",
  capabilities: {
    deviceInfo: true,
    cellVoltage: true,
    balanceCurrent: true,
    cellWireResistance: true,
    balancerSwitch: false,
    settingsRead: true,
    settingsWrite: false,
  },
};

/**
 * JK-B4A24S - the owner's device and the default target (decision D014).
 * Upstream (3.0.0 and main, checked 2026-11-16) has no report; same product
 * line as JK-B2A8S / JK-B2A16S, which makes JK04 likely but not proven.
 */
export const JK_B4A24S_PROFILE: DeviceProfile = captureFirst(
  "jk-b4a24s",
  /^JK[-_]?B4A24S/i,
  {
    model: "JK-B4A24S",
    minCells: 8,
    maxCells: 24,
    ratedBalanceCurrent: 4,
    interfaces: { bluetooth: true, rs485: false, can: false, ntc: false },
  },
  "no upstream report (checked 2026-11-16); JK04 likely by product line - capture required",
);

/**
 * JK-B2A8S active balancer. Not the JK-B2A8S20P / 30P *BMS* that upstream
 * lists (those use JK02_24S / JK02_32S) - a different product.
 */
export const JK_B2A8S_PROFILE: DeviceProfile = captureFirst(
  "jk-b2a8s",
  /^JK[-_]?B2A8S(?!\d)/i,
  {
    model: "JK-B2A8S",
    minCells: 4,
    maxCells: 8,
    ratedBalanceCurrent: 2,
    interfaces: { bluetooth: true, rs485: false, can: false, ntc: false },
  },
  "no upstream BLE report for the balancer (upstream JK-B2A8S20P is a BMS) - capture required",
);

/**
 * JK-DZ11-B2A24S. Upstream supports it over RS485 only (`jk_balancer`
 * component, issue #17 / PR #18, hw 6.0); its BLE protocol is unknown.
 */
export const JK_DZ11B2A24S_PROFILE: DeviceProfile = captureFirst(
  "jk-dz11-b2a24s",
  /^JK[-_]?DZ11[-_]?B2A24S/i,
  {
    model: "JK-DZ11B2A24S",
    minCells: 8,
    maxCells: 24,
    ratedBalanceCurrent: 2,
    interfaces: { bluetooth: true, rs485: true, can: false, ntc: true },
  },
  "upstream supports RS485 only (jk_balancer, issue #17, hw 6.0); BLE protocol unknown - capture required",
);

/** JK-DZ08-B2A24S (CAN variant). No upstream report. */
export const JK_DZ08B2A24S_PROFILE: DeviceProfile = captureFirst(
  "jk-dz08-b2a24s",
  /^JK[-_]?DZ08[-_]?B2A24S/i,
  {
    model: "JK-DZ08B2A24S",
    minCells: 8,
    maxCells: 24,
    ratedBalanceCurrent: 2,
    interfaces: { bluetooth: true, rs485: false, can: true, ntc: true },
  },
  "no upstream report - capture required",
);

/** Model the apps present as their default target (decision D014). */
export const DEFAULT_TARGET_PROFILE: DeviceProfile = JK_B4A24S_PROFILE;

/** All supported products, in the order of the seller specification sheet. */
export const KNOWN_PROFILES: readonly DeviceProfile[] = [
  JK_B2A8S_PROFILE,
  JK_B2A16S_PROFILE,
  JK_DZ11B2A24S_PROFILE,
  JK_DZ08B2A24S_PROFILE,
  JK_B4A24S_PROFILE,
];

/**
 * Select a profile from a decoded vendor/model string.
 *
 * The BLE advertised name is only a hint (design section 41.2); callers should
 * pass the vendor id decoded from the device-info frame. Returns `null` for an
 * unknown device. Prefer {@link resolveProfile}, which also checks the
 * hardware revision.
 */
export function selectProfile(vendorId: string): DeviceProfile | null {
  for (const profile of KNOWN_PROFILES) {
    if (profile.modelPatterns.some((pattern) => pattern.test(vendorId))) {
      return profile;
    }
  }
  return null;
}

/**
 * How the app may talk to a device:
 * - `verified`   : model + hardware revision match a profile with a known
 *                  protocol; frames are decoded;
 * - `diagnostic` : unknown model, revision or protocol - read-only raw capture,
 *                  never decoded, never written (design sections 17, 44);
 * - `preview`    : demo / layout preview only (synthetic frames, labelled in
 *                  the UI); frames are decoded, writes are never allowed.
 *                  Never produced by {@link resolveProfile}.
 */
export type ProfileMode = "verified" | "diagnostic" | "preview";

export interface ProfileResolution {
  readonly mode: ProfileMode;
  /** Matched (or candidate) profile; `null` when the model is unknown. */
  readonly profile: DeviceProfile | null;
  /** True when the software revision is not one the profile was verified on. */
  readonly softwareUnverified: boolean;
  /** Human-readable explanation, for the UI and the debug export. */
  readonly reason: string;
}

/** Identification fields taken from a decoded device-info frame. */
export interface DeviceIdentity {
  readonly vendorId: string;
  readonly hardwareVersion: string;
  readonly softwareVersion: string;
}

/**
 * Resolve the profile for an identified device (design section 17):
 * `JK-B2A16S` + hardware `3.0` selects JK04; a known product with an
 * unconfirmed protocol, an unknown revision or an unknown model enters
 * read-only diagnostic mode.
 */
export function resolveProfile(identity: DeviceIdentity): ProfileResolution {
  const profile = selectProfile(identity.vendorId);
  if (profile === null) {
    return {
      mode: "diagnostic",
      profile: null,
      softwareUnverified: true,
      reason: `Unknown device profile "${identity.vendorId}" - read-only diagnostic mode`,
    };
  }
  if (profile.protocol === "UNKNOWN") {
    return {
      mode: "diagnostic",
      profile,
      softwareUnverified: true,
      reason: `${identity.vendorId} identified (HW ${identity.hardwareVersion}, SW ${identity.softwareVersion}); protocol not confirmed yet - capturing raw frames, nothing is decoded`,
    };
  }
  if (!profile.hardwareVersions.includes(identity.hardwareVersion)) {
    return {
      mode: "diagnostic",
      profile,
      softwareUnverified: true,
      reason: `Unknown ${identity.vendorId} revision (HW ${identity.hardwareVersion}) - read-only diagnostic mode`,
    };
  }
  const softwareUnverified = !profile.softwareVersions.includes(identity.softwareVersion);
  return {
    mode: "verified",
    profile,
    softwareUnverified,
    reason: softwareUnverified
      ? `${profile.protocol} selected; SW ${identity.softwareVersion} has not been verified (reference ${profile.softwareVersions.join(", ")})`
      : `${profile.protocol} selected`,
  };
}

/**
 * Demo-only resolution: treat a product as decodable with the JK04 layout so
 * the UI can be previewed for its cell range from SYNTHETIC frames. The UI
 * must label it PREVIEW; writes stay impossible (the writer requires
 * `verified`).
 */
export function previewProfile(profile: DeviceProfile): ProfileResolution {
  return {
    mode: "preview",
    profile: {
      ...profile,
      protocol: "JK04",
      capabilities: {
        ...profile.capabilities,
        cellVoltage: true,
        balanceCurrent: true,
        cellWireResistance: true,
        settingsRead: true,
        balancerSwitch: false,
        settingsWrite: false,
      },
    },
    softwareUnverified: true,
    reason: `PREVIEW: synthetic ${profile.spec.model} frames read with the JK04 layout - not a device measurement`,
  };
}
