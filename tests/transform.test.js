import { describe, expect, test } from "bun:test";
import {
  collectUris,
  decodeUriFile,
  encodeUriFile,
  itemToUri,
} from "../src/transform.js";

describe("itemToUri", () => {
  test("drops https-only protocols", () => {
    expect(
      itemToUri({ ip: "1.1.1.1", port: 443, protocols: "https" }),
    ).toBeNull();
  });

  test("maps http to http://", () => {
    expect(itemToUri({ ip: "1.1.1.1", port: 8080, protocols: "http" })).toBe(
      "http://1.1.1.1:8080",
    );
  });

  test("maps socks variants to socks://", () => {
    expect(itemToUri({ ip: "1.1.1.1", port: 1080, protocols: "socks5" })).toBe(
      "socks://1.1.1.1:1080",
    );
    expect(itemToUri({ ip: "1.1.1.1", port: 1080, protocols: "socks4" })).toBe(
      "socks://1.1.1.1:1080",
    );
    expect(itemToUri({ ip: "1.1.1.1", port: 1080, protocols: "socks" })).toBe(
      "socks://1.1.1.1:1080",
    );
  });

  test("prefers socks when both socks and http are present", () => {
    expect(
      itemToUri({ ip: "1.1.1.1", port: 1080, protocols: "http,socks4" }),
    ).toBe("socks://1.1.1.1:1080");
  });

  test("keeps http when mixed with https", () => {
    expect(
      itemToUri({ ip: "1.1.1.1", port: 8080, protocols: "http,https" }),
    ).toBe("http://1.1.1.1:8080");
  });

  test("drops unknown protocols", () => {
    expect(
      itemToUri({ ip: "1.1.1.1", port: 1080, protocols: "ss,vmess" }),
    ).toBeNull();
  });
});

describe("collectUris", () => {
  test("deduplicates and keeps first occurrence", () => {
    const uris = collectUris([
      { ip: "1.1.1.1", port: 1080, protocols: "socks5" },
      { ip: "2.2.2.2", port: 8080, protocols: "http" },
      { ip: "1.1.1.1", port: 1080, protocols: "socks4" },
    ]);

    expect(uris).toEqual(["socks://1.1.1.1:1080", "http://2.2.2.2:8080"]);
  });
});

describe("encodeUriFile", () => {
  test("round-trips a newline-separated proxy list", () => {
    const uris = ["http://1.1.1.1:8080", "socks://2.2.2.2:1080"];
    const encoded = encodeUriFile(uris);
    expect(decodeUriFile(encoded)).toBe(`${uris.join("\n")}\n`);
  });
});
