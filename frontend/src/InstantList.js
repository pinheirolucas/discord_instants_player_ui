import React, { useState } from "react";

import Grid from "@material-ui/core/Grid";
import Container from "@material-ui/core/Container";
import Paper from "@material-ui/core/Paper";
import { makeStyles } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import ButtonGroup from "@material-ui/core/ButtonGroup";
import axios from "axios";

import KeybindingInput from "./components/KeybindingInput";
import play from "./play";

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

  const instants = [
    {
      id: "faustao-errou.mp3",
      path: "/home/pinheirolucas/instants/faustao-errou.mp3"
    },
    {
      id: "otario.mp3",
      path: "/home/pinheirolucas/instants/otario.mp3"
    },
    {
      id: "bill.mp3",
      path: "/home/pinheirolucas/instants/bill.mp3"
    }
  ];

  function handleBindingChange(instant) {
    return (key, keyCode) => {
      localStorage.setItem(
        keyCode,
        JSON.stringify({
          path: instant.path,
          key
        })
      );
    };
  }

  async function handlePlay(instant) {
    if (playing) {
      return;
    }

    try {
      setPlaying(true);
      const url = await window.backend.GetPlayableInstant(instant.path);
      await play(url);
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
      await axios.post(`http://localhost:9001/bot/play?path=${instant.path}`);
    } finally {
      setPlaying(false);
    }
  }

  return (
    <Container>
      <Grid container spacing={4} className={classes.container}>
        {instants.map(instant => (
          <Grid key={instant.id} item xs={3}>
            <Paper className={classes.paper}>
              <Grid container>
                <Grid container>
                  <h3 className={classes.title}>{instant.id}</h3>
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
