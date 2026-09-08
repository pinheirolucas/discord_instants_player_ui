import React, { useState, useEffect, useCallback, useRef } from "react";

import * as R from "ramda";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import makeStyles from '@mui/styles/makeStyles';
import { useDropzone } from "react-dropzone";

import {
  useInstantsState,
  useUrlCodeMap,
  useCodeUrlMap,
  useCodeKeyMap
} from "./storage";
import { getUrls } from "./instantUtils";

const useStyles = makeStyles({
  content: {
    overflow: "hidden"
  },
  dropzone: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "20px",
    borderWidth: "2px",
    borderRadius: "2px",
    borderColor: "#eeeeee",
    borderStyle: "dashed",
    backgroundColor: "#fafafa",
    color: "#bdbdbd",
    outline: "none",
    transition: "border .24s ease-in-out",
    textAlign: "center"
  }
});

function ImportForm(props) {
  const classes = useStyles();

  const readerRef = useRef(new FileReader());
  const [switches, setSwitches] = useState({
    importKeybindings: false,
    importInstants: false,
    instantsAction: ""
  });
  const [fileContent, setFileContent] = useState("");
  const [fileContentError, setFileContentError] = useState("");
  const [fileSuccessMessage, setFileSuccessMessage] = useState("");

  const [instants, setInstants] = useInstantsState([]);
  const [, setUrlCodeMap] = useUrlCodeMap({});
  const [, setCodeUrlMap] = useCodeUrlMap({});
  const [, setCodeKeyMap] = useCodeKeyMap({});

  const {
    acceptedFiles,
    fileRejections,
    getRootProps,
    getInputProps
  } = useDropzone({
    multiple: false,
    accept: { "application/json": [".json"] }
  });

  const { open, onClose } = props;

  const clear = useCallback(() => {
    setSwitches({
      importKeybindings: false,
      importInstants: false,
      instantsAction: ""
    });
    setFileContent("");
    setFileContentError("");
    setFileSuccessMessage("");
  }, []);

  useEffect(() => {
    function handleFileLoad(e) {
      try {
        const content = JSON.parse(e.target.result);
        setFileContent(content);
      } catch {
        setFileContentError("O conteúdo do arquivo inserido é inválido");
      }
    }

    const reader = readerRef.current;
    reader.addEventListener("load", handleFileLoad);

    return () => {
      reader.removeEventListener("load", handleFileLoad);
      clear();
    };
  }, [open, clear]);

  // Acceptance and rejection are handled in one effect on purpose. react-dropzone
  // hands back a fresh `acceptedFiles` identity even when a file was rejected and
  // the array stays empty, so as two separate effects the acceptedFiles one runs
  // second, calls clear(), and wipes the error the rejection just set.
  useEffect(() => {
    clear();

    if (fileRejections.length) {
      setFileContentError(
        "O tipo de arquivo inserido é inválido. Apenas arquivos com extensão .json são permitidos"
      );
      return;
    }

    const [file] = acceptedFiles;
    if (file) {
      setFileSuccessMessage(`Arquivo "${file.name}" carregado.`);
      readerRef.current.readAsText(file, "utf-8");
    }
  }, [acceptedFiles, fileRejections, clear]);

  function handleSave() {
    // TODO: validate the keybindings to remove the unused ones
    if (switches.importKeybindings) {
      setUrlCodeMap(fileContent.urlCodeMap || {});
      setCodeUrlMap(fileContent.codeUrlMap || {});
      setCodeKeyMap(fileContent.codeKeyMap || {});
    }

    if (switches.importInstants) {
      switch (switches.instantsAction) {
        case "replace":
          setInstants(fileContent.instants || []);
          break;
        case "merge":
          const fileUrls = getUrls(fileContent.instants || []);
          const savedUrls = getUrls(instants);
          const newInstantsUrls = R.difference(fileUrls, savedUrls);
          const newInstants = (fileContent.instants || []).filter(({ url }) =>
            newInstantsUrls.includes(url)
          );
          setInstants([...instants, ...newInstants]);
          break;
        default:
          return;
      }
    }

    onClose && onClose();
  }

  function handleClose() {
    onClose && onClose();
  }

  function handleChange(e) {
    setSwitches({ ...switches, [e.target.name]: e.target.checked });
  }

  function handleChangeInstantsAction(e) {
    setSwitches({ ...switches, instantsAction: e.target.value });
  }

  function isDone() {
    const { importInstants, importKeybindings, instantsAction } = switches;
    return (
      !Boolean(fileContentError) &&
      ((importKeybindings && !importInstants) ||
        (importKeybindings && importInstants && instantsAction) ||
        (!importKeybindings && importInstants && instantsAction))
    );
  }

  const showAllOptions = Boolean(acceptedFiles.length);
  const showInstantOptions = switches.importInstants;
  const isSaveDisabled = !isDone();
  const dropzoneMessage = Boolean(fileContentError)
    ? fileContentError
    : Boolean(fileSuccessMessage)
    ? fileSuccessMessage
    : "Arraste o arquivo que deseja importar para cá, ou clique para selecionar um arquivo";

  return (
    <Dialog open={open} scroll="body" onClose={handleClose}>
      <DialogTitle>Importar instants</DialogTitle>
      <DialogContent className={classes.content}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <div {...getRootProps({ className: classes.dropzone })}>
              <input {...getInputProps()} />
              <p>{dropzoneMessage}</p>
            </div>
          </Grid>
          {showAllOptions ? (
            <Grid container item spacing={3}>
              <Grid item xs={12}>
                <Typography variant="body1">
                  O que você deseja importar?
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      name="importKeybindings"
                      checked={switches.importKeybindings}
                      onChange={handleChange}
                    />
                  }
                  label="Atalhos de teclado"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      name="importInstants"
                      checked={switches.importInstants}
                      onChange={handleChange}
                    />
                  }
                  label="Instants"
                />
              </Grid>
              {showInstantOptions ? (
                <Grid container item spacing={3}>
                  <Grid item xs={12}>
                    <Typography variant="body1">
                      E o que você deseja fazer com os instants que já existem?
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <RadioGroup
                      name="instantsAction"
                      value={switches.instantsAction}
                      onChange={handleChangeInstantsAction}
                      row
                    >
                      <FormControlLabel
                        value="replace"
                        control={<Radio />}
                        label="Substituí-los"
                      />
                      <FormControlLabel
                        value="merge"
                        control={<Radio />}
                        label="Mantê-los"
                      />
                    </RadioGroup>
                  </Grid>
                </Grid>
              ) : null}
            </Grid>
          ) : null}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} disabled={isSaveDisabled}>
          Salvar
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default ImportForm;
