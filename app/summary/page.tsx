import type { Metadata } from "next";
import { Summary } from "@/components/Summary";

export const metadata: Metadata = { title: "Summary · J-app" };

export default function Page() {
  return <Summary />;
}
