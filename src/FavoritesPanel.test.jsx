import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import FavoritesPanel from "./FavoritesPanel";
import SnackbarContext from "./SnackbarContext";
import { getContent, playOnDiscord, stopPlayingOnDiscord } from "./service";

vi.mock("./service", () => ({
  getContent: vi.fn(),
  playOnDiscord: vi.fn(),
  stopPlayingOnDiscord: vi.fn()
}));

// useAudioPlayer builds a detached `new Audio()`; jsdom implements neither
// play() nor pause() and would spray "Not implemented" across every run.
class FakeAudio extends EventTarget {
  constructor() {
    super();
    this.src = "";
    this.currentTime = 0;
  }
  play() {
    FakeAudio.played.push(this.src);
    return Promise.resolve();
  }
  pause() {}
}
FakeAudio.played = [];

// Tooltip titles land as aria-label on the <span> MUI clones around each icon
// button, not on the button. See InstantCard.test.jsx.
function action(title, scope = screen) {
  return within(scope.getByLabelText(title)).getByRole("button");
}

// The cards carry no landmark or test id, so scope by the one thing that is
// user-visible and unique per card: its <h3>. .MuiPaper-root is the card
// element itself.
function card(name) {
  return screen.getByRole("heading", { name }).closest(".MuiPaper-root");
}

const seeded = [
  { name: "Primeiro", url: "https://www.myinstants.com/a/" },
  { name: "Segundo", url: "https://www.myinstants.com/b/" }
];

function storedInstants() {
  return JSON.parse(localStorage.getItem("instants"));
}

function renderPanel({ search = "", instants = seeded } = {}) {
  localStorage.setItem("instants", JSON.stringify(instants));

  const snackbar = {
    openSnackbar: vi.fn(),
    closeSnackbar: vi.fn()
  };

  const result = render(
    <SnackbarContext.Provider value={snackbar}>
      <FavoritesPanel search={search} />
    </SnackbarContext.Provider>
  );

  return { ...result, snackbar };
}

describe("FavoritesPanel", () => {
  beforeEach(() => {
    localStorage.clear();
    FakeAudio.played = [];
    vi.stubGlobal("Audio", FakeAudio);
    vi.mocked(getContent).mockReset();
    vi.mocked(playOnDiscord).mockReset();
    vi.mocked(stopPlayingOnDiscord).mockReset().mockResolvedValue({});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("renders a card per instant already in localStorage", () => {
    renderPanel();

    expect(screen.getByRole("heading", { name: "Primeiro" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Segundo" })).toBeInTheDocument();
  });

  it("prompts for a first instant when nothing is stored", () => {
    renderPanel({ instants: [] });

    expect(
      screen.getByText(/Você não possui instants cadastrados/)
    ).toBeInTheDocument();
  });

  it("filters by name, case-insensitively", () => {
    renderPanel({ search: "prim" });

    expect(screen.getByRole("heading", { name: "Primeiro" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Segundo" })).toBeNull();
  });

  it("echoes the query back when the search matches nothing", () => {
    renderPanel({ search: "terceiro" });

    expect(screen.getByText(/Nenhum resultado para a pesquisa/)).toHaveTextContent(
      'Nenhum resultado para a pesquisa "terceiro"'
    );
    expect(screen.queryByRole("heading", { name: "Primeiro" })).toBeNull();
  });

  it("removes an instant from the list and from storage", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(action("Remover", within(card("Primeiro"))));

    expect(screen.queryByRole("heading", { name: "Primeiro" })).toBeNull();
    expect(screen.getByRole("heading", { name: "Segundo" })).toBeInTheDocument();
    expect(storedInstants()).toEqual([seeded[1]]);
  });

  it("saves a new instant through the form and persists it", async () => {
    const user = userEvent.setup();
    const { container } = renderPanel();

    // The floating add button is an unlabelled Fab, so there is nothing
    // accessible to query it by — hence the structural selector.
    await user.click(container.querySelector(".MuiFab-root"));

    const dialog = within(screen.getByRole("dialog"));
    await user.type(dialog.getByLabelText("Nome"), "Terceiro");
    await user.type(dialog.getByLabelText("Link"), "https://www.myinstants.com/c/");
    await user.click(dialog.getByRole("button", { name: "Salvar" }));

    // The dialog fades out rather than unmounting immediately, and while it is
    // open MUI marks the rest of the page aria-hidden — so the new card is not
    // in the accessibility tree until the transition finishes.
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Terceiro" })).toBeInTheDocument();
    });
    expect(storedInstants()).toHaveLength(3);
    expect(storedInstants()[2]).toEqual({
      name: "Terceiro",
      url: "https://www.myinstants.com/c/"
    });
  });

  it("refuses a duplicate url and names the instant that already holds it", async () => {
    const user = userEvent.setup();
    const { container, snackbar } = renderPanel();

    await user.click(container.querySelector(".MuiFab-root"));

    const dialog = within(screen.getByRole("dialog"));
    await user.type(dialog.getByLabelText("Nome"), "Duplicado");
    await user.type(dialog.getByLabelText("Link"), seeded[0].url);
    await user.click(dialog.getByRole("button", { name: "Salvar" }));

    expect(snackbar.openSnackbar).toHaveBeenCalledWith({
      message: "O instant inserido já está cadastrado como Primeiro"
    });
    expect(storedInstants()).toHaveLength(2);
  });

  it("will not save a name shorter than three characters", async () => {
    const user = userEvent.setup();
    const { container } = renderPanel();

    await user.click(container.querySelector(".MuiFab-root"));

    const dialog = within(screen.getByRole("dialog"));
    await user.type(dialog.getByLabelText("Nome"), "ab");
    await user.type(dialog.getByLabelText("Link"), "https://www.myinstants.com/c/");
    await user.click(dialog.getByRole("button", { name: "Salvar" }));

    expect(dialog.getAllByText("Mínimo 3 caracteres").length).toBeGreaterThan(0);
    expect(storedInstants()).toHaveLength(2);
  });

  it("plays a clip locally with the content the backend hands back", async () => {
    const user = userEvent.setup();
    vi.mocked(getContent).mockResolvedValue({
      exists: true,
      content: "data:audio/mp3;base64,AAAA"
    });

    renderPanel();

    await user.click(action("Reproduzir", within(card("Primeiro"))));

    await waitFor(() => {
      expect(FakeAudio.played).toEqual(["data:audio/mp3;base64,AAAA"]);
    });
    expect(getContent).toHaveBeenCalledWith(seeded[0].url);
  });

  it("offers to remove an instant the backend no longer has", async () => {
    const user = userEvent.setup();
    vi.mocked(getContent).mockResolvedValue({ exists: false });

    const { snackbar } = renderPanel();

    await user.click(action("Reproduzir", within(card("Primeiro"))));

    await waitFor(() => expect(snackbar.openSnackbar).toHaveBeenCalled());

    const [{ message, action: snackbarAction }] =
      snackbar.openSnackbar.mock.calls[0];
    expect(message).toBe("Parece que o instant não existe mais");

    // The snackbar action is a React element the panel builds; render it and
    // press it to check the removal path it is wired to.
    render(<SnackbarContext.Provider value={snackbar}>{snackbarAction}</SnackbarContext.Provider>);
    await user.click(screen.getByRole("button", { name: "REMOVER" }));

    expect(snackbar.closeSnackbar).toHaveBeenCalled();
    expect(storedInstants()).toEqual([seeded[1]]);
  });

  it("surfaces a Discord playback failure as a snackbar", async () => {
    const user = userEvent.setup();
    vi.mocked(playOnDiscord).mockRejectedValue(
      new Error("O instant enviado não foi encontrado")
    );

    const { snackbar } = renderPanel();

    await user.click(action("Enviar para o Discord", within(card("Primeiro"))));

    await waitFor(() => {
      expect(snackbar.openSnackbar).toHaveBeenCalledWith(
        expect.objectContaining({ message: "O instant enviado não foi encontrado" })
      );
    });
  });

  it("locks the other playback path while Discord is busy", async () => {
    const user = userEvent.setup();
    // Never resolves: /bot/play stays open for as long as the clip runs.
    vi.mocked(playOnDiscord).mockReturnValue(new Promise(() => {}));

    renderPanel();

    await user.click(action("Enviar para o Discord", within(card("Primeiro"))));

    await waitFor(() => {
      expect(action("Reproduzir", within(card("Primeiro")))).toBeDisabled();
    });
    // Every card is locked, not just the one playing.
    expect(action("Reproduzir", within(card("Segundo")))).toBeDisabled();
    // Only the playing card can be stopped.
    expect(action("Parar reprodução", within(card("Primeiro")))).toBeEnabled();
    expect(action("Parar reprodução", within(card("Segundo")))).toBeDisabled();
  });

  it("stops Discord playback through the backend", async () => {
    const user = userEvent.setup();
    vi.mocked(playOnDiscord).mockReturnValue(new Promise(() => {}));

    renderPanel();

    await user.click(action("Enviar para o Discord", within(card("Primeiro"))));
    await waitFor(() =>
      expect(action("Parar reprodução", within(card("Primeiro")))).toBeEnabled()
    );

    await user.click(action("Parar reprodução", within(card("Primeiro"))));

    expect(stopPlayingOnDiscord).toHaveBeenCalledTimes(1);
    await waitFor(() =>
      expect(action("Reproduzir", within(card("Primeiro")))).toBeEnabled()
    );
  });
});
