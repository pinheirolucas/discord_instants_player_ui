export default function play(url) {
  return new Promise((resolve, reject) => {
    try {
      const instant = new Audio(url);
      instant.addEventListener("ended", resolve);
      instant.play();
    } catch (err) {
      reject(err);
    }
  });
}
