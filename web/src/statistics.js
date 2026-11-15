export function returns(prices) {
  if (prices.length < 3) throw Error("At least three prices required");
  for (const p of prices)
    if (!Number.isFinite(p) || p <= 0)
      throw Error("Positive finite prices required");
  return prices.slice(1).map((p, i) => Math.log(p) - Math.log(prices[i]));
}
export function transform(x, mode) {
  if (!["signed", "absolute", "squared"].includes(mode))
    throw Error("Unknown transformation");
  return x.map((v) => {
    if (!Number.isFinite(v)) throw Error("Finite samples required");
    const y =
      mode === "absolute" ? Math.abs(v) : mode === "squared" ? v * v : v;
    if (!Number.isFinite(y)) throw Error("Transformation overflow");
    return y;
  });
}
export function acf(x, maxLag) {
  if (
    x.length < 2 ||
    !Number.isInteger(maxLag) ||
    maxLag < 1 ||
    maxLag >= x.length
  )
    throw Error("Lag must be between 1 and N-1");
  let mean = 0,
    scale = 0;
  for (const v of x) {
    if (!Number.isFinite(v)) throw Error("Finite samples required");
    scale = Math.max(scale, Math.abs(v));
  }
  const out = new Array(maxLag + 1).fill(NaN);
  if (scale === 0) return out;
  for (const v of x) mean += v / scale / x.length;
  const c = x.map((v) => v / scale - mean);
  let denominator = 0;
  for (const v of c) denominator += v * v;
  if (denominator < 1e-28) return out;
  out[0] = 1;
  for (let lag = 1; lag <= maxLag; lag++) {
    let sum = 0;
    for (let i = lag; i < x.length; i++) sum += c[i] * c[i - lag];
    out[lag] = sum / denominator;
  }
  return out;
}
export function random(seed) {
  let state = seed | 0;
  const next = () => {
    state = (Math.imul(1664525, state) + 1013904223) | 0;
    return (state >>> 0) / 4294967296;
  };
  return {
    next,
    gaussian: () =>
      Math.sqrt(-2 * Math.log(Math.max(next(), 1 / 4294967296))) *
      Math.cos(2 * Math.PI * next()),
  };
}
export function shuffle(x, seed) {
  const y = x.slice(),
    r = random(seed);
  for (let i = y.length - 1; i > 0; i--) {
    const j = Math.floor(r.next() * (i + 1)),
      t = y[i];
    y[i] = y[j];
    y[j] = t;
  }
  return y;
}
export function rms(x, window) {
  if (!Number.isInteger(window) || window < 1 || window > x.length)
    throw Error("Invalid RMS window");
  const out = new Array(x.length).fill(NaN);
  for (let i = window - 1; i < x.length; i++) {
    let sum = 0;
    for (let j = i - window + 1; j <= i; j++) sum += x[j] * x[j];
    out[i] = Math.sqrt(sum / window);
  }
  return out;
}
export function garch(n, seed) {
  if (!Number.isInteger(n) || n < 2 || n > 10000)
    throw Error("Synthetic size between 2 and 10000 required");
  const r = random(seed),
    out = [];
  let variance = 0.0001,
    previous = 0;
  for (let i = -1000; i < n; i++) {
    variance = 0.000004 + 0.12 * previous * previous + 0.84 * variance;
    previous = Math.sqrt(variance) * r.gaussian();
    if (i >= 0) out.push(previous);
  }
  return out;
}
export function parseArchive(text) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.shift() !== "date,AAPL,MSFT")
    throw Error("Unexpected archive header");
  let previous = "";
  return lines.map((line) => {
    const fields = line.split(",");
    if (fields.length !== 3) throw Error("Invalid archive row");
    const [date, ...values] = fields;
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      new Date(date + "T00:00:00Z").toISOString().slice(0, 10) !== date ||
      date <= previous
    )
      throw Error("Invalid archive dates");
    previous = date;
    const prices = values.map((v) => {
      if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(v))
        throw Error("Invalid decimal price");
      const n = Number(v);
      if (!Number.isFinite(n) || n <= 0) throw Error("Invalid price");
      return n;
    });
    return { date, AAPL: prices[0], MSFT: prices[1] };
  });
}
