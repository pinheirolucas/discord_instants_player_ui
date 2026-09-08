import React, { useContext, useEffect, useState, useRef } from "react";

import Grid from "@mui/material/Grid";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import makeStyles from '@mui/styles/makeStyles';
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";
import PlayCircleFilledIcon from "@mui/icons-material/PlayCircleFilled";
import SendIcon from "@mui/icons-material/Send";
import StopIcon from "@mui/icons-material/Stop";
import Tooltip from "@mui/material/Tooltip";
import * as R from "ramda";

import SnackbarContext from "./SnackbarContext";
import { getContent, getMyInstants } from "./service";
import useAudioPlayer from "./useAudioPlayer";
import useDiscordPlayer from "./useDiscordPlayer";
import { useInstantsState } from "./storage";

const useStyles = makeStyles({
  container: {
    margin: "20px 0",
    width: "100%",
  },
  topDiff: {
    marginTop: "125px",
  },
  messageContainer: {
    width: "100%",
    textAlign: "center",
  },
  paper: {
    padding: "15px",
    position: "relative",
  },
  title: {
    marginBottom: "15px",
  },
  inputWrapper: {
    marginTop: "15px",
  },
  play: {
    color: "#28a745",
  },
  discord: {
    color: "#7289da",
  },
  stop: {
    color: "#dc3545",
  },
  favorite: {
    color: "#ffc107",
  },
});

function MyInstantsPanel(props) {
  const classes = useStyles();
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
    <Container className={classes.topDiff}>
      <Grid container spacing={4} className={classes.container}>
        {instants.map((instant) => (
          <Grid key={instant.url} item xs={3}>
            <Paper className={classes.paper}>
              <Grid container>
                <Grid container>
                  <h3 className={classes.title}>{instant.name}</h3>
                </Grid>
                <Grid container>
                  <Grid item xs={12}>
                    <Tooltip title="Reproduzir">
                      <span>
                        <IconButton
                          className={classes.play}
                          disabled={isDiscordPlaying}
                          onClick={() => handlePlay(instant)}
                          size="large">
                          <PlayCircleFilledIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Enviar para o Discord">
                      <span>
                        <IconButton
                          className={classes.discord}
                          disabled={isAudioPlaying}
                          onClick={() => handlePlayOnDiscord(instant)}
                          size="large">
                          <SendIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Parar reprodução">
                      <span>
                        <IconButton
                          className={classes.stop}
                          disabled={!areDefaultButtonsDisabled(instant)}
                          onClick={handleStop}
                          size="large">
                          <StopIcon />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Adicionar aos favoritos">
                      <span>
                        <IconButton
                          className={classes.favorite}
                          disabled={areDefaultButtonsDisabled(instant)}
                          onClick={() => handleFavorite(instant)}
                          size="large">
                          {buildFavoriteIcon(instant)}
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Grid>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        ))}
        {page === totalPages ? (
          <React.Fragment />
        ) : (
          <Grid container item xs={12} justifyContent="center">
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
