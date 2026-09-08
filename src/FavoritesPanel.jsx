import React, { useContext, useState } from "react";

import Grid from "@mui/material/Grid";
import Container from "@mui/material/Container";
import Paper from "@mui/material/Paper";
import makeStyles from '@mui/styles/makeStyles';
import Button from "@mui/material/Button";
import Fab from "@mui/material/Fab";
import AddIcon from "@mui/icons-material/Add";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import PlayCircleFilledIcon from "@mui/icons-material/PlayCircleFilled";
import SendIcon from "@mui/icons-material/Send";
import StopIcon from "@mui/icons-material/Stop";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

import SaveForm from "./SaveForm";
import SnackbarContext from "./SnackbarContext";
import { getContent } from "./service";
import useAudioPlayer from "./useAudioPlayer";
import useDiscordPlayer from "./useDiscordPlayer";
import { useInstantsState } from "./storage";

const useStyles = makeStyles(theme => ({
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
  fab: {
    position: "fixed",
    bottom: theme.spacing(2),
    right: theme.spacing(2)
  },
  play: {
    color: "#28a745"
  },
  discord: {
    color: "#7289da"
  },
  remove: {
    color: "#dc3545"
  }
}));

function FavoritesPanel(props) {
  const classes = useStyles();
  const [formOpen, setFormOpen] = useState(false);
  const [audioUrl, isAudioPlaying, playAudio, stopAudio] = useAudioPlayer();
  const [
    discordUrl,
    isDiscordPlaying,
    playDiscord,
    stopDiscord
  ] = useDiscordPlayer();

  const { openSnackbar, closeSnackbar } = useContext(SnackbarContext);

  const [instants, setInstants] = useInstantsState([]);

  const { search } = props;

  const filteredInstants = search.length
    ? instants.filter(({ name }) =>
        name.toLowerCase().includes(search.toLowerCase())
      )
    : instants;

  function handleSnackbarRemoveAction(instant) {
    handleRemove(instant);
    closeSnackbar();
  }

  function handleRemove(instant) {
    const newInstants = [...instants];
    const i = newInstants.findIndex(current => current.url === instant.url);
    if (i === -1) {
      return;
    }

    newInstants.splice(i, 1);
    setInstants(newInstants);
  }

  function showInstantNotFoundError(instant, message) {
    openSnackbar({
      message,
      action: (
        <Button
          color="secondary"
          size="small"
          onClick={() => handleSnackbarRemoveAction(instant)}
        >
          REMOVER
        </Button>
      )
    });
  }

  async function handlePlay(instant) {
    const info = await getContent(instant.url);
    if (!info.exists) {
      showInstantNotFoundError(instant, "Parece que o instant não existe mais");
      return;
    }

    playAudio(instant.url, info.content);
  }

  async function handlePlayOnDiscord(instant) {
    const message = await playDiscord(instant.url);
    if (message) {
      showInstantNotFoundError(instant, message);
      return;
    }
  }

  function handleFormOpen() {
    setFormOpen(true);
  }

  function handleFormCancel() {
    setFormOpen(false);
  }

  function handleFormSave(name, url) {
    const found = instants.find(instant => instant.url === url);
    if (found) {
      openSnackbar({
        message: `O instant inserido já está cadastrado como ${found.name}`
      });
      return;
    }

    setInstants([...instants, { name, url }]);
    setFormOpen(false);
  }

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

  function buildInstantsList() {
    if (search.length && !filteredInstants.length) {
      return (
        <div className={classes.messageContainer}>
          <Typography variant="h6" style={{ textAlign: "center" }}>
            Nenhum resultado para a pesquisa "{search}"
          </Typography>
        </div>
      );
    } else if (!search.length && !filteredInstants.length) {
      return (
        <div className={classes.messageContainer}>
          <Typography variant="h6">
            Você não possui instants cadastrados. Clique no botão + para
            cadastrar seu primeiro instant!
          </Typography>
        </div>
      );
    } else {
      return filteredInstants.map(instant => (
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
                        className={classes.remove}
                        disabled={!areDefaultButtonsDisabled(instant)}
                        onClick={handleStop}
                        size="large">
                        <StopIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Remover">
                    <span>
                      <IconButton
                        className={classes.remove}
                        disabled={areDefaultButtonsDisabled(instant)}
                        onClick={() => handleRemove(instant)}
                        size="large">
                        <DeleteIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Grid>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      ));
    }
  }

  const instantsList = buildInstantsList();

  return (
    <Container className={classes.topDiff}>
      <Grid container spacing={4} className={classes.container}>
        {instantsList}
      </Grid>
      <SaveForm
        open={formOpen}
        onCancel={handleFormCancel}
        onSave={handleFormSave}
      />
      <Fab color="secondary" className={classes.fab} onClick={handleFormOpen}>
        <AddIcon />
      </Fab>
    </Container>
  );
}

export default FavoritesPanel;
