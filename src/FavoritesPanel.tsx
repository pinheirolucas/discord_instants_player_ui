import { useContext, useEffect } from "react";
import { Button } from "./components/Button";
import { EmptyState } from "./components/EmptyState";
import InstantCard from "./components/InstantCard";
import type { Playback } from "./components/InstantCard";
import { OfflineBanner } from "./components/OfflineBanner";
import { TrashIcon } from "./icons";
import SaveForm from "./SaveForm";
import SnackbarContext from "./SnackbarContext";
import { getContent } from "./service";
import { useInstantsState } from "./storage";
import type { Instant } from "./storage";
import useAudioPlayer from "./useAudioPlayer";
import useDiscordPlayer from "./useDiscordPlayer";

export interface FavoritesPanelProps {
  search: string;
  healthy: boolean;
  serverAddress: string;
  onSwitchServer: () => void;
  /** The hero's count line: "12 sons salvos", or "3 de 12" while searching. */
  onSummary: (summary: string) => void;
  /** The add form is opened from the tools row, outside this panel. */
  addOpen: boolean;
  onAddOpenChange: (open: boolean) => void;
  /** Carry a search that matched no favourite over to the catalogue. */
  onSearchCatalog: () => void;
}

export default function FavoritesPanel({
  search,
  healthy,
  serverAddress,
  onSwitchServer,
  onSummary,
  addOpen,
  onAddOpenChange,
  onSearchCatalog
}: FavoritesPanelProps) {
  const [audioUrl, isAudioPlaying, playAudio, stopAudio] = useAudioPlayer();
  const [discordUrl, isDiscordPlaying, playDiscord, stopDiscord] = useDiscordPlayer();
  const { openSnackbar, closeSnackbar } = useContext(SnackbarContext);
  const [instants, setInstants] = useInstantsState([]);

  const query = search.toLowerCase();
  const filtered = query
    ? instants.filter(({ name }) => name.toLowerCase().includes(query))
    : instants;

  useEffect(() => {
    onSummary(
      search
        ? `${filtered.length} de ${instants.length}`
        : `${instants.length} ${instants.length === 1 ? "som salvo" : "sons salvos"}`
    );
  }, [search, filtered.length, instants.length, onSummary]);

  function handleRemove(instant: Instant) {
    setInstants((current) => current.filter(({ url }) => url !== instant.url));
  }

  function showNotFound(instant: Instant, message: string) {
    openSnackbar({
      message,
      actionLabel: "Remover",
      onAction: () => {
        handleRemove(instant);
        closeSnackbar();
      }
    });
  }

  async function handlePlay(instant: Instant) {
    let info;

    try {
      info = await getContent(instant.url);
    } catch (err) {
      // Without this catch the rejection is unhandled inside a click
      // handler, and a failed play does and says nothing at all.
      openSnackbar({ message: (err as Error).message });
      return;
    }

    if (!info.exists) {
      showNotFound(instant, "Parece que o instant não existe mais");
      return;
    }

    playAudio(instant.url, info.content);
  }

  async function handlePlayOnDiscord(instant: Instant) {
    const message = await playDiscord(instant.url);
    if (message) {
      showNotFound(instant, message);
    }
  }

  async function handleStop() {
    if (isAudioPlaying) {
      stopAudio();
    }

    if (isDiscordPlaying) {
      await stopDiscord();
    }
  }

  function handleSave(name: string, url: string) {
    const found = instants.find((instant) => instant.url === url);
    if (found) {
      openSnackbar({ message: `Esse instant já está salvo como “${found.name}”` });
      return;
    }

    setInstants([...instants, { name, url }]);
    onAddOpenChange(false);
  }

  function playbackOf(instant: Instant): Playback {
    if (instant.url === audioUrl) return "local";
    if (instant.url === discordUrl) return "discord";
    return "idle";
  }

  const anyPlaying = isAudioPlaying || isDiscordPlaying;

  let content;

  if (instants.length === 0) {
    content = (
      <EmptyState
        title="Sem sons ainda"
        body="Cole o link de um instant, ou vá ao MyInstants e favorite os que você usa toda hora."
        action={<Button onClick={() => onAddOpenChange(true)}>Adicionar um instant</Button>}
      />
    );
  } else if (filtered.length === 0) {
    // Carries the query to the other tab instead of making them retype it.
    const noun = instants.length === 1 ? "favorito" : "favoritos";
    content = (
      <EmptyState
        title="Nada por aqui"
        body={`Nenhum dos seus ${instants.length} ${noun} bate com “${search}”. O catálogo do MyInstants é bem maior.`}
        action={
          <Button variant="secondary" onClick={onSearchCatalog}>
            {`Procurar “${search}” no MyInstants`}
          </Button>
        }
      />
    );
  } else {
    content = (
      <div className="grid" data-offline={!healthy}>
        {filtered.map((instant) => {
          const playback = playbackOf(instant);
          return (
            <InstantCard
              key={instant.url}
              instant={instant}
              playback={playback}
              otherPlaying={anyPlaying && playback === "idle"}
              onPlay={handlePlay}
              onPlayOnDiscord={handlePlayOnDiscord}
              onStop={handleStop}
              trail={{
                label: "Remover",
                icon: <TrashIcon />,
                onClick: () => handleRemove(instant)
              }}
            />
          );
        })}
      </div>
    );
  }

  return (
    <>
      {!healthy && <OfflineBanner address={serverAddress} onSwitch={onSwitchServer} />}
      {content}
      <SaveForm open={addOpen} onCancel={() => onAddOpenChange(false)} onSave={handleSave} />
    </>
  );
}
