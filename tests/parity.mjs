import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  returns,
  acf,
  transform,
  shuffle,
  rms,
  garch,
  parseArchive,
} from "../web/src/statistics.js";
const refs = JSON.parse(
    execFileSync("java", ["-cp", "build/classes", "aftershock.RefDump"], {
      encoding: "utf8",
      maxBuffer: 10 * 1024 * 1024,
    }),
  ),
  data = parseArchive(readFileSync("data/prices.csv", "utf8"));
let comparisons = 0,
  worst = 0;
function near(a, b, label) {
  assert.equal(a.length, b.length, label);
  a.forEach((v, i) => {
    if (b[i] === null) {
      assert.ok(Number.isNaN(v));
      return;
    }
    const d = Math.abs(v - b[i]);
    assert.ok(d < 1e-10, `${label}[${i}] error ${d}`);
    worst = Math.max(worst, d);
    comparisons++;
  });
}
for (const ref of refs) {
  const start = ref.period === "later" ? "2013-01-01" : "2007-01-01",
    end = ref.period === "crisis" ? "2009-12-31" : "2017-12-31",
    raw =
      ref.asset === "GARCH"
        ? garch(2766, 42)
        : returns(
            data
              .filter((r) => r.date >= start && r.date <= end)
              .map((r) => r[ref.asset]),
          );
  near(raw, ref.returns, "returns");
  near(acf(transform(raw, ref.mode), 60), ref.acf, "ACF");
  near(
    acf(transform(shuffle(raw, 991), ref.mode), 60),
    ref.shuffled,
    "shuffle ACF",
  );
  near(rms(raw, 20), ref.rms, "RMS");
}
assert.deepEqual(acf([1, 2, 3, 4], 3), [1, 0.25, -0.3, -0.45]);
assert.ok(acf([2, 2, 2], 1).every(Number.isNaN));
assert.throws(() => parseArchive("date,AAPL,MSFT\n2020-01-01,0x10,1"));
assert.throws(() => parseArchive("date,AAPL,MSFT\n2020-01-01,1e3,1"));
console.log(
  `${comparisons} Java/JS comparisons in ${refs.length} asset/period/transform configurations; max error ${worst}`,
);
