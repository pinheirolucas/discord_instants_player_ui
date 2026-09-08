import React, { useState, useEffect } from "react";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import TextField from "@mui/material/TextField";

function SaveForm(props) {

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
    if (!e.target.value) {
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

    if (!link) {
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
          sx={{ width: "250px" }}
          onChange={handleName}
          autoFocus
        />
      </DialogContent>
      <DialogContent>
        <TextField
          label="Link"
          value={link}
          error={Boolean(linkError)}
          helperText={linkError}
          sx={{ width: "250px" }}
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
