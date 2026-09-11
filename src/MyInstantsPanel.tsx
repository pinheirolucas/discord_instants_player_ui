import * as R from "ramda";
import { useContext, useEffect, useRef, useState } from "react";
import { Button } from "./components/Button";
import { CardSkeleton } from "./components/CardSkeleton";
import { EmptyState } from "./components/EmptyState";
import InstantCard from "./components/InstantCard";
import type { Playback } from "./components/InstantCard";
import { OfflineBanner } from "./components/OfflineBanner";
import { StarIcon } from "./icons";
import SnackbarContext from "./SnackbarContext";
import { getContent, getMyInstants } from "./service";
import { useInstantsState } from "./storage";
import type { Instant } from "./storage";
import useAudioPlayer from "./useAudioPlayer";
import useDiscordPlayer from "./useDiscordPlayer";

interface Listing {
  instants?: Instant[];
  pages?: number;
}

interface Request {
  page: number;
  search: string;
}

const SKELETONS = 8;

export interface MyInstantsPanelProps {
  search: string;
  healthy: boolean;
  serverAddress: string;
  onSwitchServer: () => void;
  onSummary: (summary: string) => void;
  onClearSearch: () => void;
}

export default function MyInstantsPanel({
  search,
  healthy,
  serverAddress,
  onSwitchServer,
  onSummary,
  onClearSearch
}: MyInstantsPanelProps) {
  const [audioUrl, isAudioPlaying, playAudio, stopAudio] = useAudioPlayer();
  const [discordUrl, isDiscordPlaying, playDiscord, stopDiscord] = useDiscordPlayer();
  const [favorites, setFavorites] = useInstantsState([]);
  const { openSnackbar } = useContext(SnackbarContext);

  // Held in a ref so the listing effect does not refire whenever the
  // provider hands down a new function identity.
  const snackbar = useRef(openSnackbar);
  snackbar.current = openSnackbar;

  const [request, setRequest] = useState<Request>({ page: 1, search });
  const [instants, setInstants] = useState<Instant[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  // A new search starts over from page 1. Returning the same object when the
  // search has not changed keeps the first mount from fetching twice.
  useEffect(() => {
    setRequest((current) => (current.search === search ? current : { page: 1, search }));
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    getMyInstants(request.page, request.search)
      .then((data: Listing | undefined) => {
        if (cancelled) return;
        // The backend answers most errors as HTTP 200 with no data; never
        // dereference whatever arrives.
        const listing = data || {};
        const incoming = listing.instants || [];
        const byUrl = (instant: Instant) => instant.url;

        setInstants((current) =>
          R.uniqBy(byUrl, request.page === 1 ? incoming : [...current, ...incoming])
        );
        setTotalPages(listing.pages || 1);
        setFailed(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setFailed(true);
        snackbar.current({ message: err.message });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [request, reloadKey]);

  const firstLoad = loading && instants.length === 0;

  useEffect(() => {
    onSummary(
      firstLoad
        ? "carregando…"
        : `${instants.length} ${instants.length === 1 ? "resultado" : "resultados"}`
    );
  }, [firstLoad, instants.length, onSummary]);

  const urls = favorites.map((instant) => instant.url);

  function toggleFavorite(instant: Instant) {
    setFavorites((current) =>
      current.some(({ url }) => url === instant.url)
        ? current.filter(({ url }) => url !== instant.url)
        : [...current, instant]
    );
  }

  async function handlePlay(instant: Instant) {
    let info;

    try {
      info = await getContent(instant.url);
    } catch (err) {
      openSnackbar({ message: (err as Error).message });
      return;
    }

    if (!info.exists) {
      // Unlike Favoritos there is nothing to remove here, so no action.
      openSnackbar({ message: "Parece que o instant não existe mais" });
      return;
    }

    playAudio(instant.url, info.content);
  }

  async function handlePlayOnDiscord(instant: Instant) {
    const message = await playDiscord(instant.url);
    if (message) {
      openSnackbar({ message });
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

  function playbackOf(instant: Instant): Playback {
    if (instant.url === audioUrl) return "local";
    if (instant.url === discordUrl) return "discord";
    return "idle";
  }

  const anyPlaying = isAudioPlaying || isDiscordPlaying;
  const reload = () => setReloadKey((key) => key + 1);

  let content;

  if (firstLoad) {
    // The listing scrapes myinstants.com server-side and is slow. The
    // skeleton has the card's exact footprint so nothing jumps.
    content = (
      <div className="grid" aria-busy="true">
        {Array.from({ length: SKELETONS }, (_, i) => (
          <CardSkeleton key={i} index={i} />
        ))}
      </div>
    );
  } else if (instants.length === 0) {
    if (failed) {
      content = (
        <EmptyState
          title="O catálogo não carregou"
          body="O servidor não conseguiu trazer a lista do myinstants.com."
          action={
            <Button variant="secondary" onClick={reload}>
              Tentar de novo
            </Button>
          }
        />
      );
    } else if (request.search) {
      content = (
        <EmptyState
          title="Nada por aqui"
          body={`Nenhum som do MyInstants bate com “${request.search}”.`}
          action={
            <Button variant="secondary" onClick={onClearSearch}>
              Limpar busca
            </Button>
          }
        />
      );
    } else {
      content = (
        <EmptyState
          title="Nada no catálogo"
          body="O MyInstants não devolveu nenhum som."
          action={
            <Button variant="secondary" onClick={reload}>
              Tentar de novo
            </Button>
          }
        />
      );
    }
  } else {
    content = (
      <div className="grid" data-offline={!healthy}>
        {instants.map((instant) => {
          const playback = playbackOf(instant);
          const isFavorite = urls.includes(instant.url);
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
                label: "Favoritar",
                icon: <StarIcon filled={isFavorite} />,
                pressed: isFavorite,
                onClick: () => toggleFavorite(instant)
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
      {instants.length > 0 && request.page < totalPages && (
        <div className="loadmore">
          <Button
            variant="secondary"
            disabled={loading}
            onClick={() => setRequest((current) => ({ ...current, page: current.page + 1 }))}
          >
            {loading ? "Carregando…" : "Carregar mais"}
          </Button>
        </div>
      )}
    </>
  );
}
