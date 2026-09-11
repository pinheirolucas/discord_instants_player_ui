import * as R from "ramda";

/** Dumps every localStorage key, JSON-decoded, to a downloaded file — the
 *  only backup this app has. ImportForm reads it back. */
export function exportToJSON(): void {
  const storagePairs = R.toPairs(localStorage as unknown as Record<string, string>);
  console.log(storagePairs);

  const rawData = R.fromPairs(
    storagePairs.map(([key, value]): [string, unknown] => [key, JSON.parse(value)])
  );
  console.log(rawData);

  const data = JSON.stringify(rawData, null, 2);

  const file = "data:application/json;charset=utf-8," + encodeURIComponent(data);

  const anchor = document.createElement("a");
  anchor.setAttribute("href", file);
  anchor.setAttribute("download", "discord-instants-player-config.json");
  anchor.click();
}
