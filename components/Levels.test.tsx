import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { load } from "@/lib/storage";
import { dispatch, updateSettings } from "@/lib/store";
import { makeWord, renderAsync, resetApp } from "@/test/fixtures";
import { Home } from "./Home";
import { Levels } from "./Levels";
import { Settings } from "./Settings";

const router = { push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));

// 60 N5 words at 10 per level: levels 1–5, review 1, level 6
const n5 = Array.from({ length: 60 }, (_, i) => makeWord({ id: `w${i}`, expression: `語${i}` }));

beforeEach(() => {
  resetApp();
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => new Response(JSON.stringify(url.endsWith("/n5.json") ? n5 : []), { status: 200 })),
  );
  vi.clearAllMocks();
});

/** Answer every card of the current session right. */
function finishSession() {
  act(() => {
    while (load().study.session!.index < load().study.session!.cards.length) {
      dispatch({ type: "flip" });
      dispatch({ type: "answer", answer: "right" });
    }
  });
}

describe("Levels", () => {
  it("is linked from home", async () => {
    await renderAsync(<Home />);
    expect(screen.getByRole("link", { name: "Levels" })).toHaveAttribute("href", "/levels");
  });

  it("starts with only the first level open", async () => {
    await renderAsync(<Levels />);
    expect(await screen.findByRole("button", { name: "Level 1" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Level 2, locked" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Review 1, locked" })).toBeDisabled();
    expect(screen.getByText("0 of 6 levels done")).toBeInTheDocument();
  });

  it("plays a level and unlocks the next one once every card is answered", async () => {
    const user = userEvent.setup();
    const { unmount } = await renderAsync(<Levels />);
    await user.click(await screen.findByRole("button", { name: "Level 1" }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/study"));
    const session = load().study.session!;
    expect(session.mode).toBe("level");
    expect(session.cards.map((c) => c.id).sort()).toEqual(n5.slice(0, 10).map((w) => w.id).sort());

    // ending early doesn't count
    act(() => {
      dispatch({ type: "flip" });
      dispatch({ type: "answer", answer: "wrong" });
      dispatch({ type: "end" });
    });
    expect(load().levels).toEqual({});

    await user.click(screen.getByRole("button", { name: "Level 1" }));
    await waitFor(() => expect(load().study.session!.results).toHaveLength(0));
    finishSession();
    expect(load().levels).toEqual({ "N5:10": [0] });
    unmount();

    await renderAsync(<Levels />);
    expect(await screen.findByRole("button", { name: "Level 1, done" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Level 2" })).toBeEnabled();
    expect(screen.getByText("1 of 6 levels done")).toBeInTheDocument();
  });

  it("gates the next block behind a review of 20 words", async () => {
    const user = userEvent.setup();
    const { unmount } = await renderAsync(<Levels />);
    for (let n = 1; n <= 5; n++) {
      await user.click(await screen.findByRole("button", { name: `Level ${n}` }));
      await waitFor(() => expect(load().study.session?.level?.stage).toBe(n - 1));
      finishSession();
    }
    unmount();

    await renderAsync(<Levels />);
    expect(screen.getByRole("button", { name: "Level 6, locked" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Review 1" }));
    await waitFor(() => expect(load().study.session?.level?.review).toBe(true));
    expect(load().study.session!.cards).toHaveLength(20);
    finishSession();
    expect(load().levels["N5:10"]).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("keeps progress per level size", async () => {
    await renderAsync(<Levels />);
    await userEvent.setup().click(await screen.findByRole("button", { name: "Level 1" }));
    await waitFor(() => expect(load().study.session).not.toBeNull());
    finishSession();
    act(() => updateSettings({ ...load().settings, levelSize: 20 }));
    expect(await screen.findByRole("button", { name: "Level 1" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Level 2, locked" })).toBeDisabled();
    expect(screen.getByText("20 words per level ·", { exact: false })).toBeInTheDocument();
  });

  it("level size is set in settings", async () => {
    const user = userEvent.setup();
    await renderAsync(<Settings />);
    await user.selectOptions(screen.getByLabelText("Words per level"), "30");
    expect(load().settings.levelSize).toBe(30);
  });
});
