import {
  returns,
  acf,
  transform,
  shuffle,
  rms,
  garch,
  parseArchive,
} from "./statistics.js";
const $ = (id) => document.getElementById(id),
  modes = ["signed", "absolute", "squared"],
  names = { signed: "Signed", absolute: "Absolute", squared: "Squared" },
  margin = { l: 56, r: 14, t: 18, b: 34 };
let data, state;
function ctxFor(id) {
  const canvas = $(id),
    w = canvas.clientWidth,
    h = canvas.clientHeight,
    dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);
  ctx.fillStyle = "#f9f8f3";
  ctx.fillRect(0, 0, w, h);
  return {
    ctx,
    w,
    h,
    pw: w - margin.l - margin.r,
    ph: h - margin.t - margin.b,
  };
}
function axes(p, min, max, end, label) {
  const { ctx, w, h, pw, ph } = p;
  ctx.font = "12px ui-monospace,monospace";
  ctx.fillStyle = "#536273";
  ctx.strokeStyle = "#d3d8d9";
  ctx.lineWidth = 1;
  const divisions =
    label === "lag / sessions" ? Math.round((max - min) * 10) : 4;
  for (let i = 0; i <= divisions; i++) {
    const y = margin.t + (i * ph) / divisions;
    ctx.beginPath();
    ctx.moveTo(margin.l, y);
    ctx.lineTo(margin.l + pw, y);
    ctx.stroke();
    ctx.textAlign = "right";
    const tick = max - ((max - min) * i) / divisions;
    ctx.fillText(
      Math.abs(tick) < 1e-12
        ? "0"
        : tick.toFixed(label === "lag / sessions" ? 1 : 2),
      margin.l - 6,
      y + 4,
    );
  }
  for (let i = 0; i <= 4; i++) {
    ctx.textAlign = i === 0 ? "left" : i === 4 ? "right" : "center";
    ctx.fillText(
      String(Math.round((end * i) / 4)),
      margin.l + (pw * i) / 4,
      h - 18,
    );
  }
  ctx.textAlign = "center";
  ctx.fillText(label, margin.l + pw / 2, h - 1);
  if (min < 0 && max > 0) {
    ctx.strokeStyle = "#8f9ca6";
    const zero = margin.t + (max / (max - min)) * ph;
    ctx.beginPath();
    ctx.moveTo(margin.l, zero);
    ctx.lineTo(margin.l + pw, zero);
    ctx.stroke();
  }
}
function drawSequence() {
  const p = ctxFor("returns"),
    { ctx, pw, ph } = p,
    values = $("shuffled").checked ? state.shuffled : state.raw,
    rolling = rms(values, 20),
    peak = Math.max(
      ...values.map(Math.abs),
      ...rolling.filter(Number.isFinite),
    ),
    bound = Math.max(0.01, Math.ceil(peak * 100) / 100),
    scaleY = (v) => margin.t + ((bound - v) / (2 * bound)) * ph;
  ctx.strokeStyle = "#456c97";
  ctx.lineWidth = 1;
  ctx.beginPath();
  values.forEach((v, i) => {
    const x = margin.l + (i / (values.length - 1)) * pw;
    ctx.moveTo(x, scaleY(0));
    ctx.lineTo(x, scaleY(v));
  });
  ctx.stroke();
  ctx.strokeStyle = "#ae4d22";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  rolling.forEach((v, i) => {
    if (!Number.isFinite(v)) return;
    const x = margin.l + (i / (values.length - 1)) * pw;
    i === 19 ? ctx.moveTo(x, scaleY(v)) : ctx.lineTo(x, scaleY(v));
  });
  ctx.stroke();
  axes(
    p,
    -bound * 100,
    bound * 100,
    values.length - 1,
    $("shuffled").checked
      ? "position after permutation"
      : "return index / observed sessions",
  );
  ctx.fillStyle = "#536273";
  ctx.textAlign = "left";
  ctx.fillText("%", 6, 11);
  $("sequence-title").textContent = $("shuffled").checked
    ? "The same returns, shuffled"
    : "Daily log returns in original order";
  $("sequence-note").textContent = state.synthetic
    ? "Synthetic GARCH(1,1): 2,766 observations after 1,000 burn-in updates. Seed 42; ω=0.000004, α=0.12, β=0.84. Not fitted to prices."
    : `${state.first} to ${state.last}. Split/dividend-adjusted historical closes. The first return uses the first two prices inside this window. The horizontal axis counts returns, not calendar days. Shuffled positions are not original dates.`;
}
function drawAcf() {
  const boundMin = Math.min(
      -0.15,
      ...modes.flatMap((m) => [
        ...state.curves[m].slice(1),
        ...state.nulls[m].slice(1),
      ]),
    ),
    boundMax = Math.max(
      0.25,
      ...modes.flatMap((m) => [
        ...state.curves[m].slice(1),
        ...state.nulls[m].slice(1),
      ]),
    );
  let lo = Math.floor((boundMin - 0.03) * 10) / 10,
    hi = Math.ceil((boundMax + 0.03) * 10) / 10;
  for (const mode of modes) {
    const p = ctxFor("acf-" + mode),
      { ctx, pw, ph } = p,
      x = (i) => margin.l + (i / state.horizon) * pw,
      y = (v) => margin.t + ((hi - v) / (hi - lo)) * ph;
    axes(p, lo, hi, state.horizon, "lag / sessions");
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "#ae4d22";
    ctx.beginPath();
    for (let i = 1; i <= state.horizon; i++) {
      ctx.moveTo(x(i), y(0));
      ctx.lineTo(x(i), y(state.curves[mode][i]));
    }
    ctx.stroke();
    for (let i = 1; i <= state.horizon; i++) {
      ctx.beginPath();
      ctx.fillStyle = "#ae4d22";
      ctx.arc(x(i), y(state.curves[mode][i]), 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#456c97";
      ctx.beginPath();
      ctx.arc(x(i), y(state.nulls[mode][i]), 2.2, 0, Math.PI * 2);
      ctx.stroke();
    }
    const lag = +$("lag").value;
    ctx.strokeStyle = "#7c8790";
    ctx.setLineDash([3, 4]);
    ctx.beginPath();
    ctx.moveTo(x(lag), margin.t);
    ctx.lineTo(x(lag), margin.t + ph);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}
function inspect() {
  if (!state) return;
  const lag = +$("lag").value;
  $("lag-value").textContent = `${lag} ${lag === 1 ? "session" : "sessions"}`;
  $("lag-table").replaceChildren(
    ...modes.map((mode) => {
      const tr = document.createElement("tr");
      for (const text of [
        names[mode],
        state.curves[mode][lag].toFixed(4),
        state.nulls[mode][lag].toFixed(4),
      ]) {
        const td = document.createElement("td");
        td.textContent = text;
        tr.append(td);
      }
      return tr;
    }),
  );
  drawAcf();
}
function recalculate() {
  try {
    const asset = $("asset").value,
      period = $("period").value,
      horizon = +$("horizon").value,
      synthetic = asset === "GARCH";
    $("period").disabled = synthetic;
    $("period").parentElement.hidden = synthetic;
    $("archive-label").textContent = synthetic
      ? "Deterministic GARCH control"
      : "Fixed archive · 2007-2017";
    let raw, first, last;
    if (synthetic) {
      raw = garch(2766, 42);
      first = "Synthetic";
      last = "";
    } else {
      const start = period === "later" ? "2013-01-01" : "2007-01-01",
        end = period === "crisis" ? "2009-12-31" : "2017-12-31",
        rows = data.filter((r) => r.date >= start && r.date <= end);
      first = rows[0].date;
      last = rows.at(-1).date;
      raw = returns(rows.map((r) => r[asset]));
    }
    const shuffled = shuffle(raw, 991),
      curves = {},
      nulls = {};
    for (const mode of modes) {
      curves[mode] = acf(transform(raw, mode), horizon);
      nulls[mode] = acf(transform(shuffled, mode), horizon);
      $(mode).textContent = curves[mode][1].toFixed(4);
    }
    state = {
      raw,
      shuffled,
      curves,
      nulls,
      horizon,
      synthetic,
      first,
      last,
      asset,
      period,
    };
    $("count").textContent = raw.length.toLocaleString("en-US");
    $("lag").max = horizon;
    if (+$("lag").value > horizon) $("lag").value = horizon;
    $("status").textContent = synthetic
      ? "Synthetic control / fixed parameters, not market data"
      : `Quandl WIKI archive / ${asset} / ${first} to ${last} / not current quotes`;
    $("export").disabled = false;
    $("error").textContent = "";
    drawSequence();
    inspect();
  } catch (e) {
    $("error").textContent =
      "The calculation failed. Reload the page to restore the fixed example.";
    console.error(e);
  }
}
for (const id of ["asset", "period", "horizon"])
  $(id).addEventListener("change", () => {
    if (data) recalculate();
  });
$("shuffled").addEventListener("change", () => {
  if (state) drawSequence();
});
$("lag").addEventListener("input", inspect);
$("export").addEventListener("click", () => {
  if (!state) return;
  const rows = [
    "series,window,lag,signed_original,signed_shuffled,absolute_original,absolute_shuffled,squared_original,squared_shuffled",
  ];
  for (let lag = 1; lag <= state.horizon; lag++)
    rows.push(
      [
        state.asset,
        state.synthetic ? "synthetic_seed42" : state.period,
        lag,
        ...modes.flatMap((m) => [state.curves[m][lag], state.nulls[m][lag]]),
      ].join(","),
    );
  const blob = new Blob([rows.join("\r\n") + "\r\n"], {
      type: "text/csv;charset=utf-8",
    }),
    url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = "aftershock-acf.csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
let timer;
window.addEventListener("resize", () => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    if (state) {
      drawSequence();
      drawAcf();
    }
  }, 100);
});
fetch("./data/prices.csv")
  .then((r) => {
    if (!r.ok) throw Error("Archive unavailable");
    return r.text();
  })
  .then((text) => {
    data = parseArchive(text);
    recalculate();
  })
  .catch((e) => {
    $("status").textContent = "Archive unavailable";
    $("error").textContent =
      "The local historical archive could not be loaded. Reload to try again.";
    console.error(e);
  });
