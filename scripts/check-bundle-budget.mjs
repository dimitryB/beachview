import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const root = fileURLToPath(new URL("..", import.meta.url));
const dist = path.join(root, "dist");
const indexPath = path.join(dist, "index.html");

const LIMITS = {
  css: 30 * 1024,
  js: 150 * 1024,
};

function assetPaths(html, expression) {
  return [...html.matchAll(expression)].map((match) => match[1]);
}

function formatKilobytes(bytes) {
  return `${(bytes / 1024).toFixed(2)} KB`;
}

async function gzipBytes(assetPath) {
  const normalized = assetPath.replace(/^\/+/, "");
  const contents = await readFile(path.join(dist, normalized));
  return gzipSync(contents).byteLength;
}

const html = await readFile(indexPath, "utf8");
const initialJavaScript = assetPaths(
  html,
  /<script[^>]+src="([^"]+\.js)"[^>]*>/g,
);
const initialCss = assetPaths(html, /<link[^>]+href="([^"]+\.css)"[^>]*>/g);

if (initialJavaScript.length === 0 || initialCss.length === 0) {
  const outputFiles = await readdir(path.join(dist, "assets"));
  throw new Error(
    `Could not identify initial JavaScript and CSS in dist/index.html. Assets: ${outputFiles.join(", ")}`,
  );
}

const jsBytes = (
  await Promise.all(initialJavaScript.map((asset) => gzipBytes(asset)))
).reduce((total, bytes) => total + bytes, 0);
const cssBytes = (
  await Promise.all(initialCss.map((asset) => gzipBytes(asset)))
).reduce((total, bytes) => total + bytes, 0);

console.log(
  `Initial bundle: ${formatKilobytes(jsBytes)} JavaScript gzip / ${formatKilobytes(cssBytes)} CSS gzip.`,
);

const failures = [];
if (jsBytes >= LIMITS.js) {
  failures.push(
    `JavaScript is ${formatKilobytes(jsBytes)}; budget is below ${formatKilobytes(LIMITS.js)}.`,
  );
}
if (cssBytes >= LIMITS.css) {
  failures.push(
    `CSS is ${formatKilobytes(cssBytes)}; budget is below ${formatKilobytes(LIMITS.css)}.`,
  );
}

if (failures.length > 0) {
  throw new Error(failures.join("\n"));
}
