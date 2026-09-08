import React from "react";

import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import PlayCircleFilledIcon from "@mui/icons-material/PlayCircleFilled";
import SendIcon from "@mui/icons-material/Send";
import StopIcon from "@mui/icons-material/Stop";
import Tooltip from "@mui/material/Tooltip";
import Box from "@mui/material/Box";

export const actionColors = {
  play: "#28a745",
  discord: "#7289da",
  stop: "#dc3545",
  remove: "#dc3545",
  favorite: "#ffc107"
};

export function InstantCardAction(props) {
  const { title, color, disabled, onClick, children } = props;

  return (
    <Tooltip title={title}>
      <span>
        <IconButton
          sx={{ color }}
          disabled={disabled}
          onClick={onClick}
          size="large"
        >
          {children}
        </IconButton>
      </span>
    </Tooltip>
  );
}

function InstantCard(props) {
  const {
    instant,
    isAudioPlaying,
    isDiscordPlaying,
    isActive,
    onPlay,
    onPlayOnDiscord,
    onStop,
    children
  } = props;

  return (
    <Grid item xs={3}>
      <Paper sx={{ padding: "15px", position: "relative" }}>
        <Grid container>
          <Grid container>
            <Box component="h3" sx={{ marginBottom: "15px" }}>
              {instant.name}
            </Box>
          </Grid>
          <Grid container>
            <Grid item xs={12}>
              <InstantCardAction
                title="Reproduzir"
                color={actionColors.play}
                disabled={isDiscordPlaying}
                onClick={() => onPlay(instant)}
              >
                <PlayCircleFilledIcon />
              </InstantCardAction>
              <InstantCardAction
                title="Enviar para o Discord"
                color={actionColors.discord}
                disabled={isAudioPlaying}
                onClick={() => onPlayOnDiscord(instant)}
              >
                <SendIcon />
              </InstantCardAction>
              <InstantCardAction
                title="Parar reprodução"
                color={actionColors.stop}
                disabled={!isActive}
                onClick={onStop}
              >
                <StopIcon />
              </InstantCardAction>
              {children}
            </Grid>
          </Grid>
        </Grid>
      </Paper>
    </Grid>
  );
}

export default InstantCard;
