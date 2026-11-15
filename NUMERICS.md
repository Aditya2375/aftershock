# Numerical conventions

## Returns and transformations

For adjusted positive closing prices P, r[t] = log(P[t]) - log(P[t-1]). The difference-of-logs implementation avoids overflow from a ratio of extremely different positive prices. The first return is on the second price date inside the chosen window; no previous-window price is pulled into a subwindow. The plot's index is zero-based and counts observed returns, not elapsed calendar time. No forward fill, calendar interpolation or annualization.

The three transforms are r, abs(r), r*r. Each transformation has its **own** global mean. Squaring means squared raw log return, not squared mean-adjusted return. Extremely large squared inputs that overflow are rejected.

## Autocorrelation

For x[0..N-1], m=mean(x). For k=1..K:

```
ACF[k] = sum(i=k..N-1, (x[i]-m)*(x[i-k]-m))
         / sum(i=0..N-1, (x[i]-m)^2)
```

This is NIST's biased estimator, since covariance and variance both use divisor N, which cancels. It is not the less-biased N-k covariance estimate or the Pearson correlation of two separately demeaned slices. K<N; lag zero is 1 and excluded from displayed/exported lag rows. No sample correction, significance stars, p-values, bands, model fitting or stationarity test.

Before centering, inputs are divided by their maximum absolute value to avoid overflow/underflow without changing the mathematical ACF. If all inputs are zero or the normalized centered-square sum is below 1e-28, return undefined (NaN) rather than a false correlation of zero. This numerical threshold also treats extremely near-constant inputs as undefined. No bundled series triggers it. The finite-sample plots do not establish long-range dependence.

## Order shuffle

One Fisher-Yates permutation uses LCG seed 991, iterating i=N-1..1 with j=floor(next()*(i+1)). Every original return is retained exactly once. The same permutation is used before all three transformations so the curves remain comparable. The chart switch changes only which ordering appears in the chronological strip, not the original-order ACF definition. A single pseudorandom permutation is a descriptive counterfactual, not a Monte Carlo null distribution or uncertainty interval.

The LCG has 32-bit state = (1664525*state+1013904223) modulo 2^32; next = unsigned(state)/2^32. This is reproducible noncryptographic randomness. Finite PRNG resolution does not implement an ideal infinite-precision uniform permutation.

## Synthetic GARCH control

Generate 2,766 returns after 1,000 discarded burn-in updates, seed 42. Innovations z use Box-Muller sqrt(-2*log(max(next(),2^-32)))*cos(2*pi*next()); no cached second normal draw. Set initial variance=0.0001 and previous return=0. Before each new return:

```
variance = 0.000004 + 0.12*previous_return^2 + 0.84*variance
return = sqrt(variance)*z
```

Alpha+beta=0.96; the model's unconditional variance is 0.000004/(1-0.96)=0.0001. The finite realization need not have exactly this sample variance. The control is specified, not estimated, calibrated or evidence that a particular security follows this model. It can have magnitude dependence without predictable signed returns.

## RMS and rendering

The overlaid line is sqrt(mean of last 20 squared log returns), including the current observation. It is trailing, not centered, has 19 undefined warmup points, and is not demeaned standard deviation or a forecast. Both strip lines share the same percent-return vertical units. The strip axis is symmetric around zero with bounds based on the selected sample. ACF panels share a vertical range computed from all six displayed curves, with at least [-0.2,0.3] range; between datasets the range may change. Read the axes, not just mark heights. No smoothing or downsampling; all returns and lags are drawn. Lag inspection and CSV retain raw double values (UI rounded to four decimals).

## Checks

Analytic [1,2,3,4] ACF is [1,0.25,-0.3,-0.45]. Alternating [1,-1,1,-1] has lag-one ACF=-0.75. RMS of [3,4] is sqrt(12.5). Tests cover these fixtures, translation/scale invariance, constants, zeros, invalid data, tiny/large finite scales, exact distribution preservation under shuffle and deterministic synthetic generation.

Fresh Java snapshots are compared with the JS implementation across both assets and all three windows, all three transformations, plus synthetic control: raw returns, complete 60-lag ACF, shuffled ACF, every rolling RMS point including undefined warmup. Agreement is checked at 1e-10; it does not replace independent analytic fixtures.
