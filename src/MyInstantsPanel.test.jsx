import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import MyInstantsPanel from "./MyInstantsPanel";
import SnackbarContext from "./SnackbarContext";
import { getContent, getMyInstants, playOnDiscord, stopPlayingOnDiscord } from "./service";

vi.mock("./service", () => ({
  getContent: vi.fn(),
  getMyInstants: vi.fn(),
  playOnDiscord: vi.fn(),
  stopPlayingOnDiscord: vi.fn()
}));

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

function action(title, scope = screen) {
  return within(scope.getByLabelText(title)).getByRole("button");
}

function card(name) {
  return screen.getByRole("heading", { name }).closest(".MuiPaper-root");
}

function storedInstants() {
  const raw = localStorage.getItem("instants");
  return raw === null ? null : JSON.parse(raw);
}

const page1 = {
  instants: [
    { name: "Primeiro", url: "https://www.myinstants.com/a/" },
    { name: "Segundo", url: "https://www.myinstants.com/b/" }
  ],
  pages: 3
};

const page2 = {
  instants: [{ name: "Terceiro", url: "https://www.myinstants.com/c/" }],
  pages: 3
};

// The panel's effect depends on openSnackbar, so it has to keep the same
// identity across renders or the effect refires forever.
function renderPanel({ search = "", favorites = [] } = {}) {
  localStorage.setItem("instants", JSON.stringify(favorites));

  const snackbar = { openSnackbar: vi.fn(), closeSnackbar: vi.fn() };

  const result = render(
    <SnackbarContext.Provider value={snackbar}>
      <MyInstantsPanel search={search} />
    </SnackbarContext.Provider>
  );

  const rerenderWithSearch = nextSearch =>
    result.rerender(
      <SnackbarContext.Provider value={snackbar}>
        <MyInstantsPanel search={nextSearch} />
      </SnackbarContext.Provider>
    );

  return { ...result, snackbar, rerenderWithSearch };
}

describe("MyInstantsPanel", () => {
  beforeEach(() => {
    localStorage.clear();
    FakeAudio.played = [];
    vi.stubGlobal("Audio", FakeAudio);
    vi.mocked(getContent).mockReset();
    vi.mocked(getMyInstants).mockReset().mockResolvedValue(page1);
    vi.mocked(playOnDiscord).mockReset();
    vi.mocked(stopPlayingOnDiscord).mockReset().mockResolvedValue({});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("loads the first page on mount and renders a card per result", async () => {
    renderPanel();

    expect(await screen.findByRole("heading", { name: "Primeiro" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Segundo" })).toBeInTheDocument();
    expect(getMyInstants).toHaveBeenCalledWith(1, "");
  });

  it("refetches when the search term changes", async () => {
    const { rerenderWithSearch } = renderPanel();
    await screen.findByRole("heading", { name: "Primeiro" });

    vi.mocked(getMyInstants).mockResolvedValue(page2);
    rerenderWithSearch("terceiro");

    expect(await screen.findByRole("heading", { name: "Terceiro" })).toBeInTheDocument();
    // A new search replaces the list rather than appending to it.
    expect(screen.queryByRole("heading", { name: "Primeiro" })).toBeNull();
    expect(getMyInstants).toHaveBeenLastCalledWith(1, "terceiro");
  });

  it("appends the next page and keeps what is already on screen", async () => {
    const { rerenderWithSearch } = renderPanel();
    await screen.findByRole("heading", { name: "Primeiro" });

    // "Carregar mais" is only reachable after totalPages is known — see the
    // "never offers to load more on a first load" test for why.
    rerenderWithSearch("boo");
    const loadMore = await screen.findByRole("button", { name: "Carregar mais" });

    vi.mocked(getMyInstants).mockResolvedValue(page2);
    await userEvent.setup().click(loadMore);

    expect(await screen.findByRole("heading", { name: "Terceiro" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Primeiro" })).toBeInTheDocument();
    expect(getMyInstants).toHaveBeenLastCalledWith(2, "boo");
  });

  it("drops duplicates when a page repeats an instant", async () => {
    const { rerenderWithSearch } = renderPanel();
    await screen.findByRole("heading", { name: "Primeiro" });

    rerenderWithSearch("boo");
    const loadMore = await screen.findByRole("button", { name: "Carregar mais" });

    vi.mocked(getMyInstants).mockResolvedValue({
      instants: [page1.instants[0], page2.instants[0]],
      pages: 3
    });
    await userEvent.setup().click(loadMore);

    await screen.findByRole("heading", { name: "Terceiro" });
    expect(screen.getAllByRole("heading", { name: "Primeiro" })).toHaveLength(1);
  });

  it("hides the load-more button on the last page", async () => {
    vi.mocked(getMyInstants).mockResolvedValue({ ...page1, pages: 1 });
    const { rerenderWithSearch } = renderPanel();
    await screen.findByRole("heading", { name: "Primeiro" });

    rerenderWithSearch("boo");
    await waitFor(() => expect(getMyInstants).toHaveBeenCalledTimes(2));

    expect(screen.queryByRole("button", { name: "Carregar mais" })).toBeNull();
  });

  // Pre-existing bug, asserted as current behaviour rather than fixed.
  // handleSuccess only calls setTotalPages in its "the search changed" branch,
  // and lastSearch is initialised to the current search — so on the very first
  // load the append branch runs, totalPages stays at its initial 1, page === 1,
  // and the button is hidden. Opening the app and scrolling the browse tab
  // therefore offers no way to reach page 2; the button only ever appears after
  // the user has typed in the search box at least once.
  it("never offers to load more on a first load, however many pages exist", async () => {
    renderPanel();
    await screen.findByRole("heading", { name: "Primeiro" });

    // The backend said pages: 3, so there is genuinely more to fetch.
    expect(getMyInstants).toHaveBeenCalledWith(1, "");
    expect(screen.queryByRole("button", { name: "Carregar mais" })).toBeNull();
  });

  it("shows the load-more button once a search has taught it the page count", async () => {
    const { rerenderWithSearch } = renderPanel();
    await screen.findByRole("heading", { name: "Primeiro" });

    rerenderWithSearch("boo");

    expect(
      await screen.findByRole("button", { name: "Carregar mais" })
    ).toBeInTheDocument();
  });

  it("adds an instant to the stored favourites", async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByRole("heading", { name: "Primeiro" });

    await user.click(action("Adicionar aos favoritos", within(card("Primeiro"))));

    expect(storedInstants()).toEqual([page1.instants[0]]);
  });

  it("removes it again on a second click", async () => {
    const user = userEvent.setup();
    renderPanel({ favorites: [page1.instants[0]] });
    await screen.findByRole("heading", { name: "Primeiro" });

    await user.click(action("Adicionar aos favoritos", within(card("Primeiro"))));

    expect(storedInstants()).toEqual([]);
  });

  // Small wart, asserted as-is: the tooltip always reads "Adicionar aos
  // favoritos" even when the click would remove it. Only the icon changes
  // (filled star vs outline), which is exactly the cue a screen reader user
  // does not get.
  it("keeps the same tooltip whether or not the instant is a favourite", async () => {
    renderPanel({ favorites: [page1.instants[0]] });
    await screen.findByRole("heading", { name: "Primeiro" });

    expect(
      within(card("Primeiro")).getByLabelText("Adicionar aos favoritos")
    ).toBeInTheDocument();
  });

  it("plays a clip locally with the content the backend hands back", async () => {
    const user = userEvent.setup();
    vi.mocked(getContent).mockResolvedValue({
      exists: true,
      content: "data:audio/mp3;base64,AAAA"
    });

    renderPanel();
    await screen.findByRole("heading", { name: "Primeiro" });

    await user.click(action("Reproduzir", within(card("Primeiro"))));

    await waitFor(() => expect(FakeAudio.played).toEqual(["data:audio/mp3;base64,AAAA"]));
  });

  it("warns when the instant no longer exists, with no remove action", async () => {
    const user = userEvent.setup();
    vi.mocked(getContent).mockResolvedValue({ exists: false });

    const { snackbar } = renderPanel();
    await screen.findByRole("heading", { name: "Primeiro" });

    await user.click(action("Reproduzir", within(card("Primeiro"))));

    await waitFor(() => {
      // Unlike FavoritesPanel there is nothing to remove here, so the snackbar
      // carries a message only.
      expect(snackbar.openSnackbar).toHaveBeenCalledWith({
        message: "Parece que o instant não existe mais"
      });
    });
  });

  it("shows the listing error in a snackbar", async () => {
    vi.mocked(getMyInstants).mockRejectedValue(new Error("A página enviada é inválida"));

    const { snackbar } = renderPanel();

    await waitFor(() => {
      expect(snackbar.openSnackbar).toHaveBeenCalledWith({
        message: "A página enviada é inválida"
      });
    });
  });
});

// The backend reports most errors as HTTP 200 with no `data`, which used to
// reach this panel as `undefined`. Both `instants` reads sit inside setInstants
// updater closures, so React evaluated them during state processing rather than
// inside the promise chain: the TypeError escaped the effect's own catch and
// unmounted the tree to a blank window. service.js now rejects instead, and
// handleSuccess no longer dereferences whatever it is handed.
describe("MyInstantsPanel when the listing does not arrive", () => {
  beforeEach(() => {
    localStorage.clear();
    FakeAudio.played = [];
    vi.stubGlobal("Audio", FakeAudio);
    vi.mocked(getContent).mockReset();
    vi.mocked(getMyInstants).mockReset();
    vi.mocked(playOnDiscord).mockReset();
    vi.mocked(stopPlayingOnDiscord).mockReset().mockResolvedValue({});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the backend message and stays mounted when the call rejects", async () => {
    vi.mocked(getMyInstants).mockRejectedValue(
      new Error("O site myinstants.com respondeu com um status de erro")
    );

    const { snackbar, container } = renderPanel();

    await waitFor(() =>
      expect(snackbar.openSnackbar).toHaveBeenCalledWith({
        message: "O site myinstants.com respondeu com um status de erro"
      })
    );

    expect(container.firstChild).not.toBeNull();
    expect(screen.queryByRole("heading", { name: "Primeiro" })).toBeNull();
  });

  it("renders empty rather than throwing if it is handed no listing at all", async () => {
    vi.mocked(getMyInstants).mockResolvedValue(undefined);

    const { container, snackbar } = renderPanel();

    await waitFor(() => expect(getMyInstants).toHaveBeenCalled());

    expect(container.firstChild).not.toBeNull();
    expect(snackbar.openSnackbar).not.toHaveBeenCalled();
  });

  it("survives an undefined listing on the search path too", async () => {
    vi.mocked(getMyInstants).mockResolvedValue(undefined);

    const { rerenderWithSearch, container } = renderPanel({ search: "" });

    await waitFor(() => expect(getMyInstants).toHaveBeenCalled());
    rerenderWithSearch("boo");

    await waitFor(() => expect(getMyInstants).toHaveBeenCalledTimes(2));
    expect(container.firstChild).not.toBeNull();
  });
});
