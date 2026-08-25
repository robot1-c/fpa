import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { runUpdate } from "../src/update.js";

const config = {
  sources: [
    {
      name: "daily-list",
      type: "daily_list_api",
      url: "https://xxx.com/api/external/free-proxy/daily-list",
      params: {
        min_uptime: 80,
        sort: "response_asc",
        status: 1,
        page_size: 100,
      },
    },
  ],
};

async function makeRoot() {
  const rootDir = await mkdtemp(join(tmpdir(), "proxy-agg-"));
  await writeFile(join(rootDir, "config.json"), JSON.stringify(config), "utf8");
  await writeFile(join(rootDir, "URI.txt"), "old-content\n", "utf8");
  return rootDir;
}

describe("runUpdate", () => {
  const roots = [];

  afterEach(async () => {
    await Promise.all(roots.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  test("writes base64 URI.txt on success", async () => {
    const rootDir = await makeRoot();
    roots.push(rootDir);

    const result = await runUpdate({
      rootDir,
      date: "2026-08-25",
      fetchPage: async () => ({
        code: 0,
        message: "success",
        data: {
          total: 2,
          page: 1,
          page_size: 100,
          items: [
            { ip: "1.1.1.1", port: 1080, protocols: "socks5" },
            { ip: "2.2.2.2", port: 8080, protocols: "http" },
          ],
        },
      }),
    });

    const encoded = (await readFile(join(rootDir, "URI.txt"), "utf8")).trim();
    const decoded = Buffer.from(encoded, "base64").toString("utf8");
    expect(result.count).toBe(2);
    expect(decoded).toBe("socks://1.1.1.1:1080\nhttp://2.2.2.2:8080\n");
  });

  test("does not overwrite URI.txt when the API fails", async () => {
    const rootDir = await makeRoot();
    roots.push(rootDir);

    await expect(
      runUpdate({
        rootDir,
        date: "2026-08-25",
        fetchPage: async () => ({ code: 500, message: "boom" }),
      }),
    ).rejects.toThrow(/API error/);

    expect(await readFile(join(rootDir, "URI.txt"), "utf8")).toBe("old-content\n");
  });

  test("does not overwrite URI.txt when every proxy is filtered out", async () => {
    const rootDir = await makeRoot();
    roots.push(rootDir);

    await expect(
      runUpdate({
        rootDir,
        date: "2026-08-25",
        fetchPage: async () => ({
          code: 0,
          message: "success",
          data: {
            total: 1,
            page: 1,
            page_size: 100,
            items: [{ ip: "1.1.1.1", port: 443, protocols: "https" }],
          },
        }),
      }),
    ).rejects.toThrow(/No proxies after filtering/);

    expect(await readFile(join(rootDir, "URI.txt"), "utf8")).toBe("old-content\n");
  });
});
