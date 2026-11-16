/** Protocol family understood by this package. */
export type JkProtocol = "JK04";

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

/** A verified device profile. */
export interface DeviceProfile {
  readonly id: string;
  readonly modelPatterns: readonly RegExp[];
  /** Hardware revisions the profile was verified against (design section 17). */
  readonly hardwareVersions: readonly string[];
  /** Software revisions the profile was verified against. */
  readonly softwareVersions: readonly string[];
  readonly protocol: JkProtocol;
  readonly maxCells: number;
  readonly capabilities: DeviceCapabilities;
}

/**
 * Phase 1 verified profile (upstream `syssi/esphome-jk-bms@3.0.0` README:
 * "JK-B2A16S, hw 3.0, sw 3.3.0, using JK04").
 *
 * The write capabilities are deliberately `false`: upstream defines a JK04
 * balancer-switch register, but no physical read-back has been performed yet
 * (design sections 15, 35). Flip them only with hardware evidence.
 */
export const JK_B2A16S_PROFILE: DeviceProfile = {
  id: "jk-b2a16s-hw3",
  modelPatterns: [/^JK-B2A16S/i],
  hardwareVersions: ["3.0"],
  softwareVersions: ["3.3.0"],
  protocol: "JK04",
  maxCells: 16,
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

/** All profiles this build knows about. */
export const KNOWN_PROFILES: readonly DeviceProfile[] = [JK_B2A16S_PROFILE];

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
 * - `verified`   : model + hardware revision match a known profile;
 * - `diagnostic` : unknown model or unknown hardware revision - read-only
 *                  diagnostics and raw capture only, never settings write
 *                  (design sections 17, 44).
 */
export type ProfileMode = "verified" | "diagnostic";

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
 * `JK-B2A16S` + hardware `3.0` selects JK04; any other hardware revision enters
 * read-only diagnostic mode ("Unknown JK-B2A16S revision").
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
