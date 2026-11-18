export type TextScale = "normal" | "large";
export type ContrastMode = "standard" | "high";

export interface CommandPreferences {
  textScale: TextScale;
  contrast: ContrastMode;
  reduceMotion: boolean;
  captions: boolean;
}

export const PREFERENCES_KEY = "ultima-linha-1944/command-preferences/v1";

export const defaultCommandPreferences = (): CommandPreferences => ({
  textScale: "normal",
  contrast: "standard",
  reduceMotion: false,
  captions: true,
});

/** Local preferences are deliberately separate from the campaign record. */
export function decodeCommandPreferences(raw: string | null): CommandPreferences {
  const fallback = defaultCommandPreferences();
  if (!raw) return fallback;
  try {
    const candidate = JSON.parse(raw) as Partial<CommandPreferences>;
    return {
      textScale: candidate.textScale === "large" ? "large" : "normal",
      contrast: candidate.contrast === "high" ? "high" : "standard",
      reduceMotion: candidate.reduceMotion === true,
      captions: candidate.captions !== false,
    };
  } catch {
    return fallback;
  }
}

export const encodeCommandPreferences = (preferences: CommandPreferences) =>
  JSON.stringify(preferences);
