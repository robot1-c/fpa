import { join } from "path";
import { chinaDate } from "./date.js";
import { fetchAllPages } from "./fetch.js";
import { collectUris, encodeUriFile } from "./transform.js";

const defaultRootDir = join(import.meta.dir, "..");

export async function runUpdate({
  rootDir = defaultRootDir,
  date = chinaDate(),
  fetchPage,
} = {}) {
  const configPath = join(rootDir, "config.json");
  const configFile = Bun.file(configPath);
  if (!(await configFile.exists())) {
    throw new Error(`Missing config: ${configPath}`);
  }

  const config = await configFile.json();
  const sources = Array.isArray(config.sources) ? config.sources : [];
  if (sources.length === 0) {
    throw new Error("No sources configured");
  }

  const allItems = [];
  for (const source of sources) {
    const items = await fetchAllPages(source, date, fetchPage);
    allItems.push(...items);
  }

  const uris = collectUris(allItems);
  if (uris.length === 0) {
    throw new Error("No proxies after filtering");
  }

  const encoded = `${encodeUriFile(uris)}\n`;
  const outPath = join(rootDir, "URI.txt");
  await Bun.write(outPath, encoded);

  return { date, count: uris.length, outPath };
}

if (import.meta.main) {
  runUpdate()
    .then((result) => {
      console.log(`Updated ${result.count} proxies for ${result.date}`);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
