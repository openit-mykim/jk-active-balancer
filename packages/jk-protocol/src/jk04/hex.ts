/**
 * Hex helpers shared by fixtures, the raw packet logger and fixture replay.
 * Accepts whitespace, `.`, `:`, `,` or `0x` separated tokens.
 */
export function parseHex(text: string): Uint8Array {
  const tokens = text
    .replace(/0x/gi, " ")
    .split(/[\s.,:]+/)
    .filter((token) => token.length > 0);
  const bytes = new Uint8Array(tokens.length);
  tokens.forEach((token, i) => {
    if (!/^[0-9a-f]{1,2}$/i.test(token)) {
      throw new Error(`parseHex: invalid byte "${token}" at token ${i}`);
    }
    bytes[i] = Number.parseInt(token, 16);
  });
  return bytes;
}

/** Format bytes as upper-case, space-separated hex. */
export function toHex(bytes: Uint8Array | readonly number[]): string {
  return Array.from(bytes, (byte) => (byte & 0xff).toString(16).padStart(2, "0").toUpperCase()).join(" ");
}
