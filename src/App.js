import React, { useState, useEffect } from "react";

import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";
import CssBaseline from "@material-ui/core/CssBaseline";
import Snackbar from "@material-ui/core/Snackbar";
import IconButton from "@material-ui/core/IconButton";
import CloseIcon from "@material-ui/icons/Close";
import SearchIcon from "@material-ui/icons/Search";
import MoreIcon from "@material-ui/icons/MoreVert";
import LightIcon from "@material-ui/icons/Brightness7";
import DarkIcon from "@material-ui/icons/Brightness4";
import { fade, makeStyles, ThemeProvider } from "@material-ui/core/styles";
import Menu from "@material-ui/core/Menu";
import MenuItem from "@material-ui/core/MenuItem";
import Tabs from "@material-ui/core/Tabs";
import Tab from "@material-ui/core/Tab";

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
    backgroundColor: fade(theme.palette.common.white, 0.15),
    "&:hover": {
      backgroundColor: fade(theme.palette.common.white, 0.25)
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
    paddingLeft: `calc(1em + ${theme.spacing(4)}px)`,
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

function App() {
  const classes = useStyles();

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
  const [themeName, setThemeName] = useTheme("light");

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
    setSearch(e.target.value);
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
      >
        <DarkIcon />
      </IconButton>
    ) : (
      <IconButton
        edge="end"
        color="inherit"
        onClick={() => setThemeName("light")}
      >
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
    <ThemeProvider theme={themeName === "light" ? lightTheme : darkTheme}>
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
            <IconButton edge="end" color="inherit" onClick={handleMenuClick}>
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
    </ThemeProvider>
  );
}

export default App;
