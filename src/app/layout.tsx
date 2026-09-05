import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Methelia — Learn by making",
  description: "從一個好奇心開始，建立你的互動學習路徑。",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-Hant" data-theme="light">
      <body>{children}</body>
    </html>
  );
}
