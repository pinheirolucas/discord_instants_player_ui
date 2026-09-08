import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import InstantCard, { InstantCardAction, actionColors } from "./InstantCard";

// Every action is an unlabelled IconButton wrapped in a Tooltip, and MUI puts
// the tooltip's title on the <span> it clones around the child rather than on
// the button. So the aria-label lives one level above the button: reach the
// span by label, then the button inside it. See the accessibility test at the
// bottom for why the obvious getByRole("button", { name }) does not work.
function action(title, scope = screen) {
  return within(scope.getByLabelText(title)).getByRole("button");
}

const instant = { name: "Primeiro", url: "https://www.myinstants.com/a/" };

function renderCard(props = {}) {
  const handlers = {
    onPlay: vi.fn(),
    onPlayOnDiscord: vi.fn(),
    onStop: vi.fn()
  };

  const result = render(
    <InstantCard
      instant={instant}
      isAudioPlaying={false}
      isDiscordPlaying={false}
      isActive={false}
      {...handlers}
      {...props}
    />
  );

  return { ...result, ...handlers };
}

describe("InstantCard", () => {
  it("shows the instant's name as a heading", () => {
    renderCard();

    expect(screen.getByRole("heading", { name: "Primeiro" })).toBeInTheDocument();
  });

  it("renders the three default actions in order", () => {
    const { container } = renderCard();

    const labels = Array.from(container.querySelectorAll("[aria-label]")).map(
      element => element.getAttribute("aria-label")
    );

    expect(labels).toEqual([
      "Reproduzir",
      "Enviar para o Discord",
      "Parar reprodução"
    ]);
  });

  it("hands the whole instant back to onPlay and onPlayOnDiscord", async () => {
    const user = userEvent.setup();
    const { onPlay, onPlayOnDiscord } = renderCard();

    await user.click(action("Reproduzir"));
    await user.click(action("Enviar para o Discord"));

    expect(onPlay).toHaveBeenCalledWith(instant);
    expect(onPlayOnDiscord).toHaveBeenCalledWith(instant);
  });

  it("calls onStop when the card is the active one", async () => {
    const user = userEvent.setup();
    const { onStop } = renderCard({ isActive: true });

    await user.click(action("Parar reprodução"));

    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it("disables local playback while Discord playback is running, and vice versa", () => {
    const { unmount } = renderCard({ isDiscordPlaying: true });

    expect(action("Reproduzir")).toBeDisabled();
    expect(action("Enviar para o Discord")).toBeEnabled();
    unmount();

    renderCard({ isAudioPlaying: true });

    expect(action("Reproduzir")).toBeEnabled();
    expect(action("Enviar para o Discord")).toBeDisabled();
  });

  it("only enables stop on the card that is actually playing", () => {
    const { unmount } = renderCard({ isActive: false });
    expect(action("Parar reprodução")).toBeDisabled();
    unmount();

    renderCard({ isActive: true });
    expect(action("Parar reprodução")).toBeEnabled();
  });

  it("renders the panel-specific action passed as children, after the defaults", () => {
    const onClick = vi.fn();
    const { container } = renderCard({
      children: (
        <InstantCardAction title="Remover" color={actionColors.remove} onClick={onClick}>
          <span>x</span>
        </InstantCardAction>
      )
    });

    const labels = Array.from(container.querySelectorAll("[aria-label]")).map(
      element => element.getAttribute("aria-label")
    );

    expect(labels).toHaveLength(4);
    expect(labels[3]).toBe("Remover");
  });

  // Documented as current behaviour rather than fixed, because fixing it means
  // changing the component, not the test: InstantCardAction wraps its
  // IconButton in a <span> so a disabled button still has something to hang a
  // tooltip listener on. MUI then clones that span and puts aria-label on it,
  // leaving the button itself with no accessible name at all. A screen reader
  // announces "button" with nothing else; getByRole("button", { name }) cannot
  // find these, which is why every test here goes through getByLabelText.
  it("leaves the buttons themselves without an accessible name", () => {
    renderCard();

    expect(screen.queryByRole("button", { name: "Reproduzir" })).toBeNull();
    expect(action("Reproduzir")).toHaveAccessibleName("");
  });
});

describe("InstantCardAction", () => {
  it("applies the colour it is given", () => {
    render(
      <InstantCardAction title="Remover" color={actionColors.remove} onClick={() => {}}>
        <span>x</span>
      </InstantCardAction>
    );

    // #dc3545 — asserted through the rendered style rather than the constant so
    // a change to actionColors has to be deliberate.
    expect(action("Remover")).toHaveStyle({ color: "rgb(220, 53, 69)" });
  });

  it("does not fire onClick while disabled", async () => {
    // A disabled MUI IconButton also gets pointer-events: none, which
    // user-event refuses to click through by default. Turning that guard off is
    // the point here: even a click that reaches the element must do nothing.
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onClick = vi.fn();

    render(
      <InstantCardAction title="Remover" color="#000" disabled onClick={onClick}>
        <span>x</span>
      </InstantCardAction>
    );

    await user.click(action("Remover"));

    expect(onClick).not.toHaveBeenCalled();
  });
});
