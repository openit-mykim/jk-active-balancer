/** Protocol family understood by this package. */
export type JkProtocol = "JK04";

/** Capability flags for a device profile (design section 16). */
export interface DeviceCapabilities {
  readonly deviceInfo: boolean;
  readonly cellVoltage: boolean;
  readonly balanceCurrent: boolean;
  readonly balancerSwitch: boolean;
  readonly settingsRead: boolean;
  readonly settingsWrite: boolean;
}

/** A verified device profile. */
export interface DeviceProfile {
  readonly id: string;
  readonly modelPatterns: readonly RegExp[];
  readonly protocol: JkProtocol;
  readonly maxCells: number;
  readonly capabilities: DeviceCapabilities;
}

/**
 * Phase 1 verified profile. The write capabilities are deliberately `false`:
 * JK-B2A16S hardware/software is verified, but settings write stays disabled
 * until the Phase 2 whitelist work (design sections 15, 35).
 */
export const JK_B2A16S_PROFILE: DeviceProfile = {
  id: "jk-b2a16s-hw3",
  modelPatterns: [/^JK-B2A16S/i],
  protocol: "JK04",
  maxCells: 16,
  capabilities: {
    deviceInfo: true,
    cellVoltage: true,
    balanceCurrent: true,
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
 * unknown device, which means read-only diagnostic mode (design section 17).
 */
export function selectProfile(vendorId: string): DeviceProfile | null {
  for (const profile of KNOWN_PROFILES) {
    if (profile.modelPatterns.some((pattern) => pattern.test(vendorId))) {
      return profile;
    }
  }
  return null;
}
