/* Orchard Noncommercial Research and Evaluation Licence 1.0.
 * Copyright (c) 2026 Kimberley Laverne Asher, to the extent of rights held.
 * Commercial use requires separate written permission. See LICENSE.txt.
 */
/* Finite Orchard encounter. No hidden truth, model service or external effects. */
(function (root) {
  'use strict';
  const SIZE = 32;
  const UNKNOWN = null;
  const FULL = [0, 1, 2, 3, 4];
  const COARSE = [1, 2, 3, 4];
  const TARGETS = [0, 1];
  function invariant(ok, message) { if (!ok) throw new Error(message); }
  function fixture(anchor = true, context = 'encounter-01') {
    const reports = [
      { root: 'target-00', context, state: 0, harmful: false },
      { root: 'target-01', context, state: 1, harmful: true }
    ];
    if (anchor) reports.push(
      { root: 'anchor-a', context, state: 2, harmful: false },
      { root: 'anchor-b', context, state: 2, harmful: true }
    );
    return reports;
  }
  function ingest(reports, context) {
    invariant(Array.isArray(reports), 'Reports must be an array.');
    const counts = Array.from({ length: SIZE }, () => [0, 0]);
    const seen = new Map();
    for (const r of reports) {
      invariant(r && Object.keys(r).sort().join(',') === 'context,harmful,root,state', 'Malformed report.');
      invariant(typeof r.root === 'string' && r.root.length > 0 && r.context === context, 'Wrong context or missing root.');
      invariant(Number.isInteger(r.state) && r.state >= 0 && r.state < SIZE && typeof r.harmful === 'boolean', 'Invalid report value.');
      const key = JSON.stringify([r.context, r.state, r.harmful]);
      if (seen.has(r.root)) { invariant(seen.get(r.root) === key, 'Conflicting reuse of an evidence root.'); continue; }
      invariant(counts[r.state][0] + counts[r.state][1] < 3, 'A fourth root at one state is outside this model.');
      seen.set(r.root, key);
      counts[r.state][Number(r.harmful)]++;
    }
    return counts;
  }
  function initial(context = 'encounter-01') {
    return { context, revision: 0, reports: fixture(true, context), budget: 1, global: false,
      refined: false, exposeAllowed: true, permission: true, coverageValid: true };
  }
  function validate(s) {
    invariant(s && typeof s.context === 'string' && s.context.length > 0 && Number.isInteger(s.revision) && s.revision >= 0, 'Invalid encounter.');
    invariant(Number.isInteger(s.budget) && s.budget >= 0 && s.budget <= 2, 'Error allowance must be zero, one or two.');
    for (const k of ['global', 'refined', 'exposeAllowed', 'permission', 'coverageValid']) invariant(typeof s[k] === 'boolean', 'Invalid switch: ' + k);
    invariant(!s.refined || s.exposeAllowed, 'The missing coordinate is not accessible.');
    return ingest(s.reports, s.context);
  }
  function ruleLabel(n, remainder, budget, global) {
    if (Math.min(...n) + remainder > budget) return UNKNOWN;
    const extra = global ? remainder : 0;
    const safe = n[0] + extra > budget;
    const harmful = n[1] + extra > budget;
    return safe !== harmful ? Number(harmful) : UNKNOWN;
  }
  function project(x, bits) { return bits.reduce((value, bit) => value | (x & (1 << bit)), 0); }
  function worldCount(counts, budget) {
    let dp = Array(budget + 1).fill(0n); dp[0] = 1n;
    for (const n of counts) {
      const next = Array(budget + 1).fill(0n);
      for (let used = 0; used <= budget; used++) for (let v = 0; v <= 1; v++) {
        const cost = n[1 - v];
        if (used + cost <= budget) next[used + cost] += dp[used];
      }
      dp = next;
    }
    return dp.reduce((a, b) => a + b, 0n);
  }
  function evaluate(s) {
    const counts = validate(s);
    const minima = counts.map(n => Math.min(...n));
    const minimumErrors = minima.reduce((a, b) => a + b, 0);
    const consistent = minimumErrors <= s.budget;
    const possible = counts.map((n, x) => consistent ? [0, 1].filter(v => n[1 - v] + minimumErrors - minima[x] <= s.budget) : []);
    const point = counts.map((n, x) => ruleLabel(n, minimumErrors - minima[x], s.budget, s.global));
    const bits = s.refined ? FULL : COARSE;
    const fibres = new Map();
    for (let x = 0; x < SIZE; x++) {
      const key = project(x, bits);
      if (!fibres.has(key)) fibres.set(key, []);
      fibres.get(key).push(x);
    }
    const receiving = Array(SIZE).fill(UNKNOWN);
    for (const fibre of fibres.values()) {
      const v = point[fibre[0]];
      if (v !== UNKNOWN && fibre.every(x => point[x] === v)) for (const x of fibre) receiving[x] = v;
    }
    return { counts, minimumErrors, consistent, possible, point, receiving, bits, fibres: [...fibres.values()],
      worlds: worldCount(counts, s.budget).toString(),
      pointDecisive: point.filter(v => v !== UNKNOWN).length,
      coverage: TARGETS.filter(x => receiving[x] !== UNKNOWN).length,
      roots: counts.reduce((a, n) => a + n[0] + n[1], 0) };
  }
  function qualifyRule(budget = 1) {
    let cases = 0;
    for (let safe = 0; safe <= 3; safe++) for (let harmful = 0; harmful <= 3 - safe; harmful++) for (let rest = 0; rest <= 31; rest++) {
      cases++;
      const n = [safe, harmful];
      const allowed = [0, 1].filter(v => n[1 - v] + rest <= budget);
      const old = ruleLabel(n, rest, budget, false);
      const next = ruleLabel(n, rest, budget, true);
      invariant(next === UNKNOWN || allowed.length === 1 && allowed[0] === next, 'Unsound rule construction.');
      invariant(old === UNKNOWN || old === next, 'A previously justified label was lost.');
    }
    return { passed: true, cases };
  }
  function compare(s) {
    return [[false, false], [true, false], [false, true], [true, true]].map(([global, refined]) => {
      if (refined && !s.exposeAllowed) return { global, refined, coverage: null, allowed: false };
      return { global, refined, coverage: evaluate({ ...s, global, refined }).coverage, allowed: true };
    });
  }
  function findRepair(s) {
    const before = evaluate(s);
    const warrant = qualifyRule(s.budget);
    const candidates = compare(s).map(c => {
      if (!c.allowed) return { ...c, preserves: false, eligible: false };
      const after = evaluate({ ...s, global: c.global, refined: c.refined });
      const preserves = before.point.every((v, x) => v === UNKNOWN || after.point[x] === v)
        && before.receiving.every((v, x) => v === UNKNOWN || after.receiving[x] === v);
      return { ...c, preserves, eligible: preserves && c.coverage > before.coverage };
    });
    const chosen = candidates.find(c => c.eligible);
    return { warrant, candidates, state: chosen ? { ...s, global: chosen.global, refined: chosen.refined } : null };
  }
  // Exact snapshot equality is a currentness check in this honest local host, not authentication.
  function binding(s) {
    const counts = validate(s);
    const roots = [...new Map(s.reports.map(r => [r.root, [r.root, r.context, r.state, r.harmful]])).values()]
      .sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
    return JSON.stringify({ context: s.context, revision: s.revision, counts, budget: s.budget,
      roots, global: s.global, refined: s.refined, exposeAllowed: s.exposeAllowed, coverageValid: s.coverageValid });
  }
  function capture(s) {
    const warrant = s.global ? qualifyRule(s.budget) : { cases: 0 };
    const result = evaluate(s);
    return Object.freeze({ context: s.context, snapshot: binding(s), labels: Object.freeze(TARGETS.map(x => result.receiving[x])), qualifierCases: warrant.cases });
  }
  function execute(s, receipt) {
    validate(s);
    let reason = 'current';
    if (!s.coverageValid) reason = 'coverage';
    else if (!receipt) reason = 'no-receipt';
    else if (receipt.context !== s.context || receipt.snapshot !== binding(s)) reason = 'stale';
    else if (!s.permission) reason = 'permission';
    const labels = reason === 'current' ? evaluate(s).receiving : [];
    return { reason, decisions: TARGETS.map(x => reason !== 'current' || labels[x] === UNKNOWN ? 'hold' : labels[x] === 0 ? 'release' : 'block') };
  }
  const api = { SIZE, UNKNOWN, FULL, COARSE, TARGETS, fixture, ingest, initial, evaluate, qualifyRule, compare, findRepair, binding, capture, execute };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.OrchardCoupled = Object.freeze(api);
})(typeof globalThis !== 'undefined' ? globalThis : this);
