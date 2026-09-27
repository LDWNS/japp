import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { makeWord } from "@/test/fixtures";
import { FlashCard, swipeAnswer } from "./FlashCard";

const setup = (props: Partial<Parameters<typeof FlashCard>[0]> = {}) => {
  const onFlip = vi.fn();
  const onAnswer = vi.fn();
  const word = props.word ?? makeWord();
  render(<FlashCard word={word} flipped={false} onFlip={onFlip} onAnswer={onAnswer} {...props} />);
  return { onFlip, onAnswer, user: userEvent.setup() };
};

describe("FlashCard front", () => {
  it("shows only the expression and level", () => {
    setup();
    expect(screen.getByText("水")).toBeInTheDocument();
    expect(screen.getByText("N5")).toBeInTheDocument();
    expect(screen.queryByText("water")).not.toBeInTheDocument();
    expect(screen.queryByText("みず")).not.toBeInTheDocument();
  });

  it("tapping reveals", async () => {
    const { onFlip, user } = setup();
    await user.click(screen.getByRole("button", { name: "Show answer" }));
    expect(onFlip).toHaveBeenCalledOnce();
  });

  it("space reveals", async () => {
    const { onFlip, user } = setup();
    await user.keyboard(" ");
    expect(onFlip).toHaveBeenCalledOnce();
  });

  it("cannot be graded before reveal", async () => {
    const { onAnswer, user } = setup();
    expect(screen.getByRole("button", { name: /Got it/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Missed/ })).toBeDisabled();
    await user.keyboard("{ArrowRight}{ArrowLeft}");
    expect(onAnswer).not.toHaveBeenCalled();
  });
});

describe("FlashCard back", () => {
  it("shows reading, all meanings with the first emphasised, and the example", () => {
    setup({ flipped: true });
    expect(screen.getByTestId("reading")).toHaveTextContent("みず");
    expect(screen.getByText("water").tagName).toBe("STRONG");
    expect(screen.getByText(/fluid/)).toBeInTheDocument();
    expect(screen.getByText("水を飲みます。")).toBeInTheDocument();
    expect(screen.getByText("I drink water.")).toBeInTheDocument();
  });

  it("hides reading when identical to expression and example when missing", () => {
    setup({ flipped: true, word: makeWord({ expression: "これ", reading: "これ", example: null }) });
    expect(screen.queryByTestId("reading")).not.toBeInTheDocument();
    expect(screen.queryByText("I drink water.")).not.toBeInTheDocument();
  });

  it("does not un-flip on tap", async () => {
    const { onFlip, user } = setup({ flipped: true });
    await user.keyboard(" ");
    expect(onFlip).not.toHaveBeenCalled();
  });

  it.each([
    [/Got it/, "right"],
    [/Missed/, "wrong"],
  ])("button %s answers %s", async (name, answer) => {
    const { onAnswer, user } = setup({ flipped: true });
    await user.click(screen.getByRole("button", { name }));
    await waitFor(() => expect(onAnswer).toHaveBeenCalledWith(answer));
  });

  it.each([
    ["{ArrowRight}", "right"],
    ["{ArrowLeft}", "wrong"],
  ])("key %s answers %s", async (key, answer) => {
    const { onAnswer, user } = setup({ flipped: true });
    await user.keyboard(key);
    await waitFor(() => expect(onAnswer).toHaveBeenCalledWith(answer));
  });

  it("answers only once per card", async () => {
    const { onAnswer, user } = setup({ flipped: true });
    await user.keyboard("{ArrowRight}{ArrowLeft}{ArrowRight}");
    await waitFor(() => expect(onAnswer).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 400));
    expect(onAnswer).toHaveBeenCalledOnce();
  });
});

describe("swipeAnswer", () => {
  it.each([
    [150, 0, "right"],
    [-150, 0, "wrong"],
    [30, 800, "right"],
    [-30, -800, "wrong"],
    [60, 100, null],
    [-99, -499, null],
  ])("offset %d, velocity %d → %s", (offset, velocity, expected) => {
    expect(swipeAnswer(offset, velocity)).toBe(expected);
  });
});
