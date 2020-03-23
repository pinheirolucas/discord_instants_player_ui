import React, { useContext, useEffect, useState } from "react";

import Grid from "@material-ui/core/Grid";
import Container from "@material-ui/core/Container";
import Paper from "@material-ui/core/Paper";
import { makeStyles } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import Fab from "@material-ui/core/Fab";
import AddIcon from "@material-ui/icons/Add";
import IconButton from "@material-ui/core/IconButton";
import DeleteIcon from "@material-ui/icons/Delete";
import PlayCircleFilledIcon from "@material-ui/icons/PlayCircleFilled";
import SendIcon from "@material-ui/icons/Send";
import StopIcon from "@material-ui/icons/Stop";
import Tooltip from "@material-ui/core/Tooltip";
import Typography from "@material-ui/core/Typography";

import KeybindingInput from "./KeybindingInput";
import SaveForm from "./SaveForm";
import SnackbarContext from "./SnackbarContext";
import { getContent } from "./service";
import useAudioPlayer from "./useAudioPlayer";
import useDiscordPlayer from "./useDiscordPlayer";
import {
  useInstantsState,
  useUrlCodeMap,
  useCodeUrlMap,
  useCodeKeyMap
} from "./storage";

const useStyles = makeStyles(theme => ({
  container: {
    margin: "20px 0",
    width: "100%"
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

export default function InstantList(props) {
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
  const [urlCodeMap, setUrlCodeMap] = useUrlCodeMap({});
  const [codeUrlMap, setCodeUrlMap] = useCodeUrlMap({});
  const [codeKeyMap, setCodeKeyMap] = useCodeKeyMap({});

  const { search } = props;

  const filteredInstants = search.length
    ? instants.filter(({ name }) => name.toLowerCase().includes(search.toLowerCase()))
    : instants;

  useEffect(() => {
    // window.backend
    //   .InitKeybindings(codeUrlMap)
    //   .catch(() => console.log("keybindings already registered"));
  }, [codeUrlMap]);

  function handleBindingChange(instant) {
    return (old, current) => {
      const url = codeUrlMap[current.keyCode];
      if (url) {
        delete urlCodeMap[url];
      }

      if (old.keyCode !== null && old.keyCode !== undefined) {
        delete urlCodeMap[instant.url];
        delete codeUrlMap[old.keyCode];
      }

      setUrlCodeMap({ ...urlCodeMap, [instant.url]: current.keyCode });
      setCodeUrlMap({ ...codeUrlMap, [current.keyCode]: instant.url });
      setCodeKeyMap({ ...codeKeyMap, [current.keyCode]: current.key });
    };
  }

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

    clearStorageForUrl(instant.url);
    newInstants.splice(i, 1);
    setInstants(newInstants);
  }

  function clearStorageForUrl(url) {
    const code = urlCodeMap[url];

    delete urlCodeMap[url];
    delete codeUrlMap[code];

    setCodeUrlMap({ ...codeUrlMap });
    setUrlCodeMap({ ...urlCodeMap });
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

  function getKeyStr(instant) {
    const code = urlCodeMap[instant.url];
    if (code === null || code === undefined) {
      return "";
    }

    return codeKeyMap[code] || "";
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
                    <IconButton
                      className={classes.play}
                      disabled={isDiscordPlaying}
                      onClick={() => handlePlay(instant)}
                    >
                      <PlayCircleFilledIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Enviar para o Discord">
                    <IconButton
                      className={classes.discord}
                      disabled={isAudioPlaying}
                      onClick={() => handlePlayOnDiscord(instant)}
                    >
                      <SendIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Parar reprodução">
                    <IconButton
                      className={classes.remove}
                      disabled={!areDefaultButtonsDisabled(instant)}
                      onClick={handleStop}
                    >
                      <StopIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Remover">
                    <IconButton
                      className={classes.remove}
                      disabled={areDefaultButtonsDisabled(instant)}
                      onClick={() => handleRemove(instant)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </Grid>
              </Grid>
              <Grid container style={{ marginTop: "15px" }}>
                <Grid item xs={12}>
                  <KeybindingInput
                    value={getKeyStr(instant)}
                    onBindingChange={handleBindingChange(instant)}
                  />
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
    <Container>
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
