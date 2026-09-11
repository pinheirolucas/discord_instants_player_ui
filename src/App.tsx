import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Server } from "../electron/discovery";
import { Button, IconButton } from "./components/Button";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "./components/Menu";
import { SearchField } from "./components/SearchField";
import { Segmented, SegmentedPanel, SegmentedRoot } from "./components/Segmented";
import { Toast, ToastProvider } from "./components/Toast";
import { TooltipProvider } from "./components/Tooltip";
import FavoritesPanel from "./FavoritesPanel";
import { useColorMode } from "./hooks/useColorMode";
import { findShortcutLabel, isFindShortcut, usePlatform } from "./hooks/usePlatform";
import { useTheme } from "./hooks/useTheme";
import { CheckIcon, MoreIcon, PlusIcon } from "./icons";
import ImportForm from "./ImportForm";
import MyInstantsPanel from "./MyInstantsPanel";
import ServerMenu, { formatApiUrl } from "./ServerMenu";
import {
  defaultApiUrl,
  getApiUrl,
  isHealthy,
  onConnectionError,
  onHealthChange,
  setApiUrl
} from "./service";
import SnackbarContext from "./SnackbarContext";
import type { SnackbarOptions } from "./SnackbarContext";
import { exportToJSON } from "./state";
import { useSelectedServer } from "./storage";
import type { ColorMode } from "./themes";
import "./styles/shell.css";

type Tab = "favorites" | "myinstants";

const TABS: { value: Tab; label: string }[] = [
  { value: "favorites", label: "Favoritos" },
  { value: "myinstants", label: "MyInstants" }
];

const MODES: { value: ColorMode; label: string }[] = [
  { value: "auto", label: "Automático" },
  { value: "light", label: "Claro" },
  { value: "dark", label: "Escuro" }
];

const SEARCH_DEBOUNCE = 300;

interface ToastState extends SnackbarOptions {
  open: boolean;
  /** Bumped on every show, so a repeat remounts the toast: a fresh timer,
   *  and a screen reader announces it again. */
  key: number;
}

export default function App() {
  // auto by default: follows the OS until the user picks a side in the
  // overflow menu, and then stays put.
  const { mode, setMode } = useColorMode();

  // Stamps data-theme. The palette is wired and persisted but has no control
  // in the UI yet, so every install runs on the default.
  useTheme();

  const os = usePlatform();

  const [tab, setTab] = useState<Tab>("favorites");
  const [summary, setSummary] = useState("");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const searchRef = useRef<HTMLInputElement>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const [servers, setServers] = useState<Server[]>([]);
  const [serverMenuOpen, setServerMenuOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useSelectedServer(null);
  const [activeUrl, setActiveUrl] = useState<string>(defaultApiUrl);
  const [healthy, setHealthy] = useState<boolean>(isHealthy);
  const healthyRef = useRef<boolean>(isHealthy());

  const [toast, setToast] = useState<ToastState>({ open: false, key: 0, message: "" });

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Per-platform: Cmd on macOS, where Ctrl+F moves the cursor forward a
      // character and is not a find at all.
      if (!isFindShortcut(event, os)) {
        return;
      }

      event.preventDefault();
      searchRef.current?.focus();
      searchRef.current?.select();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [os]);

  useEffect(() => () => clearTimeout(debounce.current), []);

  // Discovery is an upgrade, never a precondition: in a plain browser tab
  // there is no bridge at all, and that has to be a no-op.
  useEffect(() => {
    const discovery = window.instantsDiscovery;

    if (!discovery || typeof discovery.onServers !== "function") {
      return undefined;
    }

    const unsubscribe = discovery.onServers((discovered) => {
      setServers(Array.isArray(discovered) ? (discovered as Server[]) : []);
    });

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, []);

  useEffect(
    () =>
      onHealthChange((next: boolean) => {
        healthyRef.current = next;
        setHealthy(next);
      }),
    []
  );

  // Precedence: an explicit pick (re-validated, so a stale or malformed one
  // falls through), then the first discovered server — the list arrives
  // sorted, so that is stable across launches — then the default.
  useEffect(() => {
    if (!(selectedServer && setApiUrl(selectedServer))) {
      setApiUrl(servers.length > 0 ? servers[0].apiUrl : defaultApiUrl);
    }
    setActiveUrl(getApiUrl());
  }, [servers, selectedServer]);

  const showToast = useCallback((options: SnackbarOptions) => {
    setToast((current) => ({ ...options, open: true, key: current.key + 1 }));
  }, []);

  // Every failure, not only the transition, so a second failed click is
  // never silent.
  useEffect(
    () =>
      onConnectionError(() =>
        showToast({
          message: `Não foi possível falar com ${formatApiUrl(getApiUrl())}`,
          actionLabel: "Trocar",
          onAction: () => setServerMenuOpen(true)
        })
      ),
    [showToast]
  );

  const openSnackbar = useCallback(
    (options: SnackbarOptions) => {
      // While unreachable, the connection toast is the accurate one — and a
      // panel's own generic error, whose catch always runs after it, would
      // otherwise clobber it.
      if (!healthyRef.current) {
        return;
      }

      showToast(options);
    },
    [showToast]
  );

  const closeSnackbar = useCallback(() => {
    setToast((current) => ({ ...current, open: false }));
  }, []);

  const snackbar = useMemo(
    () => ({ openSnackbar, closeSnackbar }),
    [openSnackbar, closeSnackbar]
  );

  function handleSearchChange(value: string) {
    setQuery(value);
    clearTimeout(debounce.current);
    debounce.current = setTimeout(() => setSearch(value), SEARCH_DEBOUNCE);
  }

  function clearSearch() {
    clearTimeout(debounce.current);
    setQuery("");
    setSearch("");
  }

  function refreshDiscovery() {
    const discovery = window.instantsDiscovery;
    if (discovery && typeof discovery.refresh === "function") {
      discovery.refresh();
    }
    setServerMenuOpen(false);
  }

  const serverAddress = formatApiUrl(activeUrl);
  const openServerMenu = () => setServerMenuOpen(true);

  return (
    <SnackbarContext.Provider value={snackbar}>
      <TooltipProvider>
        <ToastProvider>
          <SegmentedRoot value={tab} onChange={setTab} className="app">
            <header className="hero">
              <h1>{tab === "favorites" ? "Favoritos" : "MyInstants"}</h1>
              <span className="count" aria-live="polite">
                {summary}
              </span>
              <span className="spacer" />
              <Segmented aria-label="Seção" options={TABS} />
            </header>

            <div className="tools">
              <SearchField
                ref={searchRef}
                aria-label="Procurar um som"
                placeholder="Procurar um som…"
                shortcut={findShortcutLabel(os)}
                value={query}
                onChange={(event) => handleSearchChange(event.target.value)}
              />
              {tab === "favorites" && (
                <Button onClick={() => setAddOpen(true)}>
                  <PlusIcon />
                  Adicionar
                </Button>
              )}
              <span className="spacer" />
              <ServerMenu
                servers={servers}
                currentApiUrl={activeUrl}
                healthy={healthy}
                open={serverMenuOpen}
                onOpenChange={setServerMenuOpen}
                onSelect={(server) => {
                  setSelectedServer(server.apiUrl);
                  setServerMenuOpen(false);
                }}
                onRefresh={refreshDiscovery}
              />
              <Menu
                trigger={
                  <IconButton label="Mais opções">
                    <MoreIcon />
                  </IconButton>
                }
              >
                <MenuItem primary="Importar" onSelect={() => setImportOpen(true)} />
                <MenuItem primary="Exportar" onSelect={() => exportToJSON()} />
                <MenuSeparator />
                <MenuLabel>Aparência</MenuLabel>
                {MODES.map((option) => (
                  <MenuItem
                    key={option.value}
                    tick={mode === option.value ? <CheckIcon /> : null}
                    primary={option.label}
                    onSelect={() => setMode(option.value)}
                  />
                ))}
              </Menu>
            </div>

            <main className="scroll">
              <SegmentedPanel value="favorites">
                <FavoritesPanel
                  search={search}
                  healthy={healthy}
                  serverAddress={serverAddress}
                  onSwitchServer={openServerMenu}
                  onSummary={setSummary}
                  addOpen={addOpen}
                  onAddOpenChange={setAddOpen}
                  onSearchCatalog={() => setTab("myinstants")}
                />
              </SegmentedPanel>
              <SegmentedPanel value="myinstants">
                <MyInstantsPanel
                  search={search}
                  healthy={healthy}
                  serverAddress={serverAddress}
                  onSwitchServer={openServerMenu}
                  onSummary={setSummary}
                  onClearSearch={clearSearch}
                />
              </SegmentedPanel>
            </main>
          </SegmentedRoot>

          <ImportForm open={importOpen} onClose={() => setImportOpen(false)} />

          <Toast
            key={toast.key}
            open={toast.open}
            onOpenChange={(open) => setToast((current) => ({ ...current, open }))}
            message={toast.message}
            actionLabel={toast.actionLabel}
            onAction={toast.onAction}
            duration={toast.duration}
          />
        </ToastProvider>
      </TooltipProvider>
    </SnackbarContext.Provider>
  );
}
