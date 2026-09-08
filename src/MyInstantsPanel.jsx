import React, { useContext, useEffect, useState, useRef } from "react";

import Grid from "@mui/material/Grid";
import Container from "@mui/material/Container";

import InstantCard, { InstantCardAction, actionColors } from "./InstantCard";
import Button from "@mui/material/Button";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import * as R from "ramda";

import SnackbarContext from "./SnackbarContext";
import { getContent, getMyInstants } from "./service";
import useAudioPlayer from "./useAudioPlayer";
import useDiscordPlayer from "./useDiscordPlayer";
import { useInstantsState } from "./storage";

function MyInstantsPanel(props) {
  const { search } = props;

  const [audioUrl, isAudioPlaying, playAudio, stopAudio] = useAudioPlayer();
  const [
    discordUrl,
    isDiscordPlaying,
    playDiscord,
    stopDiscord,
  ] = useDiscordPlayer();

  const lastSearch = useRef(search);
  const [favorites, setFavorites] = useInstantsState([]);

  const [instants, setInstants] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { openSnackbar } = useContext(SnackbarContext);
  const urls = favorites.map((instant) => instant.url);

  useEffect(() => {
    function handleSuccess(data) {
      if (search === lastSearch.current) {
        setInstants((cur) =>
          R.uniqBy(R.path(["url"]), [...cur, ...(data.instants || [])])
        );
        return;
      }

      setInstants(() => R.uniqBy(R.path(["url"]), [...(data.instants || [])]));
      setTotalPages(data.pages || 1);
      lastSearch.current = search;
    }

    getMyInstants(page, search)
      .then(handleSuccess)
      .catch((err) => openSnackbar({ message: err.message }));
  }, [page, search, openSnackbar]);

  function areDefaultButtonsDisabled(instant) {
    return instant.url === audioUrl || instant.url === discordUrl;
  }

  async function handleStop() {
    if (isAudioPlaying) {
      stopAudio();
    }

    if (isDiscordPlaying) {
      await stopDiscord();
    }
  }

  async function handlePlay(instant) {
    const info = await getContent(instant.url);
    if (!info.exists) {
      showInstantNotFoundError("Parece que o instant não existe mais");
      return;
    }

    playAudio(instant.url, info.content);
  }

  async function handlePlayOnDiscord(instant) {
    const message = await playDiscord(instant.url);
    if (message) {
      showInstantNotFoundError(message);
      return;
    }
  }

  function handleFavorite(instant) {
    if (urls.includes(instant.url)) {
      removeFromFavorites(instant);
    } else {
      addToFavorites(instant);
    }
  }

  function addToFavorites(instant) {
    setFavorites([...favorites, instant]);
  }

  function removeFromFavorites(instant) {
    const newFavorites = [...favorites];
    const i = newFavorites.findIndex((current) => current.url === instant.url);
    if (i === -1) {
      return;
    }

    newFavorites.splice(i, 1);
    setFavorites(newFavorites);
  }

  function showInstantNotFoundError(message) {
    openSnackbar({ message });
  }

  function buildFavoriteIcon(instant) {
    return urls.includes(instant.url) ? <StarIcon /> : <StarBorderIcon />;
  }

  return (
    <Container sx={{ marginTop: "125px" }}>
      <Grid container spacing={4} sx={{ margin: "20px 0", width: "100%" }}>
        {instants.map((instant) => (
          <InstantCard
            key={instant.url}
            instant={instant}
            isAudioPlaying={isAudioPlaying}
            isDiscordPlaying={isDiscordPlaying}
            isActive={areDefaultButtonsDisabled(instant)}
            onPlay={handlePlay}
            onPlayOnDiscord={handlePlayOnDiscord}
            onStop={handleStop}
          >
            <InstantCardAction
              title="Adicionar aos favoritos"
              color={actionColors.favorite}
              disabled={areDefaultButtonsDisabled(instant)}
              onClick={() => handleFavorite(instant)}
            >
              {buildFavoriteIcon(instant)}
            </InstantCardAction>
          </InstantCard>
        ))}
        {page === totalPages ? (
          <React.Fragment />
        ) : (
          <Grid container justifyContent="center" size={12}>
            <Button
              variant="contained"
              color="secondary"
              onClick={() => setPage(page + 1)}
            >
              Carregar mais
            </Button>
          </Grid>
        )}
      </Grid>
    </Container>
  );
}

export default MyInstantsPanel;
