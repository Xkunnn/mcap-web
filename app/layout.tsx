import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MCAP 数据处理工作台",
  description: "在本机批量生成 MP4、采集质量报告与 LeRobot V3.0 数据集。",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
