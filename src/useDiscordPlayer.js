import { useState } from "react";
import { playOnDiscord, stopPlayingOnDiscord } from "./service";

export default function useDiscordPlayer() {
  const [url, setUrl] = useState("");
  const isPlaying = Boolean(url);

  async function stop() {
    setUrl("");
    return stopPlayingOnDiscord();
  }

  async function play(url) {
    if (isPlaying) {
      await stop();
    }

    setUrl(url);
    try {
      const exitReason = await playOnDiscord(url);
      switch (exitReason) {
        case "end":
          setUrl("");
          break;
        default:
          return "";
      }
    } catch (err) {
      return err.message;
    }
  }

  return [url, isPlaying, play, stop];
}
