import { useState, useRef, useEffect } from "react";

export default function useAudioPlayer() {
  const player = useRef(new Audio());
  const [src, setSrc] = useState("");
  const [url, setUrl] = useState("");
  const isPlaying = Boolean(src);

  useEffect(() => {
    function handleEnd() {
      setSrc("");
      setUrl("");
    }

    player.current.addEventListener("ended", handleEnd);
    return () => {
      player.current.removeEventListener("ended", handleEnd);
    };
  }, []);

  function stop() {
    player.current.pause();
    player.current.currentTime = 0;
    player.current.src = "";
    setSrc("");
    setUrl("");
  }

  function play(url, src) {
    if (isPlaying) {
      stop();
    }

    setSrc(src);
    setUrl(url);
    player.current.src = src;
    player.current.play();
  }

  return [url, isPlaying, play, stop];
}
