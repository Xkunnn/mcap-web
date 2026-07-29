export const UPLOAD_SETTINGS_KEY = "mcap-web-upload-settings-v1";

export type UploadSettings = {
  minDecodeRatio: string;
  createLerobot: boolean;
  lerobotFps: string;
};

export const HIGHEST_QUALITY_DEFAULTS: UploadSettings = {
  minDecodeRatio: "1.00",
  createLerobot: true,
  lerobotFps: "30",
};

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export function normalizeUploadSettings(value: unknown): UploadSettings {
  const item = value && typeof value === "object" ? value as Partial<UploadSettings> : {};
  const ratio = Number(item.minDecodeRatio);
  const fps = Number(item.lerobotFps);
  return {
    minDecodeRatio: Number.isFinite(ratio) && ratio >= 0 && ratio <= 1
      ? String(item.minDecodeRatio)
      : HIGHEST_QUALITY_DEFAULTS.minDecodeRatio,
    createLerobot: typeof item.createLerobot === "boolean"
      ? item.createLerobot
      : HIGHEST_QUALITY_DEFAULTS.createLerobot,
    lerobotFps: Number.isFinite(fps) && fps >= 1 && fps <= 30
      ? String(item.lerobotFps)
      : HIGHEST_QUALITY_DEFAULTS.lerobotFps,
  };
}

export function loadUploadSettings(storage: StorageLike): UploadSettings {
  try {
    const raw = storage.getItem(UPLOAD_SETTINGS_KEY);
    return raw ? normalizeUploadSettings(JSON.parse(raw)) : { ...HIGHEST_QUALITY_DEFAULTS };
  } catch {
    return { ...HIGHEST_QUALITY_DEFAULTS };
  }
}

export function saveUploadSettings(storage: StorageLike, settings: UploadSettings): void {
  storage.setItem(UPLOAD_SETTINGS_KEY, JSON.stringify(normalizeUploadSettings(settings)));
}

export function appendUploadSettings(formData: FormData, settings: UploadSettings): void {
  const normalized = normalizeUploadSettings(settings);
  const ratio = Number(normalized.minDecodeRatio);
  formData.append("min_decode_ratio", ratio === 1 ? "1.0" : String(ratio));
  formData.append("create_lerobot", String(normalized.createLerobot));
  formData.append("lerobot_fps", String(Number(normalized.lerobotFps)));
}
