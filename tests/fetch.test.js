import { describe, expect, test } from "bun:test";
import { buildPageUrl, fetchAllPages, fetchWithRetry } from "../src/fetch.js";

const source = {
  name: "daily-list",
  type: "daily_list_api",
  url: "https://xxx.com/api/external/free-proxy/daily-list",
  params: {
    min_uptime: 80,
    sort: "response_asc",
    status: 1,
    page_size: 100,
  },
};

function makePagedFetch(total, pageSize = 100) {
  const urls = [];

  const fetchPage = async (url) => {
    urls.push(url);
    const page = Number(new URL(url).searchParams.get("page"));
    const start = (page - 1) * pageSize;
    const items = [];

    for (let index = start; index < Math.min(start + pageSize, total); index += 1) {
      items.push({
        ip: `10.${Math.floor(index / 256)}.${index % 256}.1`,
        port: 1080,
        protocols: "http",
      });
    }

    return {
      code: 0,
      data: {
        total,
        page,
        page_size: pageSize,
        items,
      },
      message: "success",
    };
  };

  return { urls, fetchPage };
}

describe("buildPageUrl", () => {
  test("injects China date and page into query params", () => {
    const url = new URL(buildPageUrl(source, "2026-08-25", 2));
    expect(url.searchParams.get("date")).toBe("2026-08-25");
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("page_size")).toBe("100");
    expect(url.searchParams.get("min_uptime")).toBe("80");
    expect(url.searchParams.get("sort")).toBe("response_asc");
    expect(url.searchParams.get("status")).toBe("1");
  });
});

describe("fetchAllPages", () => {
  test("requests every page until total is collected", async () => {
    const { urls, fetchPage } = makePagedFetch(1029, 100);
    const items = await fetchAllPages(source, "2026-08-25", fetchPage);

    expect(items).toHaveLength(1029);
    expect(urls).toHaveLength(11);
    expect(new URL(urls[0]).searchParams.get("page")).toBe("1");
    expect(new URL(urls[10]).searchParams.get("page")).toBe("11");
  });

  test("throws when API code is not 0", async () => {
    await expect(
      fetchAllPages(source, "2026-08-25", async () => ({
        code: 1,
        message: "fail",
        data: { total: 0, items: [] },
      })),
    ).rejects.toThrow(/API error code=1/);
  });
});

describe("fetchWithRetry", () => {
  test("retries failed page requests up to 3 times", async () => {
    let attempts = 0;
    const fetchFn = async () => {
      attempts += 1;
      if (attempts < 3) {
        throw new Error("network");
      }
      return {
        ok: true,
        json: async () => ({ code: 0, data: { items: [] } }),
      };
    };

    const body = await fetchWithRetry("https://example.com", {
      fetchFn,
      delay: async () => {},
    });

    expect(attempts).toBe(3);
    expect(body.code).toBe(0);
  });
});
