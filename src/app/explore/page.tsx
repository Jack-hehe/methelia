import type { Metadata } from "next";
import { Explore } from "../../components/explore";
export const metadata: Metadata = {
  title: "課程 — Methelia",
  description:
    "探索跨領域精選課程，繼續你的個人化學習路徑，透過講解、圖像與實作理解想學的主題。",
};
export default function Page() {
  return <Explore />;
}
