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
import createPersistedState from "use-persisted-state";
import Tooltip from "@material-ui/core/Tooltip";

import KeybindingInput from "./components/KeybindingInput";
import play from "./play";
import SaveForm from "./SaveForm";
import SnackbarContext from "./SnackbarContext";

const useStyles = makeStyles(theme => ({
  container: {
    margin: "20px 0"
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
    position: "absolute",
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

const useInstantsState = createPersistedState("instants");
const useUrlCodeMap = createPersistedState("urlCodeMap");
const useCodeUrlMap = createPersistedState("codeUrlMap");
const useCodeKeyMap = createPersistedState("codeKeyMap");

export default function InstantList() {
  const classes = useStyles();
  const [playing, setPlaying] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  const { openSnackbar, closeSnackbar } = useContext(SnackbarContext);

  const [instants, setInstants] = useInstantsState([]);
  const [urlCodeMap, setUrlCodeMap] = useUrlCodeMap({});
  const [codeUrlMap, setCodeUrlMap] = useCodeUrlMap({});
  const [codeKeyMap, setCodeKeyMap] = useCodeKeyMap({});

  useEffect(() => {
    window.backend
      .InitKeybindings(codeUrlMap)
      .catch(() => console.log("keybindings already registered"));
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

  function showInstantNotFoundError(instant) {
    openSnackbar({
      message: "Parece que o instant não existe mais",
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
    if (playing) {
      return;
    }

    try {
      setPlaying(true);
      const info = await window.backend.GetPlayableInstant(instant.url);
      if (!info.Exists) {
        showInstantNotFoundError(instant);
        return;
      }

      await play(info.Content);
    } finally {
      setPlaying(false);
    }
  }

  async function handlePlayOnDiscord(instant) {
    if (playing) {
      return;
    }

    try {
      setPlaying(true);
      const exists = await window.backend.Player.Play(instant.url);
      if (!exists) {
        showInstantNotFoundError(instant);
        return;
      }
    } finally {
      setPlaying(false);
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

  return (
    <Container>
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
                      <IconButton
                        className={classes.play}
                        disabled={playing}
                        onClick={() => handlePlay(instant)}
                      >
                        <PlayCircleFilledIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Enviar para o Discord">
                      <IconButton
                        className={classes.discord}
                        disabled={playing}
                        onClick={() => handlePlayOnDiscord(instant)}
                      >
                        <SendIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Remover">
                      <IconButton
                        className={classes.remove}
                        disabled={playing}
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
        ))}
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
