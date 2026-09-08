import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ImportForm from "./ImportForm";

const existing = [
  { name: "Primeiro", url: "https://www.myinstants.com/a/" },
  { name: "Segundo", url: "https://www.myinstants.com/b/" }
];

const incoming = [
  // Same url as "Primeiro", different name — this is what distinguishes a
  // replace from a merge.
  { name: "Primeiro renomeado", url: "https://www.myinstants.com/a/" },
  { name: "Terceiro", url: "https://www.myinstants.com/c/" }
];

function storedInstants() {
  return JSON.parse(localStorage.getItem("instants"));
}

function jsonFile(content, name = "config.json") {
  return new File([JSON.stringify(content)], name, { type: "application/json" });
}

function renderForm({ instants = existing } = {}) {
  localStorage.setItem("instants", JSON.stringify(instants));

  const onClose = vi.fn();
  const result = render(<ImportForm open onClose={onClose} />);

  return { ...result, onClose };
}

// react-dropzone's root has no accessible role, and its file input is
// deliberately hidden, so there is nothing to query by role or label. Uploading
// straight to the input is what react-dropzone's own docs suggest for tests.
function fileInput() {
  return document.querySelector('input[type="file"]');
}

async function upload(user, file) {
  await user.upload(fileInput(), file);
}

describe("ImportForm", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("asks for a file and offers nothing else until one arrives", () => {
    renderForm();

    expect(
      screen.getByText(/Arraste o arquivo que deseja importar para cá/)
    ).toBeInTheDocument();
    expect(screen.queryByText("O que você deseja importar?")).toBeNull();
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
  });

  it("confirms the file by name and reveals the import options", async () => {
    const user = userEvent.setup();
    renderForm();

    await upload(user, jsonFile({ instants: incoming }));

    expect(await screen.findByText('Arquivo "config.json" carregado.')).toBeInTheDocument();
    expect(screen.getByText("O que você deseja importar?")).toBeInTheDocument();
  });

  it("keeps Salvar disabled until both the switch and a strategy are chosen", async () => {
    const user = userEvent.setup();
    renderForm();

    await upload(user, jsonFile({ instants: incoming }));
    await screen.findByText('Arquivo "config.json" carregado.');

    const save = screen.getByRole("button", { name: "Salvar" });
    expect(save).toBeDisabled();

    await user.click(screen.getByRole("switch", { name: "Instants" }));
    expect(save).toBeDisabled();

    await user.click(screen.getByRole("radio", { name: "Substituí-los" }));
    expect(save).toBeEnabled();
  });

  it('replaces the stored instants outright when "Substituí-los" is chosen', async () => {
    const user = userEvent.setup();
    const { onClose } = renderForm();

    await upload(user, jsonFile({ instants: incoming }));
    await screen.findByText('Arquivo "config.json" carregado.');

    await user.click(screen.getByRole("switch", { name: "Instants" }));
    await user.click(screen.getByRole("radio", { name: "Substituí-los" }));
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(storedInstants()).toEqual(incoming);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('keeps the stored instants and adds only new urls when "Mantê-los" is chosen', async () => {
    const user = userEvent.setup();
    renderForm();

    await upload(user, jsonFile({ instants: incoming }));
    await screen.findByText('Arquivo "config.json" carregado.');

    await user.click(screen.getByRole("switch", { name: "Instants" }));
    await user.click(screen.getByRole("radio", { name: "Mantê-los" }));
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    // The incoming "Primeiro renomeado" shares a url with the stored
    // "Primeiro", so the stored name wins and only "Terceiro" is appended.
    expect(storedInstants()).toEqual([...existing, incoming[1]]);
  });

  it("treats a file with no instants key as an empty import", async () => {
    const user = userEvent.setup();
    renderForm();

    await upload(user, jsonFile({ theme: "dark" }));
    await screen.findByText('Arquivo "config.json" carregado.');

    await user.click(screen.getByRole("switch", { name: "Instants" }));
    await user.click(screen.getByRole("radio", { name: "Substituí-los" }));
    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(storedInstants()).toEqual([]);
  });

  it("leaves storage alone when the import switch is off", async () => {
    const user = userEvent.setup();
    const { onClose } = renderForm();

    await upload(user, jsonFile({ instants: incoming }));
    await screen.findByText('Arquivo "config.json" carregado.');

    // Salvar is disabled in this state, so close through Cancelar instead.
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(storedInstants()).toEqual(existing);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("rejects a file that is not .json", async () => {
    // user-event replicates the file picker's own `accept` filtering, and
    // react-dropzone sets accept="application/json,.json" on its input — so with
    // the default settings the .txt never reaches the component and the
    // rejection path is unreachable. Dragging a file onto the dropzone is not
    // filtered that way in a real browser, which is exactly how a user gets
    // here, so the filter is switched off rather than worked around.
    const user = userEvent.setup({ applyAccept: false });
    renderForm();

    await upload(
      user,
      new File(["hello"], "notes.txt", { type: "text/plain" })
    );

    expect(
      await screen.findByText(/O tipo de arquivo inserido é inválido/)
    ).toBeInTheDocument();
    expect(screen.queryByText("O que você deseja importar?")).toBeNull();
  });

  it("reports a .json file whose contents are not valid JSON", async () => {
    const user = userEvent.setup();
    renderForm();

    await upload(
      user,
      new File(["{ not json"], "config.json", { type: "application/json" })
    );

    expect(
      await screen.findByText("O conteúdo do arquivo inserido é inválido")
    ).toBeInTheDocument();
  });

  // Worth pinning down because the source carries a comment explaining it:
  // react-dropzone hands back a fresh acceptedFiles identity even on a
  // rejection, so splitting acceptance and rejection into two effects made the
  // acceptance one run second and clear the error that had just been set.
  it("keeps the rejection message visible instead of clearing it", async () => {
    // user-event replicates the file picker's own `accept` filtering, and
    // react-dropzone sets accept="application/json,.json" on its input — so with
    // the default settings the .txt never reaches the component and the
    // rejection path is unreachable. Dragging a file onto the dropzone is not
    // filtered that way in a real browser, which is exactly how a user gets
    // here, so the filter is switched off rather than worked around.
    const user = userEvent.setup({ applyAccept: false });
    renderForm();

    await upload(user, new File(["hello"], "notes.txt", { type: "text/plain" }));
    const message = await screen.findByText(/O tipo de arquivo inserido é inválido/);

    // Give any second effect pass a chance to wipe it.
    await waitFor(() => expect(message).toBeInTheDocument());
    expect(screen.queryByText(/Arraste o arquivo que deseja importar/)).toBeNull();
  });

  it("recovers when a good file follows a rejected one", async () => {
    // user-event replicates the file picker's own `accept` filtering, and
    // react-dropzone sets accept="application/json,.json" on its input — so with
    // the default settings the .txt never reaches the component and the
    // rejection path is unreachable. Dragging a file onto the dropzone is not
    // filtered that way in a real browser, which is exactly how a user gets
    // here, so the filter is switched off rather than worked around.
    const user = userEvent.setup({ applyAccept: false });
    renderForm();

    await upload(user, new File(["hello"], "notes.txt", { type: "text/plain" }));
    await screen.findByText(/O tipo de arquivo inserido é inválido/);

    await upload(user, jsonFile({ instants: incoming }, "good.json"));

    expect(await screen.findByText('Arquivo "good.json" carregado.')).toBeInTheDocument();
    expect(screen.queryByText(/O tipo de arquivo inserido é inválido/)).toBeNull();
  });

  it("offers exactly the two strategies, with neither preselected", async () => {
    const user = userEvent.setup();
    renderForm();

    await upload(user, jsonFile({ instants: incoming }));
    await screen.findByText('Arquivo "config.json" carregado.');
    await user.click(screen.getByRole("switch", { name: "Instants" }));

    const group = within(screen.getByRole("radiogroup"));
    const radios = group.getAllByRole("radio");

    expect(radios).toHaveLength(2);
    radios.forEach(radio => expect(radio).not.toBeChecked());
  });
});
