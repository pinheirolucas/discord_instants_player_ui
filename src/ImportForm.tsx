import * as R from "ramda";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "./components/Button";
import { Dialog } from "./components/Dialog";
import { DropZone } from "./components/DropZone";
import type { DropState } from "./components/DropZone";
import { RadioGroup } from "./components/Radio";
import { Switch } from "./components/Switch";
import { useInstantsState } from "./storage";
import type { Instant } from "./storage";
import "./forms.css";

type Strategy = "" | "merge" | "replace";

interface Backup {
  instants?: Instant[];
}

const REJECTED_TYPE = "Só arquivos .json são aceitos.";
const REJECTED_CONTENT = "O conteúdo não é um JSON válido.";

function countLabel(n: number): string {
  return `${n} ${n === 1 ? "instant" : "instants"} no arquivo`;
}

export interface ImportFormProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Restores a backup written by Exportar. Only "instants" is ever read back —
 * which is also why a backup from before the token rebuild, whose "theme" key
 * still holds "light"/"dark", needs no migration: that key is never applied.
 */
export default function ImportForm({ open, onClose }: ImportFormProps) {
  const readerRef = useRef<FileReader | null>(null);
  if (!readerRef.current) {
    readerRef.current = new FileReader();
  }

  const [importInstants, setImportInstants] = useState(false);
  const [strategy, setStrategy] = useState<Strategy>("");
  const [content, setContent] = useState<Backup | null>(null);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");

  const [instants, setInstants] = useInstantsState([]);

  const { acceptedFiles, fileRejections, getRootProps, getInputProps, isDragActive } =
    useDropzone({
      multiple: false,
      accept: { "application/json": [".json"] }
    });

  const clear = useCallback(() => {
    setImportInstants(false);
    setStrategy("");
    setContent(null);
    setError("");
    setFileName("");
  }, []);

  useEffect(() => {
    function handleLoad(event: ProgressEvent<FileReader>) {
      try {
        const parsed = JSON.parse(String(event.target?.result ?? ""));
        setContent(parsed && typeof parsed === "object" ? parsed : {});
      } catch {
        setError(REJECTED_CONTENT);
      }
    }

    const reader = readerRef.current!;
    reader.addEventListener("load", handleLoad);

    return () => {
      reader.removeEventListener("load", handleLoad);
      clear();
    };
  }, [open, clear]);

  // Acceptance and rejection are handled in one effect on purpose.
  // react-dropzone hands back a fresh `acceptedFiles` identity even when a
  // file was rejected and the array stays empty, so as two separate effects
  // the acceptance one runs second, calls clear(), and wipes the error the
  // rejection just set.
  useEffect(() => {
    clear();

    if (fileRejections.length) {
      setError(REJECTED_TYPE);
      return;
    }

    const [file] = acceptedFiles;
    if (file) {
      setFileName(file.name);
      readerRef.current!.readAsText(file, "utf-8");
    }
  }, [acceptedFiles, fileRejections, clear]);

  const incoming = content?.instants ?? [];
  // The options appear only once the file is actually parsed, so there is
  // never a moment where Importar is offered against content not yet read.
  const parsed = Boolean(fileName) && !error && content !== null;
  const canImport = parsed && importInstants && strategy !== "";

  function handleImport() {
    if (!canImport) {
      return;
    }

    if (strategy === "replace") {
      setInstants(incoming);
    } else {
      // Keep what is stored; add only urls not already there, so a stored
      // name wins over an incoming one for the same clip.
      const saved = R.pluck("url", instants);
      setInstants([...instants, ...incoming.filter(({ url }) => !saved.includes(url))]);
    }

    onClose();
  }

  let dropState: DropState = "idle";
  let title = "";
  let hint: string | undefined;

  if (error) {
    dropState = "bad";
    title = "Esse arquivo não serve";
    hint = error;
  } else if (fileName) {
    dropState = "ok";
    title = fileName;
    hint = content ? countLabel(incoming.length) : "Lendo o arquivo…";
  } else if (isDragActive) {
    dropState = "over";
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="Importar instants"
      description="Um arquivo .json gerado pelo Exportar desta app."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleImport} disabled={!canImport}>
            Importar
          </Button>
        </>
      }
    >
      <div {...getRootProps({ className: "drop-root" })}>
        <input {...getInputProps()} />
        <DropZone state={dropState} title={title} hint={hint} />
      </div>

      {parsed && (
        <div className="opts">
          <p className="q">O que você quer importar?</p>
          <Switch label="Instants" checked={importInstants} onCheckedChange={setImportInstants} />
          {importInstants && (
            <>
              <p className="q">E os que você já tem?</p>
              <RadioGroup<Strategy>
                aria-label="E os que você já tem?"
                value={strategy}
                onChange={setStrategy}
                options={[
                  { value: "merge", label: "Manter os meus" },
                  { value: "replace", label: "Substituir tudo" }
                ]}
              />
            </>
          )}
        </div>
      )}
    </Dialog>
  );
}
