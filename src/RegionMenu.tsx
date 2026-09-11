import { Menu, MenuItem, MenuLabel } from "./components/Menu";
import { CheckIcon } from "./icons";
import { REGIONS, regionLabel } from "./regions";
import type { Region } from "./regions";

// Alphabetical by the Portuguese name, so the list can be scanned.
const OPTIONS = REGIONS.map((value) => ({ value, label: regionLabel(value) })).sort((a, b) =>
  a.label.localeCompare(b.label, "pt-BR")
);

export interface RegionMenuProps {
  region: Region;
  onSelect: (region: Region) => void;
}

/**
 * Which country's catalogue MyInstants browses. The trigger is named by the
 * country it shows, like the server chip beside it, and switching is a
 * single click. The region is sent with every listing request; which
 * requests it affects is the backend's call, not this menu's.
 */
export default function RegionMenu({ region, onSelect }: RegionMenuProps) {
  return (
    <Menu
      className="menu--scroll"
      trigger={
        <button type="button" className="srv" title="Trocar a região do catálogo">
          {regionLabel(region)}
        </button>
      }
    >
      <MenuLabel>Região do catálogo</MenuLabel>
      {OPTIONS.map((option) => (
        <MenuItem
          key={option.value}
          tick={option.value === region ? <CheckIcon /> : null}
          primary={option.label}
          onSelect={() => onSelect(option.value)}
        />
      ))}
    </Menu>
  );
}
