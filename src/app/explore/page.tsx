import type { Metadata } from "next";
import { Explore } from "../../components/explore";
export const metadata: Metadata = {
  title: "課程 — Methelia",
  description: "查看目前的學習課程，探索 HTML、CSS 與 JavaScript 的章節構想。",
};
export default function Page() {
  return <Explore />;
}
