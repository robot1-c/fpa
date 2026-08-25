const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function buildPageUrl(source, date, page) {
  const url = new URL(source.url);
  const params = { ...(source.params ?? {}), date, page };

  for (const [key, value] of Object.entries(params)) {
    if (value == null) continue;
    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

export async function fetchWithRetry(
  url,
  { retries = 3, fetchFn = fetch, delay = sleep } = {},
) {
  let lastError;

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const response = await fetchFn(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`.trim());
      }

      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await delay(500 * attempt);
      }
    }
  }

  throw lastError;
}

export async function fetchAllPages(source, date, fetchPage) {
  if (source.type !== "daily_list_api") {
    throw new Error(`Unsupported source type: ${source.type}`);
  }

  const loadPage = fetchPage ?? ((url) => fetchWithRetry(url));
  const pageSize = source.params?.page_size ?? 100;
  const items = [];
  let page = 1;
  let total = Infinity;

  while (items.length < total) {
    const body = await loadPage(buildPageUrl(source, date, page));
    if (!body || body.code !== 0) {
      throw new Error(
        `API error code=${body?.code ?? "unknown"} message=${body?.message ?? ""}`.trim(),
      );
    }

    const data = body.data ?? {};
    const pageItems = Array.isArray(data.items) ? data.items : [];
    total = Number(data.total ?? 0);
    items.push(...pageItems);

    if (pageItems.length === 0) break;
    if (items.length >= total) break;
    if (pageItems.length < (data.page_size ?? pageSize)) break;
    page += 1;
  }

  return items;
}
