import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Server } from "../electron/discovery";
import { AppearanceDock } from "./components/AppearanceDock";
import { AppearanceStage } from "./components/AppearanceStage";
import { Button, IconButton } from "./components/Button";
import { Menu, MenuItem, MenuSeparator } from "./components/Menu";
import { SearchField } from "./components/SearchField";
import { Segmented, SegmentedPanel, SegmentedRoot } from "./components/Segmented";
import { TitleBar } from "./components/TitleBar";
import { Toast, ToastProvider } from "./components/Toast";
import { TooltipProvider } from "./components/Tooltip";
import FavoritesPanel from "./FavoritesPanel";
import { useAppearance } from "./hooks/useAppearance";
import { useLanguage } from "./hooks/useLanguage";
import { useNativeChrome } from "./hooks/useNativeChrome";
import { findShortcutLabel, isFindShortcut, useChromeKind, usePlatform } from "./hooks/usePlatform";
import { useRegion } from "./hooks/useRegion";
import { useStamp } from "./hooks/useStamp";
import { CheckIcon, MoreIcon, PlusIcon } from "./icons";
import ImportForm from "./ImportForm";
import MyInstantsPanel from "./MyInstantsPanel";
import RegionMenu from "./RegionMenu";
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
import "./styles/shell.css";

type Tab = "favorites" | "myinstants";

const SEARCH_DEBOUNCE = 300;

interface ToastState extends SnackbarOptions {
  open: boolean;
  /** Bumped on every show, so a repeat remounts the toast: a fresh timer,
   *  and a screen reader announces it again. */
  key: number;
}

export default function App() {
  const { t } = useTranslation();

  // Palette and colour mode, both stamped on <html>. Mode is auto by default
  // and follows the OS until the user picks a side. Both are changed in the
  // Aparência shell, which previews live and persists only on Pronto.
  const appearance = useAppearance();
  const { theme, resolved, editing } = appearance;

  const { language, setLanguage } = useLanguage();

  const os = usePlatform();
  const chrome = useChromeKind();

  // index.html stamps both pre-paint from the bridge; these keep them in
  // step with the dev overrides (?os=, ?chrome=), which it does not read.
  useStamp("os", os);
  useStamp("chrome", chrome);

  // After the mode and theme stamps above, so it reads the new palette.
  useNativeChrome(resolved, theme);

  const [tab, setTab] = useState<Tab>("favorites");
  const [summary, setSummary] = useState("");
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const searchRef = useRef<HTMLInputElement>(null);

  const { region, setRegion } = useRegion();

  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const [servers, setServers] = useState<Server[]>([]);
  const [serverMenuOpen, setServerMenuOpen] = useState(false);
  const [selectedServer, setSelectedServer] = useSelectedServer(null);
  const [activeUrl, setActiveUrl] = useState<string>(defaultApiUrl);
  const [healthy, setHealthy] = useState<boolean>(isHealthy);
  const healthyRef = useRef<boolean>(isHealthy());

  const [toast, setToast] = useState<ToastState>({ open: false, key: 0, message: "" });

  const tabs = useMemo(
    () => [
      { value: "favorites" as const, label: t("app.tabFavorites") },
      { value: "myinstants" as const, label: "MyInstants" }
    ],
    [t]
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Per-platform: Cmd on macOS, where Ctrl+F moves the cursor forward a
      // character and is not a find at all. Not while Aparência is open: the
      // search sits in the staged app, behind the dock's focus trap.
      if (editing || !isFindShortcut(event, os)) {
        return;
      }

      event.preventDefault();
      searchRef.current?.focus();
      searchRef.current?.select();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [os, editing]);

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
          message: t("app.connectionError", { address: formatApiUrl(getApiUrl()) }),
          actionLabel: t("common.switch"),
          onAction: () => setServerMenuOpen(true)
        })
      ),
    [showToast, t]
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
            {chrome === "custom" && <TitleBar os={os} />}
            <AppearanceStage open={editing}>
              <header className="hero">
                <h1>{tab === "favorites" ? t("app.tabFavorites") : "MyInstants"}</h1>
                <span className="count" aria-live="polite">
                  {summary}
                </span>
                <span className="spacer" />
                <Segmented aria-label={t("app.sectionAriaLabel")} options={tabs} />
              </header>

              <div className="tools">
                <SearchField
                  ref={searchRef}
                  aria-label={t("app.searchAriaLabel")}
                  placeholder={t("app.searchPlaceholder")}
                  shortcut={findShortcutLabel(os)}
                  value={query}
                  onChange={(event) => handleSearchChange(event.target.value)}
                />
                {tab === "favorites" && (
                  <Button onClick={() => setAddOpen(true)}>
                    <PlusIcon />
                    {t("app.add")}
                  </Button>
                )}
                {tab === "myinstants" && <RegionMenu region={region} onSelect={setRegion} />}
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
                    <IconButton label={t("app.moreOptions")}>
                      <MoreIcon />
                    </IconButton>
                  }
                >
                  <MenuItem primary={t("app.import")} onSelect={() => setImportOpen(true)} />
                  <MenuItem primary={t("app.export")} onSelect={() => exportToJSON()} />
                  <MenuSeparator />
                  <MenuItem primary={t("app.appearance")} onSelect={appearance.begin} />
                  <MenuSeparator />
                  <MenuItem
                    tick={language === "pt-BR" ? <CheckIcon /> : null}
                    primary={t("app.languagePtBR")}
                    onSelect={() => setLanguage("pt-BR")}
                  />
                  <MenuItem
                    tick={language === "en-US" ? <CheckIcon /> : null}
                    primary={t("app.languageEnUS")}
                    onSelect={() => setLanguage("en-US")}
                  />
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
                    region={region}
                    healthy={healthy}
                    serverAddress={serverAddress}
                    onSwitchServer={openServerMenu}
                    onSummary={setSummary}
                    onClearSearch={clearSearch}
                  />
                </SegmentedPanel>
              </main>
            </AppearanceStage>

            {editing && (
              <AppearanceDock
                theme={appearance.theme}
                mode={appearance.mode}
                resolved={resolved}
                onThemeChange={(next) => appearance.preview({ theme: next })}
                onModeChange={(next) => appearance.preview({ mode: next })}
                onCancel={appearance.cancel}
                onConfirm={appearance.commit}
              />
            )}
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
