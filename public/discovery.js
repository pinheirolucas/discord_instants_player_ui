const discoveryChannel = "discovery:api-url";
const discoveryServersChannel = "discovery:servers";
const discoveryRefreshChannel = "discovery:refresh";
const discoveryType = "myinstants";
const discoveryProtocol = "tcp";
const discoveryApiVersion = "1";
const discoveryQueryInterval = 30000;

const fqdnSuffix = `._${discoveryType}._${discoveryProtocol}.local`;

function isLinkLocalIPv4(address) {
  return address.startsWith("169.254.");
}

function isLinkLocalIPv6(address) {
  return /^fe[89ab]/i.test(address);
}

function pickAddress(service) {
  const addresses = (service && service.addresses) || [];

  const ipv4 = addresses.find(
    address => address.includes(".") && !isLinkLocalIPv4(address)
  );

  if (ipv4) {
    return ipv4;
  }

  const ipv6 = addresses.find(
    address => !address.includes(".") && !isLinkLocalIPv6(address)
  );

  return ipv6 || null;
}

function formatAddress(address) {
  if (!address) {
    return null;
  }

  return address.includes(".") ? address : `[${address}]`;
}

function pickHost(service) {
  return formatAddress(pickAddress(service));
}

function hostnameFromService(service) {
  const fqdn = (service && service.fqdn) || "";

  const instance = fqdn.endsWith(fqdnSuffix)
    ? fqdn.slice(0, -fqdnSuffix.length)
    : "";

  const withoutPort = instance.replace(/-\d+$/, "");
  const withoutDomain = withoutPort.replace(/\.local$/i, "");

  return withoutDomain || null;
}

function buildApiUrl(service) {
  if (!service || !Number.isInteger(service.port) || service.port <= 0) {
    return null;
  }

  const txt = service.txt || {};

  if (txt.api !== discoveryApiVersion) {
    return null;
  }

  const host = pickHost(service);

  if (!host) {
    return null;
  }

  const basePath = String(txt.path || "/").replace(/\/+$/, "");

  return `http://${host}:${service.port}${basePath}`;
}

function buildServer(service, localAddresses) {
  const apiUrl = buildApiUrl(service);

  if (!apiUrl) {
    return null;
  }

  const address = pickAddress(service);
  const known = localAddresses instanceof Set ? localAddresses : new Set();

  return {
    id: service.fqdn || apiUrl,
    apiUrl: apiUrl,
    address: address,
    port: service.port,
    hostname: hostnameFromService(service),
    isLocal: known.has(address)
  };
}

function sortServers(servers) {
  return servers.slice().sort((a, b) => {
    if (a.isLocal !== b.isLocal) {
      return a.isLocal ? -1 : 1;
    }

    if (a.port !== b.port) {
      return a.port - b.port;
    }

    return String(a.address).localeCompare(String(b.address));
  });
}

module.exports = {
  discoveryChannel,
  discoveryServersChannel,
  discoveryRefreshChannel,
  discoveryType,
  discoveryProtocol,
  discoveryApiVersion,
  discoveryQueryInterval,
  buildApiUrl,
  buildServer,
  hostnameFromService,
  sortServers,
  pickAddress,
  pickHost
};
