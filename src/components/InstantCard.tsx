import { useId } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { SendIcon, StopIcon } from "../icons";
import { slotFor } from "../lib/slot";
import { wavePath } from "../lib/wave";
import type { Instant } from "../storage";
import "./card.css";

/** What this card is doing right now. */
export type Playback = "idle" | "local" | "discord";

export interface CardAction {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  /** Set for a toggle (the favourite star), so its state is announced. */
  pressed?: boolean;
}

export interface InstantCardProps {
  instant: Instant;
  playback: Playback;
  /** Some other card in the same panel is playing. */
  otherPlaying: boolean;
  onPlay: (instant: Instant) => void;
  onPlayOnDiscord: (instant: Instant) => void;
  onStop: () => void;
  /** The panel's own action: remove in Favoritos, favourite in MyInstants. */
  trail: CardAction;
}

/**
 * The whole footer state matrix, in one place. Ported from the design
 * canvas's prototype logic. The two playback paths are mutually exclusive:
 *
 *   - the body plays locally. It is inert while anything else plays and
 *     while this card plays on Discord, but stays live to replay a clip
 *     already playing locally here;
 *   - send-to-Discord mirrors it;
 *   - stop exists only on the card that is playing;
 *   - a playing card locks its own trailing action.
 */
export function cardState(playback: Playback, otherPlaying: boolean) {
  const live = playback !== "idle";
  const busy = live || otherPlaying;

  return {
    live,
    dim: otherPlaying && !live,
    playDisabled: busy && playback !== "local",
    discordDisabled: busy && playback !== "discord",
    stopDisabled: !live,
    trailDisabled: live
  };
}

export default function InstantCard({
  instant,
  playback,
  otherPlaying,
  onPlay,
  onPlayOnDiscord,
  onStop,
  trail
}: InstantCardProps) {
  const { t } = useTranslation();
  const headingId = useId();
  const state = cardState(playback, otherPlaying);

  return (
    <article
      className={`pad ${slotFor(instant.url)}`}
      aria-labelledby={headingId}
      data-live={state.live}
      data-dim={state.dim}
      data-inert={state.playDisabled}
    >
      {state.live && (
        <span className="chip">
          {playback === "discord" ? t("card.playingDiscord") : t("card.playingLocal")}
        </span>
      )}

      <h3 className="pname" id={headingId}>
        <button
          type="button"
          className="phit"
          title={t("card.play")}
          disabled={state.playDisabled}
          onClick={() => onPlay(instant)}
        >
          {instant.name}
        </button>
      </h3>

      <svg
        className="pwave"
        viewBox="0 0 250 26"
        preserveAspectRatio="none"
        fill="none"
        stroke="currentColor"
        strokeWidth={3.4}
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d={wavePath(instant.name)} />
      </svg>

      <div className="pfoot">
        <button
          type="button"
          className="pb"
          aria-label={t("card.sendToDiscord")}
          title={t("card.sendToDiscord")}
          disabled={state.discordDisabled}
          onClick={() => onPlayOnDiscord(instant)}
        >
          <SendIcon />
        </button>
        <button
          type="button"
          className="pb"
          aria-label={t("card.stop")}
          title={t("card.stop")}
          disabled={state.stopDisabled}
          onClick={onStop}
        >
          <StopIcon />
        </button>
        <button
          type="button"
          className="pb trail"
          aria-label={trail.label}
          title={trail.label}
          aria-pressed={trail.pressed}
          disabled={state.trailDisabled}
          onClick={trail.onClick}
        >
          {trail.icon}
        </button>
      </div>
    </article>
  );
}
