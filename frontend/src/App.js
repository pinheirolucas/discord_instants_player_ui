import React, { useState } from "react";

import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";
import CssBaseline from "@material-ui/core/CssBaseline";
import Fab from "@material-ui/core/Fab";
import KeyboardArrowUpIcon from "@material-ui/icons/KeyboardArrowUp";
import Snackbar from "@material-ui/core/Snackbar";
import IconButton from "@material-ui/core/IconButton";
import CloseIcon from "@material-ui/icons/Close";

import InstantsList from "./InstantList";
import ScrollTop from "./ScrollTop";
import SnackbarContext from "./SnackbarContext";

import "./App.css";

const defaultOnSnackbarClose = () => {};
const defaultSnackAutoHideDuration = 6000;
const defaultSnackAction = <React.Fragment />;

function App() {
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMessage, setSnackMessage] = useState("");
  const [onSnackbarClose, setOnSnackbarClose] = useState(
    defaultOnSnackbarClose
  );
  const [snackAutoHideDuration, setSnackAutoHideDuration] = useState(
    defaultSnackAutoHideDuration
  );
  const [snackAction, setSnackAction] = useState(defaultSnackAction);

  function openSnackbar(options) {
    const { action, autoHideDuration, message, onClose } = options;

    setSnackOpen(true);
    setSnackMessage(message || "");
    setSnackAction(action || defaultSnackAction);
    setOnSnackbarClose(onClose || defaultOnSnackbarClose);
    setSnackAutoHideDuration(autoHideDuration || defaultSnackAutoHideDuration);
  }

  function closeSnackbar() {
    setSnackOpen(false);
  }

  function handleSnackbarClose(event, reason) {
    onSnackbarClose && onSnackbarClose(event, reason);
    setSnackOpen(false);
  }

  return (
    <React.Fragment>
      <CssBaseline />
      <AppBar>
        <Toolbar>
          <Typography variant="h6">Discord Instants Player</Typography>
        </Toolbar>
      </AppBar>
      <Toolbar id="back-to-top-anchor" />
      <SnackbarContext.Provider value={{ openSnackbar, closeSnackbar }}>
        <InstantsList />
      </SnackbarContext.Provider>
      <ScrollTop>
        <Fab color="secondary" size="small" aria-label="scroll back to top">
          <KeyboardArrowUpIcon />
        </Fab>
      </ScrollTop>
      <Snackbar
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center"
        }}
        open={snackOpen}
        autoHideDuration={snackAutoHideDuration}
        onClose={handleSnackbarClose}
        message={snackMessage}
        action={
          <React.Fragment>
            {snackAction}
            <IconButton
              size="small"
              aria-label="close"
              color="inherit"
              onClick={handleSnackbarClose}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </React.Fragment>
        }
      />
    </React.Fragment>
  );
}

export default App;
