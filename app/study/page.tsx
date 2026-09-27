import type { Metadata } from "next";
import { Study } from "@/components/Study";

export const metadata: Metadata = { title: "Study · J-app" };

export default function Page() {
  return <Study />;
}
