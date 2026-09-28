import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { load } from "@/lib/storage";
import { dispatch } from "@/lib/store";
import type { Answer } from "@/lib/types";
import { mockWordFetch, renderAsync, resetApp } from "@/test/fixtures";
import { History } from "./History";
import { Home } from "./Home";

const router = { push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));

beforeEach(() => {
  resetApp();
  mockWordFetch();
  vi.clearAllMocks();
});

/** Play a whole quiz through the store, answering cards in order. */
function playQuiz(answers: [string, Answer][]) {
  act(() => {
    dispatch({ type: "start", mode: "normal", cards: answers.map(([id]) => ({ id, level: "N5" })) });
    for (const [, answer] of answers) {
      dispatch({ type: "flip" });
      dispatch({ type: "answer", answer });
    }
  });
}

describe("History", () => {
  it("is linked from home", async () => {
    await renderAsync(<Home />);
    expect(screen.getByRole("link", { name: "History" })).toHaveAttribute("href", "/history");
  });

  it("records finished quizzes", () => {
    playQuiz([["a", "wrong"], ["b", "right"]]);
    const [record] = load().history;
    expect(record).toMatchObject({ mode: "normal", wrongIds: ["a"], endedEarly: false });
    expect(record.cards.map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("shows an empty state", async () => {
    await renderAsync(<History />);
    expect(screen.getByText("No finished quizzes yet.")).toBeInTheDocument();
  });

  it("combines picked quizzes, full or missed only, into one session", async () => {
    const user = userEvent.setup();
    playQuiz([["a", "wrong"], ["b", "right"]]);
    playQuiz([["c", "wrong"], ["b", "wrong"]]);
    await renderAsync(<History />);

    const today = screen.getByRole("region", { name: "Today" });
    const [newest, oldest] = within(today).getAllByRole("checkbox");
    const start = screen.getByRole("button", { name: /Practice selected/ });
    expect(start).toHaveTextContent("(0)");
    expect(start).toBeDisabled();

    await user.click(oldest);
    expect(start).toHaveTextContent("(2)");
    await user.click(screen.getByRole("radio", { name: "Missed only (1)" }));
    expect(start).toHaveTextContent("(1)");
    await user.click(newest);
    // a (missed in oldest) + c, b (full newest)
    expect(start).toHaveTextContent("(3)");

    await user.click(start);
    expect(router.push).toHaveBeenCalledWith("/study");
    const session = load().study.session!;
    expect(session.mode).toBe("history");
    expect(session.cards.map((c) => c.id).sort()).toEqual(["a", "b", "c"]);
  });

  it("selects a whole day and lists a quiz's words", async () => {
    const user = userEvent.setup();
    playQuiz([["a", "wrong"], ["b", "right"]]);
    playQuiz([["c", "right"]]);
    await renderAsync(<History />);

    await user.click(screen.getByRole("button", { name: "Select day" }));
    screen.getAllByRole("checkbox").forEach((box) => expect(box).toBeChecked());
    expect(screen.getByRole("button", { name: /Practice selected/ })).toHaveTextContent("(3)");
    await user.click(screen.getByRole("button", { name: "Deselect day" }));
    screen.getAllByRole("checkbox").forEach((box) => expect(box).not.toBeChecked());

    // the word list suspends on use(); let it resolve inside act
    await act(() => user.click(screen.getAllByRole("button", { name: "Show words" })[1]));
    expect(await screen.findByText("水")).toBeInTheDocument();
    expect(screen.getByLabelText("missed")).toBeInTheDocument();
    expect(screen.getByText("mountain")).toBeInTheDocument();
  });
});
