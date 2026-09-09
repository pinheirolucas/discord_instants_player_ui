import React, { useContext, useState } from "react";

import Grid from "@mui/material/Grid";
import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Fab from "@mui/material/Fab";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import Typography from "@mui/material/Typography";

import InstantCard, { InstantCardAction, actionColors } from "./InstantCard";

import SaveForm from "./SaveForm";
import SnackbarContext from "./SnackbarContext";
import { getContent } from "./service";
import useAudioPlayer from "./useAudioPlayer";
import useDiscordPlayer from "./useDiscordPlayer";
import { useInstantsState } from "./storage";

function FavoritesPanel(props) {
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
    let info;

    try {
      info = await getContent(instant.url);
    } catch (err) {
      openSnackbar({ message: err.message });
      return;
    }

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
        <Box sx={{ width: "100%", textAlign: "center" }}>
          <Typography variant="h6">
            Nenhum resultado para a pesquisa "{search}"
          </Typography>
        </Box>
      );
    } else if (!search.length && !filteredInstants.length) {
      return (
        <Box sx={{ width: "100%", textAlign: "center" }}>
          <Typography variant="h6">
            Você não possui instants cadastrados. Clique no botão + para
            cadastrar seu primeiro instant!
          </Typography>
        </Box>
      );
    } else {
      return filteredInstants.map(instant => (
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
            title="Remover"
            color={actionColors.remove}
            disabled={areDefaultButtonsDisabled(instant)}
            onClick={() => handleRemove(instant)}
          >
            <DeleteIcon />
          </InstantCardAction>
        </InstantCard>
      ));
    }
  }

  const instantsList = buildInstantsList();

  return (
    <Container sx={{ marginTop: "125px" }}>
      <Grid container spacing={4} sx={{ margin: "20px 0", width: "100%" }}>
        {instantsList}
      </Grid>
      <SaveForm
        open={formOpen}
        onCancel={handleFormCancel}
        onSave={handleFormSave}
      />
      <Fab
        color="secondary"
        sx={theme => ({
          position: "fixed",
          bottom: theme.spacing(2),
          right: theme.spacing(2)
        })}
        onClick={handleFormOpen}
      >
        <AddIcon />
      </Fab>
    </Container>
  );
}

export default FavoritesPanel;
