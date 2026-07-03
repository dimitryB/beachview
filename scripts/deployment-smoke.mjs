const rawUrl = process.argv[2];

if (!rawUrl) {
  throw new Error(
    "Pass the deployed base URL, for example: npm run smoke:deployment -- https://USER.github.io/beachview/",
  );
}

const baseUrl = new URL(rawUrl.endsWith("/") ? rawUrl : `${rawUrl}/`);
const isLocal =
  baseUrl.hostname === "localhost" || baseUrl.hostname === "127.0.0.1";

if (!isLocal && baseUrl.protocol !== "https:") {
  throw new Error("The deployed site must use HTTPS.");
}

async function fetchOk(label, url) {
  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    throw new Error(`${label} returned HTTP ${response.status}: ${url}`);
  }
  return response;
}

const shellResponse = await fetchOk("Application shell", baseUrl);
const html = await shellResponse.text();
const cacheControl = shellResponse.headers.get("cache-control") ?? "";

if (/immutable/i.test(cacheControl)) {
  throw new Error("The HTML shell is cached as immutable.");
}

const assetPaths = [
  ...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g),
].map((match) => match[1]);

if (assetPaths.length < 2) {
  throw new Error("The application shell did not reference built JS and CSS.");
}

for (const assetPath of assetPaths) {
  const assetUrl = new URL(assetPath, baseUrl);
  if (!assetUrl.pathname.startsWith(baseUrl.pathname)) {
    throw new Error(
      `Asset escaped the configured Pages base path: ${assetUrl.pathname}`,
    );
  }
  await fetchOk("Built asset", assetUrl);
}

const fishingUrl = new URL(baseUrl);
fishingUrl.searchParams.set("view", "fishing");
await fetchOk("Fishing deep link", fishingUrl);

console.log(
  [
    `Deployment shell: ${baseUrl}`,
    `Fishing deep link: ${fishingUrl}`,
    `Verified built assets: ${assetPaths.length}`,
    `HTML cache-control: ${cacheControl || "not provided"}`,
  ].join("\n"),
);
