import { useEffect, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { Button } from "./components/Button";
import { Dialog } from "./components/Dialog";
import { Field } from "./components/Field";

const MIN_NAME = 3;

export interface SaveFormProps {
  open: boolean;
  onCancel: () => void;
  onSave: (name: string, url: string) => void;
}

export default function SaveForm({ open, onCancel, onSave }: SaveFormProps) {
  const [name, setName] = useState("");
  const [link, setLink] = useState("");
  const [touched, setTouched] = useState({ name: false, link: false });

  // Every open starts blank rather than showing what was typed last time.
  useEffect(() => {
    if (open) {
      setName("");
      setLink("");
      setTouched({ name: false, link: false });
    }
  }, [open]);

  const valid = name.length >= MIN_NAME && Boolean(link);
  const nameError = touched.name && name.length < MIN_NAME ? "Mínimo 3 caracteres" : "";
  const linkError = touched.link && !link ? "Link inválido" : "";

  function submit() {
    if (!valid) {
      setTouched({ name: true, link: true });
      return;
    }

    onSave(name, link);
  }

  // Two fields and no submit button inside the form means the browser never
  // submits on Enter by itself, so do it here.
  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      submit();
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
      title="Adicionar instant"
      description="Cole o link de um som do myinstants.com e dê um nome que você reconheça na grade."
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          {/* Dead until both fields pass, so an invalid save is never offered. */}
          <Button onClick={submit} disabled={!valid}>
            Salvar
          </Button>
        </>
      }
    >
      <form
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          submit();
        }}
        onKeyDown={handleKeyDown}
        style={{ display: "grid", gap: 12 }}
      >
        <Field
          label="Nome"
          value={name}
          error={nameError}
          autoFocus
          onChange={(event) => {
            setName(event.target.value);
            setTouched((t) => ({ ...t, name: true }));
          }}
        />
        <Field
          label="Link"
          value={link}
          error={linkError}
          placeholder="https://www.myinstants.com/pt/instant/…"
          onChange={(event) => {
            setLink(event.target.value);
            setTouched((t) => ({ ...t, link: true }));
          }}
        />
      </form>
    </Dialog>
  );
}
