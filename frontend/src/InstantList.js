import React from "react";

import Grid from "@material-ui/core/Grid";
import Container from "@material-ui/core/Container";
import Paper from "@material-ui/core/Paper";
import { makeStyles } from "@material-ui/core/styles";
import Button from "@material-ui/core/Button";
import ButtonGroup from "@material-ui/core/ButtonGroup";
import * as R from "ramda";

import KeybindingInput from "./components/KeybindingInput";

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
  const instants = [
    {
      id: "faustao-errou1.mp3",
      path: "/home/pinheirolucas/instants/faustao-errou.mp3"
    },
    {
      id: "faustao-errou2.mp3",
      path: "/home/pinheirolucas/instants/faustao-errou.mp3"
    },
    {
      id: "faustao-errou3.mp3",
      path: "/home/pinheirolucas/instants/faustao-errou.mp3"
    },
    {
      id: "faustao-errou4.mp3",
      path: "/home/pinheirolucas/instants/faustao-errou.mp3"
    },
    {
      id: "faustao-errou5.mp3",
      path: "/home/pinheirolucas/instants/faustao-errou.mp3"
    },
    {
      id: "faustao-errou6.mp3",
      path: "/home/pinheirolucas/instants/faustao-errou.mp3"
    },
    {
      id: "faustao-errou7.mp3",
      path: "/home/pinheirolucas/instants/faustao-errou.mp3"
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
                      <Button>Tocar</Button>
                      <Button>Discord</Button>
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
