/**
 * Serves docs and checks archive windows, transformation ACF, shuffled controls,
 * CSV contents, synthetic data and small-screen layout in headless Chrome via CDP.
 * SMOKE_SHOTS=1 saves screenshots for separate visual inspection.
 */
import { spawn } from "node:child_process";
import {
  writeFileSync,
  readFileSync,
  mkdirSync,
  existsSync,
  rmSync,
  mkdtempSync,
} from "node:fs";

const HTTP_PORT = 8954;
const CDP_PORT = 9355;
const SHOTS = process.env.SMOKE_SHOTS === "1";
const root = new URL("..", import.meta.url).pathname;

const profile = mkdtempSync("/tmp/aftershock-chrome-");
const server = spawn(
  "python3",
  [
    "-m",
    "http.server",
    String(HTTP_PORT),
    "--bind",
    "127.0.0.1",
    "--directory",
    `${root}docs`,
  ],
  { stdio: "ignore", detached: true },
);
const chrome = spawn(
  "google-chrome",
  [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    `--remote-debugging-port=${CDP_PORT}`,
    `--user-data-dir=${profile}`,
    "about:blank",
  ],
  { stdio: "ignore", detached: true },
);

const cleanup = async (code) => {
  for (const child of [chrome, server]) {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {}
  }
  await Promise.all(
    [chrome, server].map((child) =>
      child.exitCode !== null
        ? Promise.resolve()
        : new Promise((r) => child.once("exit", r)),
    ),
  );
  rmSync(profile, { recursive: true, force: true });
  process.exit(code);
};
const timeout = setTimeout(() => {
  console.error("smoke: timeout");
  cleanup(1);
}, 90000);
process.on("SIGINT", () => cleanup(2));
process.on("uncaughtException", (e) => {
  console.error(e);
  cleanup(1);
});
process.on("unhandledRejection", (e) => {
  console.error(e);
  cleanup(1);
});

async function waitFor(fn, label, timeoutMs = 60000) {
  const start = Date.now();
  for (;;) {
    try {
      const v = await fn();
      if (v) return v;
    } catch {}
    if (Date.now() - start > timeoutMs)
      throw new Error(`timed out waiting for ${label}`);
    await new Promise((r) => setTimeout(r, 250));
  }
}

const checks = [];
const check = (name, ok, detail = "") => {
  checks.push({ name, ok, detail });
  console.log(
    `${ok ? "ok" : "NOT OK"} - ${name}${detail ? " - " + detail : ""}`,
  );
};

await waitFor(
  async () => (await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`)).ok,
  "chrome devtools",
);
const target = await (
  await fetch(`http://127.0.0.1:${CDP_PORT}/json/new`, { method: "PUT" })
).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.onopen = resolve;
  ws.onerror = reject;
});

let mid = 0;
const rpcPending = new Map();
const consoleErrors = [];
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  if (msg.id && rpcPending.has(msg.id)) {
    rpcPending.get(msg.id)(msg);
    rpcPending.delete(msg.id);
  } else if (msg.method === "Runtime.exceptionThrown")
    consoleErrors.push(
      msg.params.exceptionDetails?.exception?.description ?? "page exception",
    );
};
const cdp = (method, params = {}) =>
  new Promise((resolve) => {
    const id = ++mid;
    rpcPending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) => {
  const res = await cdp("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (res.result?.exceptionDetails)
    throw new Error(JSON.stringify(res.result.exceptionDetails));
  return res.result?.result?.value;
};
const shot = async (name) => {
  if (!SHOTS) return;
  await new Promise((r) => setTimeout(r, 900));
  const metrics = await cdp("Page.getLayoutMetrics");
  const size = metrics.result.cssContentSize;
  const r = await cdp("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: true,
    clip: { x: 0, y: 0, width: size.width, height: size.height, scale: 1 },
  });
  writeFileSync(
    `${root}smoke-${name}.png`,
    Buffer.from(r.result.data, "base64"),
  );
};

await cdp("Runtime.enable");
await cdp("Page.enable");
await cdp("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 960,
  deviceScaleFactor: 1,
  mobile: false,
});
await cdp("Page.navigate", { url: `http://127.0.0.1:${HTTP_PORT}/` });

await waitFor(
  () =>
    evaluate(
      `document.getElementById('status').textContent.includes('2007-01-03')`,
    ),
  "archive loaded",
);
check(
  "archive count",
  await evaluate(`document.getElementById('count').textContent==='2,766'`),
);
check(
  "default ticker MSFT",
  await evaluate(
    `document.getElementById('status').textContent.includes('MSFT')`,
  ),
);
const initial = await evaluate(
  `document.getElementById('absolute').textContent`,
);
check(
  "exact MSFT fixture",
  await evaluate(
    `document.getElementById('signed').textContent==='-0.0591' && document.getElementById('absolute').textContent==='0.2349' && document.getElementById('squared').textContent==='0.1513'`,
  ),
);
await shot("default");
await evaluate(`document.getElementById('shuffled').click()`);
check(
  "shuffle sequence title",
  await evaluate(
    `document.getElementById('sequence-title').textContent==='The same returns, shuffled'`,
  ),
);
check(
  "shuffle does not change original ACF",
  (await evaluate(`document.getElementById('absolute').textContent`)) ===
    initial,
);
await evaluate(
  `document.getElementById('period').value='crisis';document.getElementById('period').dispatchEvent(new Event('change'))`,
);
check(
  "window recomputes",
  await evaluate(
    `+document.getElementById('count').textContent.replace(',','')<1000 && document.getElementById('absolute').textContent!=='${initial}'`,
  ),
);
await shot("crisis");
await evaluate(
  `document.getElementById('asset').value='AAPL';document.getElementById('asset').dispatchEvent(new Event('change'))`,
);
check(
  "asset changes report",
  await evaluate(
    `document.getElementById('status').textContent.includes('AAPL')`,
  ),
);
await evaluate(
  `document.getElementById('horizon').value='20';document.getElementById('horizon').dispatchEvent(new Event('change'));document.getElementById('lag').value='20';document.getElementById('lag').dispatchEvent(new Event('input'))`,
);
check(
  "horizon and inspector",
  await evaluate(
    `document.getElementById('lag').max==='20' && document.getElementById('lag-value').textContent==='20 sessions' && document.querySelectorAll('#lag-table tr').length===3`,
  ),
);
await evaluate(`document.getElementById('lag').focus()`);
await cdp("Input.dispatchKeyEvent", {
  type: "keyDown",
  key: "ArrowLeft",
  code: "ArrowLeft",
  windowsVirtualKeyCode: 37,
});
await cdp("Input.dispatchKeyEvent", {
  type: "keyUp",
  key: "ArrowLeft",
  code: "ArrowLeft",
  windowsVirtualKeyCode: 37,
});
check(
  "keyboard inspector",
  await evaluate(
    `document.getElementById('lag-value').textContent==='19 sessions'`,
  ),
);
await evaluate(
  `document.getElementById('asset').value='GARCH';document.getElementById('asset').dispatchEvent(new Event('change'))`,
);
check(
  "synthetic fixed seed result",
  await evaluate(`document.getElementById('absolute').textContent==='0.1562'`),
);
check(
  "synthetic clearly labeled and period disabled",
  await evaluate(
    `document.getElementById('period').disabled && document.getElementById('status').textContent.startsWith('Synthetic control') && document.getElementById('sequence-note').textContent.includes('1,000 burn-in')`,
  ),
);
mkdirSync(`${root}build/downloads`, { recursive: true });
rmSync(`${root}build/downloads/aftershock-acf.csv`, { force: true });
await cdp("Browser.setDownloadBehavior", {
  behavior: "allow",
  downloadPath: `${root}build/downloads`,
});
await evaluate(`document.getElementById('export').click()`);
await waitFor(
  () => existsSync(`${root}build/downloads/aftershock-acf.csv`),
  "ACF export",
);
const rows = readFileSync(`${root}build/downloads/aftershock-acf.csv`, "utf8")
  .trim()
  .split(/\r?\n/);
check(
  "CSV current horizon and label",
  rows.length === 21 && rows[1].startsWith("GARCH,synthetic_seed42,1,"),
);
check(
  "CSV numeric ACF values",
  rows.slice(1).every((r) =>
    r
      .split(",")
      .slice(3)
      .every((v) => Number.isFinite(+v) && Math.abs(+v) <= 1),
  ),
);
await shot("synthetic");
for (const width of [390, 320]) {
  await cdp("Emulation.setDeviceMetricsOverride", {
    width,
    height: 844,
    deviceScaleFactor: 1,
    mobile: false,
  });
  check(
    `mobile ${width} no overflow`,
    await evaluate(`document.documentElement.scrollWidth<=innerWidth`),
  );
  await evaluate(`scrollTo(0,0)`);
  await shot(`mobile-${width}`);
}
await evaluate(
  `document.getElementById('asset').value='MSFT';document.getElementById('asset').dispatchEvent(new Event('change'))`,
);
check(
  "return from synthetic restores window choice",
  await evaluate(
    `!document.getElementById('period').disabled && document.getElementById('status').textContent.includes('2009-12-31')`,
  ),
);
check("no page exceptions", consoleErrors.length === 0, consoleErrors[0] ?? "");
check(
  "no visible UI error",
  await evaluate(`document.getElementById('error').textContent===''`),
);
await cdp("Network.enable");
await cdp("Network.setBlockedURLs", { urls: ["*/data/prices.csv"] });
await cdp("Page.reload", { ignoreCache: true });
await waitFor(
  () =>
    evaluate(
      `document.getElementById('error').textContent.includes('could not be loaded')`,
    ),
  "load failure state",
);
check(
  "archive load failure visible and export disabled",
  await evaluate(
    `document.getElementById('export').disabled && document.getElementById('status').textContent==='Archive unavailable'`,
  ),
);
const failed = checks.filter((c) => !c.ok);
console.log(`${checks.length - failed.length} passed, ${failed.length} failed`);
clearTimeout(timeout);
await cleanup(failed.length ? 1 : 0);
