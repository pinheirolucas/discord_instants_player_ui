import "./states.css";

export interface OfflineBannerProps {
  address: string;
  onSwitch: () => void;
}

export function OfflineBanner({ address, onSwitch }: OfflineBannerProps) {
  return (
    <div className="banner" role="status">
      <span>
        <b>{address} não está respondendo</b>
        <span>Seus favoritos continuam aqui, mas nada toca até o bot voltar.</span>
      </span>
      <button type="button" className="bb" onClick={onSwitch}>
        Trocar
      </button>
    </div>
  );
}
