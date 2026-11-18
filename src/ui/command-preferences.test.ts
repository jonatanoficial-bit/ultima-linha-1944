import { describe, expect, it } from "vitest";
import {
  decodeCommandPreferences,
  defaultCommandPreferences,
  encodeCommandPreferences,
} from "./command-preferences";

describe("command preferences", () => {
  it("uses an accessible default when storage is absent or invalid", () => {
    expect(decodeCommandPreferences(null)).toEqual(defaultCommandPreferences());
    expect(decodeCommandPreferences("not-json")).toEqual(defaultCommandPreferences());
  });

  it("keeps only the supported local presentation values", () => {
    expect(decodeCommandPreferences(JSON.stringify({
      textScale: "large", contrast: "high", reduceMotion: true, captions: false,
    }))).toEqual({ textScale: "large", contrast: "high", reduceMotion: true, captions: false });
    expect(decodeCommandPreferences(JSON.stringify({ textScale: "huge", contrast: "low" }))).toEqual(defaultCommandPreferences());
  });

  it("round-trips a known preference record", () => {
    const current = { textScale: "large" as const, contrast: "standard" as const, reduceMotion: false, captions: true };
    expect(decodeCommandPreferences(encodeCommandPreferences(current))).toEqual(current);
  });
});
