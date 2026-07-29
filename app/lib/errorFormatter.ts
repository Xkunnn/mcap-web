export type LerobotErrorKind = "unsupported" | "failed";

export type FormattedLerobotError = {
  kind: LerobotErrorKind;
  title: string;
  description: string;
  supplemental: string;
  detail: string;
};

const ERROR_PREFIX = /^(?:runtimeerror|error|exception)\s*:\s*/i;
const MISSING_EGO_CAMERA = /未找到\s*\/ego\/camera\/0\s*视频流|missing[\s\S]*\/ego\/camera\/0/i;
const EGO_ONLY = /LeRobot\s*导出仅支持\s*LivUMI\s*Ego\s*主相机数据/i;

export function stripRepeatedErrorPrefix(value: unknown): string {
  let message = typeof value === "string" ? value.trim() : String(value ?? "").trim();
  while (ERROR_PREFIX.test(message)) message = message.replace(ERROR_PREFIX, "").trim();
  return message || "未知错误";
}

export function classifyLerobotError(value: unknown): LerobotErrorKind {
  const message = stripRepeatedErrorPrefix(value);
  return MISSING_EGO_CAMERA.test(message) || EGO_ONLY.test(message) ? "unsupported" : "failed";
}

export function formatLerobotError(value: unknown): FormattedLerobotError {
  const detail = stripRepeatedErrorPrefix(value);
  if (classifyLerobotError(detail) === "unsupported") {
    return {
      kind: "unsupported",
      title: "该文件不支持生成 LeRobot V3.0",
      description: "未检测到 LivUMI Ego 主相机视频流 /ego/camera/0。",
      supplemental: "当前文件仍可继续进行视频导出、质量检测和分析报告生成。",
      detail,
    };
  }
  return {
    kind: "failed",
    title: "LeRobot 数据集生成失败",
    description: "转换过程中发生错误，请展开查看原始错误详情。",
    supplemental: "视频导出与质量分析结果不受此次 LeRobot 转换失败影响。",
    detail,
  };
}
