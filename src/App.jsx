import React, { useState, useEffect, useRef } from "react";

import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import CssBaseline from "@mui/material/CssBaseline";
import Snackbar from "@mui/material/Snackbar";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import MoreIcon from "@mui/icons-material/MoreVert";
import LightIcon from "@mui/icons-material/Brightness7";
import DarkIcon from "@mui/icons-material/Brightness4";
import {
  alpha,
  styled,
  ThemeProvider,
  StyledEngineProvider
} from "@mui/material/styles";
import Box from "@mui/material/Box";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";

import FocusableInput from "./FocusableInput";
import FavoritesPanel from "./FavoritesPanel";
import MyInstantsPanel from "./MyInstantsPanel";
import SnackbarContext from "./SnackbarContext";
import ImportForm from "./ImportForm";
import { setApiUrl } from "./service";
import { exportToJSON } from "./state";
import { useTheme } from "./storage";
import { darkTheme, lightTheme } from "./theme";

import "./App.css";

const defaultOnSnackbarClose = () => {};
const defaultSnackAutoHideDuration = 6000;
const defaultSnackAction = <React.Fragment />;

// The search box is the one piece here that is a reusable styled element rather
// than a one-off override: an icon absolutely positioned inside an input whose
// width grows on focus. Everything else in this file is plain sx props.
const Search = styled("div")(({ theme }) => ({
  position: "relative",
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.white, 0.15),
  "&:hover": {
    backgroundColor: alpha(theme.palette.common.white, 0.25)
  },
  marginLeft: 0,
  width: "100%",
  [theme.breakpoints.up("sm")]: {
    marginLeft: theme.spacing(1),
    width: "auto"
  }
}));

const SearchIconWrapper = styled("div")(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: "100%",
  position: "absolute",
  pointerEvents: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center"
}));

const SearchInput = styled(FocusableInput)(({ theme }) => ({
  color: "inherit",
  "& .MuiInputBase-input": {
    padding: theme.spacing(1, 1, 1, 0),
    // vertical padding + font size from SearchIconWrapper
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create("width"),
    width: "100%",
    [theme.breakpoints.up("sm")]: {
      width: "12ch",
      "&:focus": {
        width: "20ch"
      }
    }
  }
}));

// App only owns the theme choice and the providers; AppContent holds the UI.
// Keeping the providers above the consuming tree is what lets styled() and sx
// resolve theme.breakpoints / theme.spacing at render time.
function App() {
  const [themeName, setThemeName] = useTheme("light");

  return (
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={themeName === "light" ? lightTheme : darkTheme}>
        <AppContent themeName={themeName} setThemeName={setThemeName} />
      </ThemeProvider>
    </StyledEngineProvider>
  );
}

function AppContent({ themeName, setThemeName }) {

  const timeout = useRef(null);
  const [searchFocus, setSearchFocus] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [importFormOpen, setImportFormOpen] = useState(false);
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMessage, setSnackMessage] = useState("");
  const [selectedTab, setSelectedTab] = useState("favorites");
  const [onSnackbarClose, setOnSnackbarClose] = useState(
    defaultOnSnackbarClose
  );
  const [snackAutoHideDuration, setSnackAutoHideDuration] = useState(
    defaultSnackAutoHideDuration
  );
  const [snackAction, setSnackAction] = useState(defaultSnackAction);
  const [search, setSearch] = useState("");
  const menuOpen = Boolean(menuAnchor);

  useEffect(() => {
    function handleSearch(e) {
      if (e.key !== "f" || !e.ctrlKey) {
        return;
      }

      setSearchFocus(true);
    }

    window.addEventListener("keydown", handleSearch);
    return () => {
      window.removeEventListener("keydown", handleSearch);
    };
  }, []);

  useEffect(() => {
    const discovery = window.instantsDiscovery;

    if (!discovery || typeof discovery.onApiUrl !== "function") {
      return undefined;
    }

    const unsubscribe = discovery.onApiUrl(discovered => {
      setApiUrl(discovered);
    });

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, []);

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

  function handleSearchChange(e) {
    const value = e.target.value;

    clearTimeout(timeout.current);
    timeout.current = setTimeout(() => {
      setSearch(value);
    }, 300);
  }

  function handleMenuClick(e) {
    setMenuAnchor(e.currentTarget);
  }

  function handleMenuClose() {
    setMenuAnchor(null);
  }

  function buildThemeIcon() {
    return themeName === "light" ? (
      <IconButton
        edge="end"
        color="inherit"
        onClick={() => setThemeName("dark")}
        size="large">
        <DarkIcon />
      </IconButton>
    ) : (
      <IconButton
        edge="end"
        color="inherit"
        onClick={() => setThemeName("light")}
        size="large">
        <LightIcon />
      </IconButton>
    );
  }

  function buildTabPanel() {
    return selectedTab === "favorites" ? (
      <FavoritesPanel search={search} />
    ) : (
      <MyInstantsPanel search={search} />
    );
  }

  return (
    <React.Fragment>
      <CssBaseline />
      <Box sx={{ flexGrow: 1 }}>
          <AppBar position="fixed">
            <Toolbar>
              <Typography
                variant="h6"
                noWrap
                sx={{ flexGrow: 1, display: { xs: "none", sm: "block" } }}
              >
                Discord Instants Player
              </Typography>
              <Search>
                <SearchIconWrapper>
                  <SearchIcon />
                </SearchIconWrapper>
                <SearchInput
                  placeholder="Pesquisar…"
                  focused={searchFocus}
                  inputProps={{ "aria-label": "pesquisar" }}
                  onBlur={() => setSearchFocus(false)}
                  onChange={handleSearchChange}
                />
              </Search>
              {buildThemeIcon()}
              <IconButton edge="end" color="inherit" onClick={handleMenuClick} size="large">
                <MoreIcon />
              </IconButton>
            </Toolbar>
            <Menu
              anchorEl={menuAnchor}
              open={menuOpen}
              onClose={handleMenuClose}
              keepMounted
            >
              <MenuItem onClick={() => setImportFormOpen(true)}>
                Importar
              </MenuItem>
              <MenuItem onClick={() => exportToJSON()}>Exportar</MenuItem>
            </Menu>
            <Tabs
              value={selectedTab}
              onChange={(_, newValue) => setSelectedTab(newValue)}
            >
              <Tab label="Favoritos" value="favorites" />
              <Tab label="MyInstants" value="myinstants" />
            </Tabs>
          </AppBar>
      </Box>
        <SnackbarContext.Provider value={{ openSnackbar, closeSnackbar }}>
          {buildTabPanel()}
        </SnackbarContext.Provider>
        <ImportForm
          open={importFormOpen}
          onClose={() => setImportFormOpen(false)}
        />
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
