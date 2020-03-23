import React, { useState, useEffect } from "react";

import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import TextField from "@material-ui/core/TextField";
import { makeStyles } from "@material-ui/core/styles";

const useStyles = makeStyles(theme => ({
  input: {
    width: "250px"
  }
}));

const instantsUrlPrefix = "https://www.myinstants.com/media/sounds/";
const instantsUrlSufix = ".mp3";

function isInstantsUrlValid(url) {
  return (
    url && url.startsWith(instantsUrlPrefix) && url.endsWith(instantsUrlSufix)
  );
}

function SaveForm(props) {
  const classes = useStyles();

  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");

  const [link, setLink] = useState("");
  const [linkError, setLinkError] = useState("");

  const { open, onSave, onCancel } = props;

  useEffect(
    () => () => {
      setName("");
      setNameError("");
      setLink("");
      setLinkError("");
    },
    [open]
  );

  function handleName(e) {
    if (e.target.value.length < 3) {
      setNameError("Mínimo 3 caracteres");
    } else {
      setNameError("");
    }

    setName(e.target.value);
  }

  function handleLink(e) {
    if (!isInstantsUrlValid(e.target.value)) {
      setLinkError("Link inválido");
    } else {
      setLinkError("");
    }

    setLink(e.target.value);
  }

  function handleSave() {
    if (name.length < 3) {
      setNameError("Mínimo 3 caracteres");
      return;
    }

    if (!isInstantsUrlValid(link)) {
      setLinkError("Link inválido");
      return;
    }

    onSave && onSave(name, link);
  }

  function handleClose() {
    setName("");
    setNameError("");
    setLink("");
    setLinkError("");
  }

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>Adicionar MyInstant</DialogTitle>
      <DialogContent>
        <TextField
          label="Nome"
          value={name}
          error={Boolean(nameError)}
          helperText={nameError}
          className={classes.input}
          onChange={handleName}
        />
      </DialogContent>
      <DialogContent>
        <TextField
          label="Link"
          value={link}
          error={Boolean(linkError)}
          helperText={linkError}
          className={classes.input}
          onChange={handleLink}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancelar</Button>
        <Button onClick={handleSave}>Salvar</Button>
      </DialogActions>
    </Dialog>
  );
}

export default SaveForm;
