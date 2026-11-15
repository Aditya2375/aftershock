import { rmSync, mkdirSync, cpSync } from "node:fs";
rmSync("docs", { force: true, recursive: true });
mkdirSync("docs/src", { recursive: true });
mkdirSync("docs/data", { recursive: true });
for (const f of ["index.html", "styles.css"]) cpSync(f, `docs/${f}`);
for (const f of ["app.js", "statistics.js"])
  cpSync(`web/src/${f}`, `docs/src/${f}`);
cpSync("data/prices.csv", "docs/data/prices.csv");
console.log("docs built");
