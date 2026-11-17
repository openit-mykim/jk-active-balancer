// Fixture replay (design section 25): the demo transport plays the repository
// fixtures. Provenance is preserved in the labels - the unbalanced frame is
// SYNTHETIC and never presented as a device measurement.
import deviceInfoHex from "../../../fixtures/jk-b2a16s/device-info/hw3-sw3.3.0.upstream.hex?raw";
import settingsHex from "../../../fixtures/jk-b2a16s/settings/default.upstream.hex?raw";
import balancedHex from "../../../fixtures/jk-b2a16s/status/16s-balanced.upstream.hex?raw";
import unbalancedHex from "../../../fixtures/jk-b2a16s/status/16s-unbalanced.synthetic.hex?raw";
import { parseHex } from "@jk-active-balancer/jk-protocol";

export const FIXTURES = {
  deviceInfo: parseHex(deviceInfoHex),
  settings: parseHex(settingsHex),
  balanced: parseHex(balancedHex),
  unbalanced: parseHex(unbalancedHex),
};

export const DEMO_LABEL =
  "Fixture replay: upstream-documented frames + 1 synthetic unbalanced frame. Not a device measurement.";
