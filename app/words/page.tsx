import type { Metadata } from "next";
import { WordLists } from "@/components/WordLists";

export const metadata: Metadata = { title: "Word lists · J-app" };

export default function Page() {
  return <WordLists />;
}
