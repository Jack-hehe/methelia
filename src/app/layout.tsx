import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Methelia",
  description: "學你想學的任何事。Methelia 將學習目標整理成個人化課程，結合圖解、動畫、互動與實作，幫助你理解並運用所學。",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-Hant" data-theme="light" suppressHydrationWarning>
      <head>
        {/* Apply the saved choice before the body can paint, even before hydration. */}
        <script dangerouslySetInnerHTML={{ __html: `try{document.documentElement.dataset.theme=localStorage.getItem("methelia-theme")==="dark"?"dark":"light"}catch{}` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
