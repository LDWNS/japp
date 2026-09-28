import type { Metadata } from "next";
import { History } from "@/components/History";

export const metadata: Metadata = { title: "History · J-app" };

export default function Page() {
  return <History />;
}
