import type { Metadata } from "next";
import { QuizSetup } from "@/components/QuizSetup";

export const metadata: Metadata = { title: "Quiz · J-app" };

export default function Page() {
  return <QuizSetup />;
}
