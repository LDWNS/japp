import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { load } from "@/lib/storage";
import { dispatch } from "@/lib/store";
import { mockWordFetch, renderAsync, resetApp } from "@/test/fixtures";
import { Home } from "./Home";
import { Study } from "./Study";
import { Summary } from "./Summary";

const router = { push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));

beforeEach(() => {
  resetApp();
  mockWordFetch();
  vi.clearAllMocks();
});

const startWith = (ids: [string, "N5" | "N4"][], mode: "normal" | "review" = "normal") =>
  act(() => dispatch({ type: "start", mode, cards: ids.map(([id, level]) => ({ id, level })) }));

describe("Home", () => {
  it("toggles levels but keeps at least one selected", async () => {
    const user = userEvent.setup();
    render(<Home />);
    const n5 = screen.getByRole("button", { name: "N5" });
    const n4 = screen.getByRole("button", { name: "N4" });
    expect(n5).toHaveAttribute("aria-pressed", "true");
    await user.click(n5);
    expect(n5).toHaveAttribute("aria-pressed", "true");
    await user.click(n4);
    await user.click(n5);
    expect(n5).toHaveAttribute("aria-pressed", "false");
    expect(n4).toHaveAttribute("aria-pressed", "true");
    expect(load().settings.levels).toEqual(["N4"]);
  });

  it("selects a card count", async () => {
    const user = userEvent.setup();
    render(<Home />);
    await user.click(screen.getByRole("radio", { name: "All" }));
    expect(screen.getByRole("radio", { name: "All" })).toHaveAttribute("aria-checked", "true");
    expect(load().settings.count).toBe("all");
  });

  it("starts a random session from the selected levels", async () => {
    const user = userEvent.setup();
    render(<Home />);
    await user.click(screen.getByRole("button", { name: "N4" }));
    await user.click(screen.getByRole("button", { name: "Start" }));
    expect(router.push).toHaveBeenCalledWith("/study");
    const session = load().study.session!;
    // 20 requested, fixture pool is 4 → clamped
    expect(session.cards.map((c) => c.id).sort()).toEqual(["a", "b", "c", "d"]);
    expect(session.mode).toBe("normal");
  });

  it("shows an error when word lists fail to load", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 500 })));
    const user = userEvent.setup();
    render(<Home />);
    await user.click(screen.getByRole("button", { name: "Start" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Couldn't load/);
    expect(router.push).not.toHaveBeenCalled();
  });

  it("review is disabled with an empty pile and reviews the whole pile otherwise", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<Home />);
    expect(screen.getByRole("button", { name: "Review missed (0)" })).toBeDisabled();
    unmount();

    startWith([["a", "N5"], ["d", "N4"]]);
    act(() => {
      for (let i = 0; i < 2; i++) {
        dispatch({ type: "flip" });
        dispatch({ type: "answer", answer: "wrong" });
      }
    });
    render(<Home />);
    await user.click(screen.getByRole("button", { name: "Review missed (2)" }));
    const session = load().study.session!;
    expect(session.mode).toBe("review");
    expect(session.cards.map((c) => c.id).sort()).toEqual(["a", "d"]);
  });

  it("offers to resume an unfinished session", () => {
    startWith([["a", "N5"], ["b", "N5"]]);
    render(<Home />);
    expect(screen.getByRole("link", { name: "Resume session (0/2)" })).toHaveAttribute("href", "/study");
  });
});

describe("Study", () => {
  it("asks to choose cards without a session", async () => {
    await renderAsync(<Study />);
    expect(screen.getByText("No active session.")).toBeInTheDocument();
  });

  it("runs through cards, supports multi-step undo, and redirects when done", async () => {
    const user = userEvent.setup();
    startWith([["a", "N5"], ["b", "N5"], ["d", "N4"]]);
    await renderAsync(<Study />);

    expect(await screen.findByText("水")).toBeInTheDocument();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Undo/ })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Show answer" }));
    await user.click(screen.getByRole("button", { name: /Missed/ }));
    expect(await screen.findByText("山")).toBeInTheDocument();
    expect(load().study.progress.missed.a).toEqual({ level: "N5", streak: 0 });

    await user.keyboard(" {ArrowRight}");
    expect(await screen.findByText("運転")).toBeInTheDocument();

    // undo twice: back to the first card, flipped, pile restored
    await user.keyboard("{Backspace}{Backspace}");
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
    expect(screen.getByText("water")).toBeInTheDocument();
    expect(load().study.progress.missed).toEqual({});

    await user.keyboard("{ArrowRight}");
    expect(await screen.findByText("山")).toBeInTheDocument();
    await user.keyboard(" {ArrowRight}");
    expect(await screen.findByText("運転")).toBeInTheDocument();
    await user.keyboard(" {ArrowLeft}");
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/summary"));
    expect(Object.keys(load().study.progress.missed)).toEqual(["d"]);
  });

  it("undo button steps back", async () => {
    const user = userEvent.setup();
    startWith([["a", "N5"], ["b", "N5"]]);
    await renderAsync(<Study />);
    await user.click(screen.getByRole("button", { name: "Show answer" }));
    await user.click(screen.getByRole("button", { name: /Missed/ }));
    expect(await screen.findByText("山")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Undo/ }));
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
    expect(load().study.progress.missed).toEqual({});
  });

  it("End finishes early", async () => {
    const user = userEvent.setup();
    startWith([["a", "N5"], ["b", "N5"]]);
    await renderAsync(<Study />);
    await screen.findByText("水");
    await user.click(screen.getByRole("button", { name: "End" }));
    expect(router.replace).toHaveBeenCalledWith("/summary");
    expect(load().study.session!.endedEarly).toBe(true);
  });

  it("marks review sessions", async () => {
    startWith([["a", "N5"]], "review");
    await renderAsync(<Study />);
    expect(await screen.findByText("Reviewing missed")).toBeInTheDocument();
  });
});

describe("Summary", () => {
  it("shows score, missed words and practises the pile", async () => {
    const user = userEvent.setup();
    startWith([["a", "N5"], ["b", "N5"], ["c", "N5"]]);
    act(() => {
      dispatch({ type: "flip" });
      dispatch({ type: "answer", answer: "wrong" });
      dispatch({ type: "flip" });
      dispatch({ type: "answer", answer: "right" });
      dispatch({ type: "end" });
    });
    await renderAsync(<Summary />);

    expect(screen.getByRole("heading", { name: "Session ended" })).toBeInTheDocument();
    expect(screen.getByText("2 of 3 cards answered")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    const list = await screen.findByRole("list");
    expect(within(list).getByText("水")).toBeInTheDocument();
    expect(within(list).queryByText("山")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Practice missed (1)" }));
    expect(router.push).toHaveBeenCalledWith("/study");
    expect(load().study.session).toMatchObject({ mode: "review", cards: [{ id: "a", level: "N5" }] });
  });

  it("points back to the session while it is in progress", async () => {
    startWith([["a", "N5"]]);
    await renderAsync(<Summary />);
    expect(screen.getByRole("link", { name: "Back to cards" })).toHaveAttribute("href", "/study");
  });
});
