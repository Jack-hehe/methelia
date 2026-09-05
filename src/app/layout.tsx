import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Methelia",
  description: "互動式程式設計課程。",
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
