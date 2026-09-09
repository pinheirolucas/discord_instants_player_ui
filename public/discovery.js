const discoveryChannel = "discovery:api-url";
const discoveryType = "myinstants";
const discoveryProtocol = "tcp";
const discoveryApiVersion = "1";
const discoveryQueryInterval = 30000;

function isLinkLocalIPv4(address) {
  return address.startsWith("169.254.");
}

function isLinkLocalIPv6(address) {
  return /^fe[89ab]/i.test(address);
}

function pickHost(service) {
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

  if (ipv6) {
    return `[${ipv6}]`;
  }

  return null;
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

module.exports = {
  discoveryChannel,
  discoveryType,
  discoveryProtocol,
  discoveryApiVersion,
  discoveryQueryInterval,
  buildApiUrl,
  pickHost
};
