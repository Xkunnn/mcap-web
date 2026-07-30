import type { Job, LeRobotResult } from "../types";

function sourceKey(value: string): string {
  return value.replaceAll("\\", "/").split("/").pop()?.trim().toLocaleLowerCase() || "";
}

export function isStereoDataset(result: LeRobotResult): boolean {
  return /stereo/i.test(result.robot_type || "");
}

export function getDatasetPreviews(result: LeRobotResult) {
  if (result.camera_previews?.length) {
    return result.camera_previews.filter((preview) => preview.preview_url).map((preview, index) => ({
      key: preview.key || `camera-${index + 1}`,
      label: preview.label || preview.key || `相机 ${index + 1}`,
      preview_url: preview.preview_url,
    }));
  }
  return result.preview_url ? [{
    key: "left",
    label: "左相机预览",
    preview_url: result.preview_url,
  }] : [];
}

export function latestLerobotResults(results: LeRobotResult[]): LeRobotResult[] {
  const bySource = new Map<string, LeRobotResult>();
  results.forEach((result) => bySource.set(sourceKey(result.source), result));
  return [...bySource.values()];
}

export function currentLerobotErrors(job: Pick<Job, "lerobot_results" | "lerobot_errors">) {
  const successfulSources = new Set(latestLerobotResults(job.lerobot_results).map((result) => sourceKey(result.source)));
  return job.lerobot_errors.filter((error) => !successfulSources.has(sourceKey(error.source)));
}
