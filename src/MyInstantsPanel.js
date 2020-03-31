import React, { useContext, useEffect, useState } from "react";

import Grid from "@material-ui/core/Grid";
import Container from "@material-ui/core/Container";
import Paper from "@material-ui/core/Paper";
import { makeStyles } from "@material-ui/core/styles";
import IconButton from "@material-ui/core/IconButton";
import Button from "@material-ui/core/Button";
import StarIcon from "@material-ui/icons/Star";
import StarBorderIcon from "@material-ui/icons/StarBorder";
import PlayCircleFilledIcon from "@material-ui/icons/PlayCircleFilled";
import SendIcon from "@material-ui/icons/Send";
import StopIcon from "@material-ui/icons/Stop";
import Tooltip from "@material-ui/core/Tooltip";

import SnackbarContext from "./SnackbarContext";
import { getContent, getMyInstants } from "./service";
import useAudioPlayer from "./useAudioPlayer";
import useDiscordPlayer from "./useDiscordPlayer";
import { useInstantsState, useUrlCodeMap, useCodeUrlMap } from "./storage";

const useStyles = makeStyles({
  container: {
    margin: "20px 0",
    width: "100%"
  },
  topDiff: {
    marginTop: "125px"
  },
  messageContainer: {
    width: "100%",
    textAlign: "center"
  },
  paper: {
    padding: "15px",
    position: "relative"
  },
  title: {
    marginBottom: "15px"
  },
  inputWrapper: {
    marginTop: "15px"
  },
  play: {
    color: "#28a745"
  },
  discord: {
    color: "#7289da"
  },
  stop: {
    color: "#dc3545"
  },
  favorite: {
    color: "#ffc107"
  }
});

function MyInstantsPanel(props) {
  const classes = useStyles();
  const { search } = props;

  const [audioUrl, isAudioPlaying, playAudio, stopAudio] = useAudioPlayer();
  const [
    discordUrl,
    isDiscordPlaying,
    playDiscord,
    stopDiscord
  ] = useDiscordPlayer();

  const [favorites, setFavorites] = useInstantsState([]);
  const [urlCodeMap, setUrlCodeMap] = useUrlCodeMap({});
  const [codeUrlMap, setCodeUrlMap] = useCodeUrlMap({});

  const [instants, setInstants] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { openSnackbar } = useContext(SnackbarContext);
  const urls = favorites.map(instant => instant.url);

  useEffect(() => {
    getMyInstants(page, search)
      .then(data => {
        setInstants(cur => [...cur, ...(data.instants || [])]);
        setTotalPages(data.pages || 1);
      })
      .catch(err =>
        openSnackbar({
          message: err.message
        })
      );
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

  function clearStorageForUrl(url) {
    const code = urlCodeMap[url];

    delete urlCodeMap[url];
    delete codeUrlMap[code];

    setCodeUrlMap({ ...codeUrlMap });
    setUrlCodeMap({ ...urlCodeMap });
  }

  function removeFromFavorites(instant) {
    const newFavorites = [...favorites];
    const i = newFavorites.findIndex(current => current.url === instant.url);
    if (i === -1) {
      return;
    }

    clearStorageForUrl(instant.url);
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
        {instants.map(instant => (
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
                        >
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
                        >
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
                        >
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
                        >
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
          <Grid container item xs={12} justify="center">
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
