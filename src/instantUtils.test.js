import { describe, it, expect } from "vitest";

import { getUrls } from "./instantUtils";

describe("getUrls", () => {
  it("pulls the url out of every instant, in order", () => {
    const instants = [
      { name: "Primeiro", url: "https://www.myinstants.com/a/" },
      { name: "Segundo", url: "https://www.myinstants.com/b/" }
    ];

    expect(getUrls(instants)).toEqual([
      "https://www.myinstants.com/a/",
      "https://www.myinstants.com/b/"
    ]);
  });

  it("returns an empty list for an empty list", () => {
    expect(getUrls([])).toEqual([]);
  });

  it("does not mutate or alias the list it is given", () => {
    const instants = [{ name: "Primeiro", url: "https://a/" }];

    const urls = getUrls(instants);

    expect(urls).not.toBe(instants);
    expect(instants).toEqual([{ name: "Primeiro", url: "https://a/" }]);
  });

  // ImportForm feeds getUrls straight from a user-supplied JSON file, so
  // entries without a url are reachable in practice. R.prop yields undefined
  // rather than throwing; R.difference then treats those holes as one value.
  // Documenting that, not endorsing it.
  it("yields undefined for entries that have no url", () => {
    expect(getUrls([{ name: "Sem link" }, { url: "https://b/" }])).toEqual([
      undefined,
      "https://b/"
    ]);
  });
});
