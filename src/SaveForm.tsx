import { useEffect, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
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
  const nameError = touched.name && name.length < MIN_NAME ? t("save.nameError") : "";
  const linkError = touched.link && !link ? t("save.linkError") : "";

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
      title={t("save.title")}
      description={t("save.description")}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          {/* Dead until both fields pass, so an invalid save is never offered. */}
          <Button onClick={submit} disabled={!valid}>
            {t("save.action")}
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
          label={t("save.nameLabel")}
          value={name}
          error={nameError}
          autoFocus
          onChange={(event) => {
            setName(event.target.value);
            setTouched((current) => ({ ...current, name: true }));
          }}
        />
        <Field
          label={t("save.linkLabel")}
          value={link}
          error={linkError}
          placeholder={t("save.linkPlaceholder")}
          onChange={(event) => {
            setLink(event.target.value);
            setTouched((current) => ({ ...current, link: true }));
          }}
        />
      </form>
    </Dialog>
  );
}
