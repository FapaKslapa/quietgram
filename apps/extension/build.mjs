import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { build } from "esbuild";

const appOrigin = (process.env.APP_ORIGIN ?? "http://localhost:8787").replace(/\/$/, "");
const firefox = process.env.TARGET === "firefox";
const outdir = firefox ? "dist-firefox" : "dist";

await rm(outdir, { recursive: true, force: true });
await mkdir(outdir, { recursive: true });

await build({
  entryPoints: { background: "src/background.ts", popup: "src/popup.ts" },
  outdir,
  bundle: true,
  format: "esm",
  target: firefox ? "firefox128" : "chrome120",
  define: { __APP_ORIGIN__: JSON.stringify(appOrigin) },
});

const manifest = JSON.parse(
  (await readFile("manifest.json", "utf8")).replace("__APP_ORIGIN__", appOrigin),
);

if (firefox) {
  manifest.background = { scripts: ["background.js"], type: "module" };
  manifest.browser_specific_settings = {
    gecko: { id: "nodistraction@zimaserver.it", strict_min_version: "128.0" },
  };
}

await writeFile(`${outdir}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
await writeFile(
  `${outdir}/popup.html`,
  (await readFile("popup.html", "utf8")).replaceAll("__APP_ORIGIN__", appOrigin),
);
await cp("popup.css", `${outdir}/popup.css`);
await cp("assets/onest.woff2", `${outdir}/onest.woff2`);
await cp("assets/icons", `${outdir}/icons`, { recursive: true });
