import React from "react";

import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import CheckIcon from "@mui/icons-material/Check";
import DnsIcon from "@mui/icons-material/Dns";
import RefreshIcon from "@mui/icons-material/Refresh";

export function formatApiUrl(url) {
  return String(url || "").replace(/^https?:\/\//, "");
}

function describe(server) {
  if (!server.hostname) {
    return server.isLocal ? "Este computador" : "";
  }

  return server.isLocal
    ? `${server.hostname} · este computador`
    : server.hostname;
}

function ServerMenu(props) {
  const {
    servers,
    currentApiUrl,
    healthy,
    anchorRef,
    open,
    onOpen,
    onClose,
    onSelect,
    onRefresh
  } = props;

  const title = healthy ? "Servidor" : "O servidor não está respondendo";

  return (
    <React.Fragment>
      <Tooltip title={title}>
        <IconButton
          ref={anchorRef}
          color="inherit"
          onClick={onOpen}
          size="large"
          aria-label={title}
        >
          <Badge variant="dot" color="error" invisible={healthy}>
            <DnsIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorRef.current}
        open={open}
        onClose={onClose}
        keepMounted
        slotProps={{ paper: { sx: { minWidth: 336 } } }}
      >
        <Box sx={{ padding: "6px 16px 10px" }}>
          <Typography variant="body2" color="text.secondary" component="span">
            Falando agora com{" "}
          </Typography>
          <Typography
            variant="body2"
            component="span"
            sx={{ fontWeight: 500 }}
          >
            {formatApiUrl(currentApiUrl)}
          </Typography>
        </Box>

        <Divider />

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{
            display: "block",
            padding: "10px 16px 4px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontWeight: 500
          }}
        >
          {`Encontrados na rede · ${servers.length}`}
        </Typography>

        {servers.length === 0 && (
          <MenuItem disabled>
            <ListItemText
              primary="Nenhum servidor encontrado"
              secondary="A busca é bloqueada em muitas redes"
            />
          </MenuItem>
        )}

        {servers.map(server => (
          <MenuItem
            key={server.id}
            selected={server.apiUrl === currentApiUrl}
            onClick={() => onSelect(server)}
          >
            <ListItemIcon>
              {server.apiUrl === currentApiUrl && <CheckIcon color="primary" />}
            </ListItemIcon>
            <ListItemText
              primary={formatApiUrl(server.apiUrl)}
              secondary={describe(server)}
            />
          </MenuItem>
        ))}

        <Divider />

        <MenuItem onClick={onRefresh}>
          <ListItemIcon>
            <RefreshIcon />
          </ListItemIcon>
          <ListItemText primary="Procurar novamente" />
        </MenuItem>
      </Menu>
    </React.Fragment>
  );
}

export default ServerMenu;
