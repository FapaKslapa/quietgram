import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { build } from "esbuild";

const appOrigin = (process.env.APP_ORIGIN ?? "http://localhost:8787").replace(/\/$/, "");

await rm("dist", { recursive: true, force: true });
await mkdir("dist", { recursive: true });

await build({
  entryPoints: { background: "src/background.ts", popup: "src/popup.ts" },
  outdir: "dist",
  bundle: true,
  format: "esm",
  target: "chrome120",
  define: { __APP_ORIGIN__: JSON.stringify(appOrigin) },
});

const manifest = await readFile("manifest.json", "utf8");
await writeFile("dist/manifest.json", manifest.replace("__APP_ORIGIN__", appOrigin));
await cp("popup.html", "dist/popup.html");
