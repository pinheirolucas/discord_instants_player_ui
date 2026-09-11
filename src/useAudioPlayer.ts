import { useEffect, useRef, useState } from "react";

export type AudioPlayer = [
  url: string,
  isPlaying: boolean,
  play: (url: string, src: string) => void,
  stop: () => void
];

export default function useAudioPlayer(): AudioPlayer {
  // Lazily, so a render does not allocate an element it immediately drops.
  const playerRef = useRef<HTMLAudioElement | null>(null);
  if (!playerRef.current) {
    playerRef.current = new Audio();
  }

  const [src, setSrc] = useState("");
  const [url, setUrl] = useState("");
  const isPlaying = Boolean(src);

  useEffect(() => {
    function handleEnd() {
      setSrc("");
      setUrl("");
    }

    const player = playerRef.current!;

    player.addEventListener("ended", handleEnd);
    return () => {
      player.removeEventListener("ended", handleEnd);
    };
  }, []);

  function stop() {
    const player = playerRef.current!;
    player.pause();
    player.currentTime = 0;
    player.src = "";
    setSrc("");
    setUrl("");
  }

  function play(nextUrl: string, nextSrc: string) {
    if (isPlaying) {
      stop();
    }

    const player = playerRef.current!;
    setSrc(nextSrc);
    setUrl(nextUrl);
    player.src = nextSrc;
    player.play();
  }

  return [url, isPlaying, play, stop];
}
