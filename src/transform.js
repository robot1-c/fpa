export function parseProtocols(protocols) {
  if (protocols == null) return [];
  return String(protocols)
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item && item !== "https");
}

export function itemToUri(item) {
  if (!item || item.ip == null || item.port == null || item.port === "") {
    return null;
  }

  const protocols = parseProtocols(item.protocols);
  if (protocols.length === 0) return null;

  if (protocols.some((protocol) => protocol.includes("socks"))) {
    return `socks://${item.ip}:${item.port}`;
  }

  if (protocols.some((protocol) => protocol.includes("http"))) {
    return `http://${item.ip}:${item.port}`;
  }

  return null;
}

export function collectUris(items) {
  const seen = new Set();
  const uris = [];

  for (const item of items) {
    const uri = itemToUri(item);
    if (!uri || seen.has(uri)) continue;
    seen.add(uri);
    uris.push(uri);
  }

  return uris;
}

export function encodeUriFile(uris) {
  const text = `${uris.join("\n")}\n`;
  return Buffer.from(text, "utf8").toString("base64");
}

export function decodeUriFile(encoded) {
  return Buffer.from(String(encoded).trim(), "base64").toString("utf8");
}
