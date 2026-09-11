import type { Server } from "../electron/discovery";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "./components/Menu";
import { ServerChip } from "./components/ServerChip";
import { CheckIcon, RefreshIcon } from "./icons";

export function formatApiUrl(url: string): string {
  return String(url || "").replace(/^https?:\/\//, "");
}

function describe(server: Server): string {
  if (!server.hostname) {
    return server.isLocal ? "Este computador" : "";
  }

  return server.isLocal ? `${server.hostname} · este computador` : server.hostname;
}

export interface ServerMenuProps {
  servers: Server[];
  currentApiUrl: string;
  healthy: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (server: Server) => void;
  onRefresh: () => void;
}

/**
 * The picker. The current address sits in the menu's own header rather than
 * as a list row, because the current target need not be in the list at all:
 * the app starts on localhost:9001, which is never discovered, and a server
 * that dies leaves the list while still being the one in use. One click
 * switches — no confirm step, since switching is cheap and reversible.
 */
export default function ServerMenu({
  servers,
  currentApiUrl,
  healthy,
  open,
  onOpenChange,
  onSelect,
  onRefresh
}: ServerMenuProps) {
  const current = formatApiUrl(currentApiUrl);

  return (
    <Menu
      open={open}
      onOpenChange={onOpenChange}
      trigger={<ServerChip address={current} healthy={healthy} />}
    >
      <div className="mhead">
        Falando agora com <b>{current}</b>
      </div>
      <MenuSeparator />
      <MenuLabel>{`Encontrados na rede · ${servers.length}`}</MenuLabel>

      {servers.length === 0 && (
        <MenuItem
          disabled
          primary="Nenhum servidor encontrado"
          secondary="A busca é bloqueada em muitas redes"
        />
      )}

      {servers.map((server) => (
        <MenuItem
          key={server.id}
          tick={server.apiUrl === currentApiUrl ? <CheckIcon /> : null}
          primary={formatApiUrl(server.apiUrl)}
          secondary={describe(server) || undefined}
          onSelect={() => onSelect(server)}
        />
      ))}

      <MenuSeparator />
      <MenuItem tick={<RefreshIcon />} primary="Procurar novamente" onSelect={onRefresh} />
    </Menu>
  );
}
