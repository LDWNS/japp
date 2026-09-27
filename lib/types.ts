import { z } from "zod";

export const LEVELS = ["N5", "N4", "N3", "N2"] as const;
export const LevelSchema = z.enum(LEVELS);
export type Level = z.infer<typeof LevelSchema>;

export const ExampleSchema = z.object({
  ja: z.string().min(1),
  en: z.string().min(1),
});
export type Example = z.infer<typeof ExampleSchema>;

export const WordSchema = z.object({
  id: z.string().min(1),
  level: LevelSchema,
  expression: z.string().min(1),
  reading: z.string().min(1),
  meanings: z.array(z.string().min(1)).min(1),
  example: ExampleSchema.nullable(),
});
export type Word = z.infer<typeof WordSchema>;

export const WordListSchema = z.array(WordSchema);

export type Answer = "right" | "wrong";
