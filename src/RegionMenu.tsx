import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Menu, MenuItem, MenuLabel } from "./components/Menu";
import { isLanguageId } from "./i18n/detect";
import { CheckIcon } from "./icons";
import { REGIONS, regionLabel } from "./regions";
import type { Region } from "./regions";

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
  const { t, i18n } = useTranslation();
  const language = isLanguageId(i18n.language) ? i18n.language : "en-US";

  const options = useMemo(
    () =>
      REGIONS.map((value) => ({ value, label: regionLabel(value, language) })).sort((a, b) =>
        a.label.localeCompare(b.label, language)
      ),
    [language]
  );

  return (
    <Menu
      className="menu--scroll"
      trigger={
        <button type="button" className="srv" title={t("region.switchTitle")}>
          {regionLabel(region, language)}
        </button>
      }
    >
      <MenuLabel>{t("region.menuLabel")}</MenuLabel>
      {options.map((option) => (
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
