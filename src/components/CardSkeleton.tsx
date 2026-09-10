import "./states.css";

/** Deterministic widths: a skeleton that reshuffles on every render reads as
 *  content loading in, not as a placeholder. */
const WIDTHS = [
  ["86%", "52%"],
  ["70%", "40%"],
  ["92%", "60%"],
  ["78%", "46%"]
];

export function CardSkeleton({ index = 0 }: { index?: number }) {
  const [wide, narrow] = WIDTHS[index % WIDTHS.length];

  return (
    <div className="skel" aria-hidden="true">
      <span className="sk" style={{ height: 18, width: wide }} />
      <span className="sk" style={{ height: 18, width: narrow }} />
      <span className="sk" style={{ height: 26, marginTop: "auto" }} />
    </div>
  );
}
