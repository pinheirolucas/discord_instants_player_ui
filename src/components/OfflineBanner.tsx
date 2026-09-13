import { useTranslation } from "react-i18next";
import "./states.css";

export interface OfflineBannerProps {
  address: string;
  onSwitch: () => void;
}

export function OfflineBanner({ address, onSwitch }: OfflineBannerProps) {
  const { t } = useTranslation();

  return (
    <div className="banner" role="status">
      <span>
        <b>{t("server.unresponsive", { address })}</b>
        <span>{t("offline.hint")}</span>
      </span>
      <button type="button" className="bb" onClick={onSwitch}>
        {t("common.switch")}
      </button>
    </div>
  );
}
