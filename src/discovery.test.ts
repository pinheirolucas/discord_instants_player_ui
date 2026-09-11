import { describe, it, expect } from "vitest";

import {
  buildApiUrl,
  buildServer,
  hostnameFromService,
  pickHost,
  sortServers
} from "../electron/discovery";
import type { Server } from "../electron/discovery";

function realService(overrides = {}) {
  return {
    name: "MacBook-Pro-de-Lucas",
    type: "local-9001",
    fqdn: "MacBook-Pro-de-Lucas.local-9001._myinstants._tcp.local",
    host: "MacBook-Pro-de-Lucas.local.local",
    port: 9001,
    addresses: [
      "fe80::1",
      "fe80::aede:48ff:fe00:1122",
      "10.0.0.133",
      "fe80::cafe"
    ],
    txt: { path: "/", api: "1" },
    ...overrides
  };
}

describe("buildApiUrl", () => {
  it("builds the base url from the ipv4 address and the port", () => {
    expect(buildApiUrl(realService())).toBe("http://10.0.0.133:9001");
  });

  it("never uses the mangled host field", () => {
    const url = buildApiUrl(realService());

    expect(url).not.toContain("MacBook-Pro-de-Lucas");
    expect(url).not.toContain(".local");
  });

  it("ignores the mangled name and type fields", () => {
    const url = buildApiUrl(
      realService({ name: "", type: "local-9001", fqdn: "" })
    );

    expect(url).toBe("http://10.0.0.133:9001");
  });

  it("drops the trailing slash of the default path", () => {
    expect(buildApiUrl(realService())).not.toMatch(/\/$/);
  });

  it("keeps a non-root base path", () => {
    const service = realService({ txt: { path: "/api/", api: "1" } });

    expect(buildApiUrl(service)).toBe("http://10.0.0.133:9001/api");
  });

  it("treats a missing path as root", () => {
    const service = realService({ txt: { api: "1" } });

    expect(buildApiUrl(service)).toBe("http://10.0.0.133:9001");
  });

  it("refuses a service announcing another api version", () => {
    expect(buildApiUrl(realService({ txt: { path: "/", api: "2" } }))).toBeNull();
  });

  it("refuses a service with no api record at all", () => {
    expect(buildApiUrl(realService({ txt: { path: "/" } }))).toBeNull();
    expect(buildApiUrl(realService({ txt: undefined }))).toBeNull();
  });

  it("refuses a service with no usable port", () => {
    expect(buildApiUrl(realService({ port: 0 }))).toBeNull();
    expect(buildApiUrl(realService({ port: undefined }))).toBeNull();
  });

  it("refuses a service with no usable address", () => {
    expect(buildApiUrl(realService({ addresses: [] }))).toBeNull();
    expect(buildApiUrl(realService({ addresses: undefined }))).toBeNull();
  });

  it("refuses anything that is not a service", () => {
    expect(buildApiUrl(null)).toBeNull();
    expect(buildApiUrl(undefined)).toBeNull();
  });
});

describe("pickHost", () => {
  it("prefers a routable ipv4 over every ipv6 entry", () => {
    expect(pickHost(realService())).toBe("10.0.0.133");
  });

  it("skips ipv4 link-local addresses", () => {
    const service = realService({ addresses: ["169.254.10.1", "192.168.1.20"] });

    expect(pickHost(service)).toBe("192.168.1.20");
  });

  it("falls back to a routable ipv6 in brackets when there is no ipv4", () => {
    const service = realService({
      addresses: ["fe80::1", "2001:db8::42"]
    });

    expect(pickHost(service)).toBe("[2001:db8::42]");
  });

  it("returns nothing when every address is link-local", () => {
    const service = realService({
      addresses: ["169.254.10.1", "fe80::1", "FE80::2"]
    });

    expect(pickHost(service)).toBeNull();
  });
});

describe("hostnameFromService", () => {
  it("recovers the hostname the advertiser used, not the mangled name", () => {
    expect(hostnameFromService(realService())).toBe("MacBook-Pro-de-Lucas");
  });

  it("survives the -2 suffix macOS adds after a name collision", () => {
    const service = realService({
      name: "MacBook-Pro-de-Lucas-2",
      fqdn: "MacBook-Pro-de-Lucas-2.local-9001._myinstants._tcp.local"
    });

    expect(hostnameFromService(service)).toBe("MacBook-Pro-de-Lucas-2");
  });

  it("keeps a hostname that carries no .local suffix", () => {
    const service = realService({
      fqdn: "raspberrypi-9001._myinstants._tcp.local"
    });

    expect(hostnameFromService(service)).toBe("raspberrypi");
  });

  it("returns null when the fqdn is not one of ours", () => {
    expect(hostnameFromService(realService({ fqdn: "printer._ipp._tcp.local" })))
      .toBeNull();
    expect(hostnameFromService({})).toBeNull();
  });
});

describe("buildServer", () => {
  it("carries the address, port and hostname alongside the url", () => {
    expect(buildServer(realService(), new Set())).toEqual({
      id: "MacBook-Pro-de-Lucas.local-9001._myinstants._tcp.local",
      apiUrl: "http://10.0.0.133:9001",
      address: "10.0.0.133",
      port: 9001,
      hostname: "MacBook-Pro-de-Lucas",
      isLocal: false
    });
  });

  it("marks a server whose address belongs to this machine", () => {
    const server = buildServer(realService(), new Set(["10.0.0.133"]));

    expect(server!.isLocal).toBe(true);
  });

  it("does not mark a server on another machine", () => {
    const service = realService({ addresses: ["10.0.0.42"] });
    const server = buildServer(service, new Set(["10.0.0.133"]));

    expect(server!.isLocal).toBe(false);
  });

  it("keys distinct ports on the same host as distinct servers", () => {
    const a = buildServer(realService(), new Set());
    const b = buildServer(
      realService({
        port: 9002,
        fqdn: "MacBook-Pro-de-Lucas.local-9002._myinstants._tcp.local"
      }),
      new Set()
    );

    expect(a!.id).not.toBe(b!.id);
    expect(a!.apiUrl).not.toBe(b!.apiUrl);
  });

  it("refuses a service the api gate rejects", () => {
    expect(buildServer(realService({ txt: { api: "2" } }), new Set())).toBeNull();
  });

  it("tolerates a missing local-address set", () => {
    expect(buildServer(realService())!.isLocal).toBe(false);
  });
});

describe("sortServers", () => {
  // Only the fields the sort reads matter; id and hostname are filled in.
  const server = (fields: Pick<Server, "apiUrl" | "address" | "port" | "isLocal">): Server => ({
    id: fields.apiUrl,
    hostname: null,
    ...fields
  });

  const local9002 = server({ apiUrl: "b", address: "10.0.0.133", port: 9002, isLocal: true });
  const local9001 = server({ apiUrl: "a", address: "10.0.0.133", port: 9001, isLocal: true });
  const remote9001 = server({ apiUrl: "c", address: "10.0.0.42", port: 9001, isLocal: false });
  const remote8080 = server({ apiUrl: "d", address: "10.0.0.87", port: 8080, isLocal: false });

  it("puts servers on this machine first", () => {
    const sorted = sortServers([remote9001, local9002]);

    expect(sorted.map(s => s.apiUrl)).toEqual(["b", "c"]);
  });

  it("orders by port within the same locality", () => {
    const sorted = sortServers([local9002, local9001]);

    expect(sorted.map(s => s.apiUrl)).toEqual(["a", "b"]);
  });

  it("breaks a port tie on the address", () => {
    const other = server({ apiUrl: "e", address: "10.0.0.10", port: 9001, isLocal: false });
    const sorted = sortServers([remote9001, other]);

    expect(sorted.map(s => s.apiUrl)).toEqual(["e", "c"]);
  });

  it("gives the same order whatever order discovery reported", () => {
    const a = sortServers([local9002, remote8080, local9001, remote9001]);
    const b = sortServers([remote9001, local9001, remote8080, local9002]);

    expect(a.map(s => s.apiUrl)).toEqual(b.map(s => s.apiUrl));
    expect(a.map(s => s.apiUrl)).toEqual(["a", "b", "d", "c"]);
  });

  it("does not mutate the list it was given", () => {
    const input = [local9002, local9001];
    sortServers(input);

    expect(input.map(s => s.apiUrl)).toEqual(["b", "a"]);
  });
});
