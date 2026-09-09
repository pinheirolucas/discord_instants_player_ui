import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

import {
  playOnDiscord,
  stopPlayingOnDiscord,
  getContent,
  getMyInstants,
  getApiUrl,
  setApiUrl,
  resetApiUrl,
  defaultApiUrl
} from "./service";

// Mocking at the request level rather than stubbing axios keeps these tests
// honest about the two things that actually bite here: the exact query strings
// service.js builds, and the response envelope the Go backend really sends.
const apiUrl = "http://localhost:9001";

const server = setupServer();

// Every response goes through the backend's `response` struct:
// {label, message, data}, with empty fields omitted.
function success(data) {
  return HttpResponse.json({ data });
}

// pkg/server/server.go#writeErrorMessage builds the body but never calls
// WriteHeader, so the backend answers almost every *error* with HTTP 200 and a
// body carrying only {label, message}. That is not a hypothetical: it is what
// /bot/play and /instant/list do for an unknown instant, a bad URL, and an
// unsupported audio format.
function errorAt200(label, message) {
  return HttpResponse.json({ label, message });
}

// The one genuine non-200 the backend can produce is the http.Error fallback
// when encoding the body itself fails; a dead or misbehaving proxy in front of
// it would do the same. This is the only shape axios rejects on.
function errorAtStatus(status, body) {
  return HttpResponse.json(body, { status });
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  server.resetHandlers();
  resetApiUrl();
});
afterAll(() => server.close());

describe("playOnDiscord", () => {
  it("posts the url and returns the exit reason", async () => {
    let body;
    server.use(
      http.post(`${apiUrl}/bot/play`, async ({ request }) => {
        body = await request.json();
        return success({ exitReason: "end" });
      })
    );

    await expect(playOnDiscord("https://www.myinstants.com/a/")).resolves.toBe(
      "end"
    );
    expect(body).toEqual({ url: "https://www.myinstants.com/a/" });
  });

  it("surfaces the backend message when the response really is an error status", async () => {
    server.use(
      http.post(`${apiUrl}/bot/play`, () =>
        errorAtStatus(400, {
          label: "instant_not_found",
          message: "O instant enviado não foi encontrado"
        })
      )
    );

    await expect(playOnDiscord("https://www.myinstants.com/a/")).rejects.toThrow(
      "O instant enviado não foi encontrado"
    );
  });

  it("falls back to the generic message when the error body carries none", async () => {
    server.use(
      http.post(`${apiUrl}/bot/play`, () => errorAtStatus(500, { label: "boom" }))
    );

    await expect(playOnDiscord("https://www.myinstants.com/a/")).rejects.toThrow(
      "Erro desconhecido, tente novamente mais tarde"
    );
  });

  it("falls back to the generic message when there is no response at all", async () => {
    server.use(http.post(`${apiUrl}/bot/play`, () => HttpResponse.error()));

    await expect(playOnDiscord("https://www.myinstants.com/a/")).rejects.toThrow(
      "Erro desconhecido, tente novamente mais tarde"
    );
  });

  // Pre-existing bug, asserted as current behaviour rather than fixed. Because
  // the backend sends its errors with HTTP 200, axios does not reject; the
  // success path runs, `response.data.data` is undefined, and reading
  // `.exitReason` off it throws a TypeError that lands in the same catch. That
  // catch sees no `err.response`, so it discards the real message.
  //
  // Net effect: every ordinary /bot/play failure reaches the user as the
  // generic "Erro desconhecido" snackbar instead of "O instant enviado não foi
  // encontrado". The specific message the backend went to the trouble of
  // writing is never displayed.
  it("swallows the backend message when the error arrives with HTTP 200", async () => {
    server.use(
      http.post(`${apiUrl}/bot/play`, () =>
        errorAt200("instant_not_found", "O instant enviado não foi encontrado")
      )
    );

    await expect(playOnDiscord("https://www.myinstants.com/a/")).rejects.toThrow(
      "Erro desconhecido, tente novamente mais tarde"
    );
  });
});

describe("stopPlayingOnDiscord", () => {
  it("posts to /bot/stop and resolves with the raw axios response", async () => {
    let seen = 0;
    server.use(
      http.post(`${apiUrl}/bot/stop`, () => {
        seen += 1;
        // handleBotStop writes nothing at all — no body, no content type.
        return new HttpResponse(null, { status: 200 });
      })
    );

    const response = await stopPlayingOnDiscord();

    expect(seen).toBe(1);
    expect(response.status).toBe(200);
    expect(response.config.method).toBe("post");
  });

  // Unlike playOnDiscord this one has no catch, so a failure escapes as the raw
  // axios error. useDiscordPlayer#stop awaits it without a catch either, so a
  // rejection here becomes an unhandled rejection rather than a snackbar.
  it("rejects with the raw axios error, unwrapped", async () => {
    server.use(
      http.post(`${apiUrl}/bot/stop`, () => errorAtStatus(500, { label: "boom" }))
    );

    await expect(stopPlayingOnDiscord()).rejects.toMatchObject({
      response: { status: 500 }
    });
  });
});

describe("getContent", () => {
  it("unwraps data.data into the playable info", async () => {
    server.use(
      http.get(`${apiUrl}/play`, () =>
        success({ exists: true, content: "data:audio/mp3;base64,AAAA" })
      )
    );

    await expect(getContent("https://www.myinstants.com/a/")).resolves.toEqual({
      exists: true,
      content: "data:audio/mp3;base64,AAAA"
    });
  });

  it("passes the instant url through as the url query parameter", async () => {
    let received;
    server.use(
      http.get(`${apiUrl}/play`, ({ request }) => {
        received = new URL(request.url).searchParams.get("url");
        return success({ exists: true, content: "" });
      })
    );

    await getContent("https://www.myinstants.com/en/instant-abc/");

    expect(received).toBe("https://www.myinstants.com/en/instant-abc/");
  });

  // Pre-existing sharp edge, asserted as-is: the url is interpolated into the
  // query string without encodeURIComponent. myinstants URLs are plain enough
  // that this works today, but anything containing & or # would be truncated or
  // split into extra parameters. A favourite imported from a JSON file is
  // arbitrary user input, so it is reachable.
  it("does not percent-encode the url it interpolates", async () => {
    let rawQuery;
    let received;
    server.use(
      http.get(`${apiUrl}/play`, ({ request }) => {
        const parsed = new URL(request.url);
        rawQuery = parsed.search;
        received = parsed.searchParams.get("url");
        return success({ exists: false });
      })
    );

    await getContent("https://x/a?b=1&c=2");

    expect(rawQuery).toBe("?url=https://x/a?b=1&c=2");
    expect(received).toBe("https://x/a?b=1");
  });

  // Same HTTP-200-error problem as playOnDiscord, with a different outcome:
  // getContent has no error handling at all, so it quietly resolves to
  // undefined. Both panels then do `info.exists` on it and blow up with a
  // TypeError inside an unawaited handler, so the user sees nothing happen.
  it("resolves to undefined when the error arrives with HTTP 200", async () => {
    server.use(
      http.get(`${apiUrl}/play`, () => errorAt200("empty_url", "Nenhuma URL enviada"))
    );

    await expect(getContent("https://www.myinstants.com/a/")).resolves.toBeUndefined();
  });

  it("rejects with the raw axios error on a real error status", async () => {
    server.use(
      http.get(`${apiUrl}/play`, () => errorAtStatus(500, { label: "unknown_error" }))
    );

    await expect(getContent("https://www.myinstants.com/a/")).rejects.toMatchObject({
      response: { status: 500 }
    });
  });
});

describe("getMyInstants", () => {
  const listing = {
    instants: [
      { name: "Primeiro", url: "https://www.myinstants.com/a/" },
      { name: "Segundo", url: "https://www.myinstants.com/b/" }
    ],
    pages: 3
  };

  function captureQuery(respond = () => success(listing)) {
    const captured = {};
    server.use(
      http.get(`${apiUrl}/instant/list`, ({ request }) => {
        captured.search = new URL(request.url).search;
        return respond();
      })
    );
    return captured;
  }

  it("unwraps data.data into the instants and page count", async () => {
    captureQuery();

    await expect(getMyInstants(1)).resolves.toEqual(listing);
  });

  it("sends page and search together", async () => {
    const captured = captureQuery();

    await getMyInstants(2, "boo");

    expect(captured.search).toBe("?page=2&search=boo");
  });

  it("omits search entirely when it is empty", async () => {
    const captured = captureQuery();

    await getMyInstants(2, "");

    expect(captured.search).toBe("?page=2");
  });

  // Pre-existing quirk, asserted as current behaviour rather than fixed. The
  // `page || 1` default is only used to decide *whether* to append the
  // parameter; the parameter itself is built from the raw `page`, so with no
  // argument the request literally reads ?page=undefined. The Go handler parses
  // that with strconv.Atoi, fails, and falls back to page 1, which is why
  // nobody has noticed. No caller in this app hits it — both panels always pass
  // a page — but it is one refactor away from mattering.
  it("sends page=undefined when called with no page", async () => {
    const captured = captureQuery();

    await getMyInstants();

    expect(captured.search).toBe("?page=undefined");
  });

  // Same missing encodeURIComponent as getContent, and here it is trivially
  // reachable: the search box in the AppBar feeds this directly. The URL layer
  // rescues a literal space (it normalises to %20), but it has no reason to
  // touch an ampersand, so "a b&c" is sent as a search of "a b" plus a stray
  // parameter "c". Asserted as current behaviour, not fixed.
  it("does not percent-encode the search term, so an ampersand splits it", async () => {
    const captured = captureQuery();

    await getMyInstants(1, "a b&c");

    expect(captured.search).toBe("?page=1&search=a%20b&c");
    const params = new URLSearchParams(captured.search);
    expect(params.get("search")).toBe("a b");
    expect(params.has("c")).toBe(true);
  });

  it("throws the backend message on a real error status", async () => {
    server.use(
      http.get(`${apiUrl}/instant/list`, () =>
        errorAtStatus(400, {
          label: "invalid_page",
          message: "A página enviada é inválida"
        })
      )
    );

    await expect(getMyInstants(1)).rejects.toThrow("A página enviada é inválida");
  });

  it("falls back to the generic message when the error body carries none", async () => {
    server.use(
      http.get(`${apiUrl}/instant/list`, () => errorAtStatus(500, {}))
    );

    await expect(getMyInstants(1)).rejects.toThrow(
      "Erro desconhecido, tente novamente mais tarde"
    );
  });

  // Third instance of the HTTP-200-error problem. The catch is chained after
  // the unwrapping then(), so it would catch a throw — but nothing throws:
  // resp.data.data is simply undefined and gets returned. MyInstantsPanel's
  // success handler then reads `data.instants` off undefined, which *does*
  // throw, inside the promise chain, so the user gets a snackbar reading
  // "Cannot read properties of undefined (reading 'instants')" instead of the
  // backend's message.
  it("resolves to undefined when the error arrives with HTTP 200", async () => {
    server.use(
      http.get(`${apiUrl}/instant/list`, () =>
        errorAt200("invalid_page", "A página enviada é inválida")
      )
    );

    await expect(getMyInstants(1)).resolves.toBeUndefined();
  });
});

describe("api base url", () => {
  const discovered = "http://10.0.0.133:9001";

  it("starts at localhost:9001", () => {
    expect(defaultApiUrl).toBe("http://localhost:9001");
    expect(getApiUrl()).toBe(defaultApiUrl);
  });

  it("keeps talking to localhost when no bridge exposes a discovered address", async () => {
    expect(window.instantsDiscovery).toBeUndefined();

    let hit = false;
    server.use(
      http.get(`${apiUrl}/instant/list`, () => {
        hit = true;
        return success({ instants: [], pages: 0 });
      })
    );

    await getMyInstants(1);

    expect(hit).toBe(true);
    expect(getApiUrl()).toBe(defaultApiUrl);
  });

  it("sends every subsequent request to an adopted address", async () => {
    expect(setApiUrl(discovered)).toBe(true);
    expect(getApiUrl()).toBe(discovered);

    const seen = [];
    server.use(
      http.post(`${discovered}/bot/play`, ({ request }) => {
        seen.push(new URL(request.url).origin);
        return success({ exitReason: "end" });
      }),
      http.post(`${discovered}/bot/stop`, ({ request }) => {
        seen.push(new URL(request.url).origin);
        return new HttpResponse(null, { status: 200 });
      }),
      http.get(`${discovered}/play`, ({ request }) => {
        seen.push(new URL(request.url).origin);
        return success({ exists: true, content: "" });
      }),
      http.get(`${discovered}/instant/list`, ({ request }) => {
        seen.push(new URL(request.url).origin);
        return success({ instants: [], pages: 0 });
      })
    );

    await playOnDiscord("https://www.myinstants.com/a/");
    await stopPlayingOnDiscord();
    await getContent("https://www.myinstants.com/a/");
    await getMyInstants(1);

    expect(seen).toEqual([discovered, discovered, discovered, discovered]);
  });

  it("restores the default when the address is reset", async () => {
    setApiUrl(discovered);
    resetApiUrl();

    expect(getApiUrl()).toBe(defaultApiUrl);

    let hit = false;
    server.use(
      http.get(`${apiUrl}/instant/list`, () => {
        hit = true;
        return success({ instants: [], pages: 0 });
      })
    );

    await getMyInstants(1);

    expect(hit).toBe(true);
  });

  it("strips a trailing slash so paths are not doubled", async () => {
    expect(setApiUrl("http://10.0.0.133:9001/")).toBe(true);
    expect(getApiUrl()).toBe(discovered);

    let path;
    server.use(
      http.post(`${discovered}/bot/stop`, ({ request }) => {
        path = new URL(request.url).pathname;
        return new HttpResponse(null, { status: 200 });
      })
    );

    await stopPlayingOnDiscord();

    expect(path).toBe("/bot/stop");
  });

  it("keeps a base path announced by the service", async () => {
    expect(setApiUrl("http://10.0.0.133:9001/api/")).toBe(true);
    expect(getApiUrl()).toBe("http://10.0.0.133:9001/api");

    let path;
    server.use(
      http.post(`${discovered}/api/bot/stop`, ({ request }) => {
        path = new URL(request.url).pathname;
        return new HttpResponse(null, { status: 200 });
      })
    );

    await stopPlayingOnDiscord();

    expect(path).toBe("/api/bot/stop");
  });

  it("accepts an ipv6 address in brackets and https", () => {
    expect(setApiUrl("http://[2001:db8::42]:9001")).toBe(true);
    expect(getApiUrl()).toBe("http://[2001:db8::42]:9001");

    expect(setApiUrl("https://instants.lan:9001")).toBe(true);
    expect(getApiUrl()).toBe("https://instants.lan:9001");
  });

  it.each([
    ["an empty string", ""],
    ["blank space", "   "],
    ["a bare host and port", "10.0.0.133:9001"],
    ["a schemeless host", "localhost:9001"],
    ["a word", "not a url"],
    ["an unusable scheme", "ftp://10.0.0.133:9001"],
    ["a file url", "file:///etc/passwd"],
    ["a scheme with no host", "http://"],
    ["a query string", "http://10.0.0.133:9001?x=1"],
    ["a fragment", "http://10.0.0.133:9001/#x"],
    ["null", null],
    ["undefined", undefined],
    ["a number", 9001],
    ["an object", {}]
  ])("ignores %s instead of adopting it", (_label, value) => {
    expect(setApiUrl(value)).toBe(false);
    expect(getApiUrl()).toBe(defaultApiUrl);
  });

  it("does not lose a good address to a malformed one that arrives later", async () => {
    setApiUrl(discovered);

    expect(setApiUrl("nonsense")).toBe(false);
    expect(getApiUrl()).toBe(discovered);

    let hit = false;
    server.use(
      http.get(`${discovered}/instant/list`, () => {
        hit = true;
        return success({ instants: [], pages: 0 });
      })
    );

    await getMyInstants(1);

    expect(hit).toBe(true);
  });
});
