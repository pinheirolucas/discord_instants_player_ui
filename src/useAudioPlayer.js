import { useState, useRef, useEffect } from "react";

export default function useAudioPlayer() {
  const playerRef = useRef(new Audio());
  const [src, setSrc] = useState("");
  const [url, setUrl] = useState("");
  const isPlaying = Boolean(src);

  useEffect(() => {
    function handleEnd() {
      setSrc("");
      setUrl("");
    }

    const player = playerRef.current;

    player.addEventListener("ended", handleEnd);
    return () => {
      player.removeEventListener("ended", handleEnd);
    };
  }, []);

  function stop() {
    playerRef.current.pause();
    playerRef.current.currentTime = 0;
    playerRef.current.src = "";
    setSrc("");
    setUrl("");
  }

  function play(url, src) {
    if (isPlaying) {
      stop();
    }

    setSrc(src);
    setUrl(url);
    playerRef.current.src = src;
    playerRef.current.play();
  }

  return [url, isPlaying, play, stop];
}
