import type { Metadata } from "next";
import { Levels } from "@/components/Levels";

export const metadata: Metadata = { title: "Levels · J-app" };

export default function Page() {
  return <Levels />;
}
