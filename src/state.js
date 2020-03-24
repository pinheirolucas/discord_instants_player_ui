import * as R from "ramda";

export function exportToJSON() {
  const storagePairs = R.toPairs(localStorage);
  console.log(storagePairs);

  const rawData = R.fromPairs(
    storagePairs.map(([key, value]) => [key, JSON.parse(value)])
  );
  console.log(rawData);

  const data = JSON.stringify(rawData, null, 2);

  // const data = JSON.stringify(localStorage);
  const file =
    "data:application/json;charset=utf-8," + encodeURIComponent(data);

  const anchor = document.createElement("a");
  anchor.setAttribute("href", file);
  anchor.setAttribute("download", "discord-instants-player-config.json");
  anchor.click();
}
