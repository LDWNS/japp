import type { Metadata } from "next";
import { Settings } from "@/components/Settings";

export const metadata: Metadata = { title: "Settings · J-app" };

export default function Page() {
  return <Settings />;
}
