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
    <html lang="zh-Hant" data-theme="light" suppressHydrationWarning>
      <head>
        {/* Apply the saved choice before the body can paint, even before hydration. */}
        <script dangerouslySetInnerHTML={{ __html: `try{document.documentElement.dataset.theme=localStorage.getItem("methelia-theme")==="dark"?"dark":"light"}catch{}` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
