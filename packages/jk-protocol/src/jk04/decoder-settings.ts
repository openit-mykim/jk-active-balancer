/**
 * JK04 settings frame decoder (response frame type 0x01).
 *
 * Phase 1 ships read-only monitoring for JK-B2A16S. The settings frame layout
 * is documented upstream, but it is not yet transcribed here because that
 * transcription belongs with the verified settings read/write work (design
 * section 15: read-only first, write only for whitelisted registers). Callers
 * get an explicit error instead of a silently wrong decode.
 *
 * Upstream reference: `syssi/esphome-jk-bms@3.0.0`
 * `components/jk_bms_ble/jk_bms_ble.cpp` -> `decode_jk04_settings_()`.
 */
export class DecoderNotVerifiedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DecoderNotVerifiedError";
  }
}

/** Always throws: JK04 settings decode is deferred past Phase 1. */
export function decodeSettings(_frame: Uint8Array): never {
  throw new DecoderNotVerifiedError(
    "JK04 settings decode is not enabled in Phase 1 (read-only). See docs/protocol-design.md#settings.",
  );
}
