import type { Metadata } from "next";
import { Explore } from "../../components/explore";
export const metadata: Metadata = {
  title: "作品與課程 — Methelia",
  description:
    "瀏覽 Methelia 的作品構想與學習路徑示意，或開始五章互動示範課程。",
};
export default function Page() {
  return <Explore />;
}
