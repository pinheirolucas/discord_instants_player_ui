import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { THEMES } from "../themes";
import { ThemePicker } from "./ThemePicker";

describe("ThemePicker", () => {
  it("offers every palette as a radio named by its label, with the current one checked", () => {
    render(<ThemePicker value="frevo" onChange={() => {}} mode="dark" />);

    const group = screen.getByRole("radiogroup", { name: "Tema" });
    expect(within(group).getAllByRole("radio")).toHaveLength(THEMES.length);
    expect(screen.getByRole("radio", { name: "Frevo" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Esmalte" })).not.toBeChecked();
  });

  it("draws each swatch in its own palette, in the mode it is given", () => {
    const { container } = render(<ThemePicker value="esmalte" onChange={() => {}} mode="light" />);

    const swatches = [...container.querySelectorAll(".tsw")];
    expect(swatches.map((swatch) => swatch.getAttribute("data-theme"))).toEqual(
      THEMES.map((theme) => theme.id)
    );
    for (const swatch of swatches) {
      expect(swatch).toHaveAttribute("data-mode", "light");
    }
  });

  it("picks on click and with the arrow keys", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ThemePicker value="esmalte" onChange={onChange} mode="dark" />);

    await user.click(screen.getByRole("radio", { name: "Cerrado" }));
    expect(onChange).toHaveBeenLastCalledWith("cerrado");

    // Held rather than tapped: Radix moves focus on a timer and only picks
    // the newly focused radio while the arrow is still down. A real key
    // outlasts that timer; user-event's tap releases before it fires.
    screen.getByRole("radio", { name: "Esmalte" }).focus();
    await user.keyboard("{ArrowRight>}");
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith("frevo"));
    await user.keyboard("{/ArrowRight}");
  });
});
