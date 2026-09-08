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
import { alpha, ThemeProvider, StyledEngineProvider } from "@mui/material/styles";
import makeStyles from '@mui/styles/makeStyles';
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";

import FocusableInput from "./FocusableInput";
import FavoritesPanel from "./FavoritesPanel";
import MyInstantsPanel from "./MyInstantsPanel";
import SnackbarContext from "./SnackbarContext";
import ImportForm from "./ImportForm";
import { exportToJSON } from "./state";
import { useTheme } from "./storage";
import { darkTheme, lightTheme } from "./theme";

import "./App.css";

const defaultOnSnackbarClose = () => {};
const defaultSnackAutoHideDuration = 6000;
const defaultSnackAction = <React.Fragment />;

const useStyles = makeStyles(theme => ({
  root: {
    flexGrow: 1
  },
  title: {
    flexGrow: 1,
    display: "none",
    [theme.breakpoints.up("sm")]: {
      display: "block"
    }
  },
  search: {
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
  },
  searchIcon: {
    padding: theme.spacing(0, 2),
    height: "100%",
    position: "absolute",
    pointerEvents: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  inputRoot: {
    color: "inherit"
  },
  inputInput: {
    padding: theme.spacing(1, 1, 1, 0),
    // vertical padding + font size from searchIcon
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

// The providers have to sit above whatever calls useStyles: @mui/styles resolves
// makeStyles against its own default theme, which in v5 is empty, so a component
// that renders ThemeProvider in its own return value would style itself against
// a theme with no palette/spacing/breakpoints and crash on theme.breakpoints.up.
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
  const classes = useStyles();

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
        <div className={classes.root}>
          <AppBar position="fixed">
            <Toolbar>
              <Typography className={classes.title} variant="h6" noWrap>
                Discord Instants Player
              </Typography>
              <div className={classes.search}>
                <div className={classes.searchIcon}>
                  <SearchIcon />
                </div>
                <FocusableInput
                  placeholder="Pesquisar…"
                  focused={searchFocus}
                  classes={{
                    root: classes.inputRoot,
                    input: classes.inputInput
                  }}
                  inputProps={{ "aria-label": "pesquisar" }}
                  onBlur={() => setSearchFocus(false)}
                  onChange={handleSearchChange}
                />
              </div>
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
        </div>
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
