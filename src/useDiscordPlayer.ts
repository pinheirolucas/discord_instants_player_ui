import { useState } from "react";
import { playOnDiscord, stopPlayingOnDiscord } from "./service";

export type DiscordPlayer = [
  url: string,
  isPlaying: boolean,
  play: (url: string) => Promise<Error | undefined>,
  stop: () => Promise<unknown>
];

export default function useDiscordPlayer(): DiscordPlayer {
  const [url, setUrl] = useState("");
  const isPlaying = Boolean(url);

  async function stop() {
    setUrl("");
    return stopPlayingOnDiscord();
  }

  async function play(nextUrl: string): Promise<Error | undefined> {
    if (isPlaying) {
      await stop();
    }

    setUrl(nextUrl);
    try {
      // /bot/play blocks server-side until the clip ends or is stopped.
      const exitReason = await playOnDiscord(nextUrl);
      switch (exitReason) {
        case "end":
          setUrl("");
          return undefined;
        default:
          return undefined;
      }
    } catch (err) {
      return err as Error;
    }
  }

  return [url, isPlaying, play, stop];
}
