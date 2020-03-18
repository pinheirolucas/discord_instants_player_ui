import React, { useContext, useState } from "react";

import Grid from "@material-ui/core/Grid";
import Container from "@material-ui/core/Container";
import Paper from "@material-ui/core/Paper";
import { makeStyles } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import ButtonGroup from "@material-ui/core/ButtonGroup";
import axios from "axios";

import KeybindingInput from "./components/KeybindingInput";
import play from "./play";
import SnackbarContext from "./SnackbarContext";

const useStyles = makeStyles({
  container: {
    margin: "20px 0"
  },
  paper: {
    padding: "15px"
  },
  title: {
    marginBottom: "15px"
  },
  inputWrapper: {
    marginTop: "15px"
  }
});

export default function InstantList() {
  const classes = useStyles();
  const [playing, setPlaying] = useState(false);
  const { openSnackbar, closeSnackbar } = useContext(SnackbarContext);

  const instants = [
    {
      name: "Errou (Faustão)",
      url: "https://www.myinstants.com/media/sounds/faustao-errou.mp3"
    },
    {
      name: "Chupa Meu Pinto Então O Vagabu",
      url: "https://www.myinstants.com/media/sounds/aud-20180228-wa0076.mp3"
    },
    {
      name: "Desliga o PC Agora!",
      url:
        "https://www.myinstants.com/media/sounds/desliga-o-computador-agora.mp3"
    }
  ];

  function handleBindingChange(instant) {
    return (key, keyCode) => {
      localStorage.setItem(
        keyCode,
        JSON.stringify({
          url: instant.url,
          key
        })
      );
    };
  }

  function handleSnackbarRemoveAction(instant) {
    console.log(instant);
    closeSnackbar();
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
                    <ButtonGroup
                      variant="contained"
                      color="primary"
                      aria-label="contained primary button group"
                    >
                      <Button
                        disabled={playing}
                        onClick={() => handlePlay(instant)}
                      >
                        Tocar
                      </Button>
                      <Button
                        disabled={playing}
                        onClick={() => handlePlayOnDiscord(instant)}
                      >
                        Discord
                      </Button>
                    </ButtonGroup>
                  </Grid>
                </Grid>
                <Grid container style={{ marginTop: "15px" }}>
                  <Grid item xs={12}>
                    <KeybindingInput
                      onBindingChange={handleBindingChange(instant)}
                    />
                  </Grid>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
