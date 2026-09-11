import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import InstantCard, { cardState } from "./InstantCard";
import type { InstantCardProps, Playback } from "./InstantCard";
import { slotFor } from "../lib/slot";

const instant = { name: "Primeiro", url: "https://www.myinstants.com/a/" };

function renderCard(props: Partial<InstantCardProps> = {}) {
  const handlers = {
    onPlay: vi.fn(),
    onPlayOnDiscord: vi.fn(),
    onStop: vi.fn(),
    onTrail: vi.fn()
  };

  render(
    <InstantCard
      instant={instant}
      playback="idle"
      otherPlaying={false}
      onPlay={handlers.onPlay}
      onPlayOnDiscord={handlers.onPlayOnDiscord}
      onStop={handlers.onStop}
      trail={{ label: "Remover", icon: <span>x</span>, onClick: handlers.onTrail }}
      {...props}
    />
  );

  const card = screen.getByRole("article", { name: "Primeiro" });
  const button = (name: string) => within(card).getByRole("button", { name });

  return { ...handlers, card, button };
}

describe("InstantCard", () => {
  it("names the card and its heading after the clip", () => {
    renderCard();

    expect(screen.getByRole("article", { name: "Primeiro" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Primeiro" })).toBeInTheDocument();
  });

  it("makes the card body the play control, named after the clip", async () => {
    const { button, onPlay } = renderCard();

    await userEvent.click(button("Primeiro"));

    expect(onPlay).toHaveBeenCalledWith(instant);
  });

  // The old card wrapped each icon button in a span that took the tooltip's
  // label, so the buttons themselves announced as a bare "button". Every
  // one of these now has a name of its own.
  it("gives every button an accessible name, body first", () => {
    const { card } = renderCard();

    const buttons = within(card).getAllByRole("button");
    expect(buttons).toHaveLength(4);
    expect(buttons[0]).toHaveAccessibleName("Primeiro");
    expect(buttons[1]).toHaveAccessibleName("Enviar para o Discord");
    expect(buttons[2]).toHaveAccessibleName("Parar");
    expect(buttons[3]).toHaveAccessibleName("Remover");
  });

  it("hands the instant to send-to-Discord and wires stop", async () => {
    const user = userEvent.setup();
    const { button, onPlayOnDiscord, onStop } = renderCard({ playback: "discord" });

    await user.click(button("Enviar para o Discord"));
    await user.click(button("Parar"));

    expect(onPlayOnDiscord).toHaveBeenCalledWith(instant);
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it("fires the trailing action on an idle card", async () => {
    const { button, onTrail } = renderCard();

    await userEvent.click(button("Remover"));

    expect(onTrail).toHaveBeenCalledTimes(1);
  });

  it("takes its colour from a palette slot keyed on the url", () => {
    const { card } = renderCard();

    expect(card).toHaveClass("pad", slotFor(instant.url));
  });

  it("announces a toggle action's state", () => {
    const { button } = renderCard({
      trail: { label: "Favoritar", icon: <span>*</span>, pressed: true, onClick: () => {} }
    });

    expect(button("Favoritar")).toHaveAttribute("aria-pressed", "true");
  });
});

// The footer matrix from the design canvas. The two playback paths are
// mutually exclusive, so while one runs the other leaves every card.
describe("InstantCard state matrix", () => {
  interface Case {
    when: string;
    props: { playback: Playback; otherPlaying: boolean };
    play: boolean;
    discord: boolean;
    stop: boolean;
    trail: boolean;
    live: boolean;
    dim: boolean;
    chip?: string;
  }

  const cases: Case[] = [
    {
      when: "nothing is playing",
      props: { playback: "idle", otherPlaying: false },
      play: true, discord: true, stop: false, trail: true, live: false, dim: false
    },
    {
      when: "this card plays locally",
      props: { playback: "local", otherPlaying: false },
      play: true, discord: false, stop: true, trail: false, live: true, dim: false, chip: "Tocando"
    },
    {
      when: "this card plays on Discord",
      props: { playback: "discord", otherPlaying: false },
      play: false, discord: true, stop: true, trail: false, live: true, dim: false, chip: "No Discord"
    },
    {
      when: "another card is playing",
      props: { playback: "idle", otherPlaying: true },
      play: false, discord: false, stop: false, trail: true, live: false, dim: true
    }
  ];

  it.each(cases)("when $when", ({ props, play, discord, stop, trail, live, dim, chip }) => {
    const { card, button } = renderCard(props);

    const expectEnabled = (el: HTMLElement, enabled: boolean) =>
      enabled ? expect(el).toBeEnabled() : expect(el).toBeDisabled();

    expectEnabled(button("Primeiro"), play);
    expectEnabled(button("Enviar para o Discord"), discord);
    expectEnabled(button("Parar"), stop);
    expectEnabled(button("Remover"), trail);
    expect(card).toHaveAttribute("data-live", String(live));
    expect(card).toHaveAttribute("data-dim", String(dim));

    if (chip) {
      expect(within(card).getByText(chip)).toBeInTheDocument();
    } else {
      expect(within(card).queryByText(/Tocando|No Discord/)).toBeNull();
    }
  });

  it("agrees with cardState, which is the single source of the rules", () => {
    expect(cardState("idle", true)).toEqual({
      live: false,
      dim: true,
      playDisabled: true,
      discordDisabled: true,
      stopDisabled: true,
      trailDisabled: false
    });
  });
});
