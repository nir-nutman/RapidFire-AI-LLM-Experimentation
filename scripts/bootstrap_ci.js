// Recomputes per-query retrieval metrics from the saved retrieved-ID lists + qrels.tsv, checks they
// reproduce the numbers in the results CSVs, then runs a paired bootstrap over queries to get 95%
// confidence intervals for the differences between configurations.
//   node scripts/bootstrap_ci.js
// Metric definitions match notebooks/UCSB_catalog_rag_notebook_v2/v3 (P/R/F1 over unique corpus_id,
// NDCG@5 with binary relevance, MRR over the ordered de-duplicated list).
const fs = require('fs');

const v2 = JSON.parse(fs.readFileSync('results/retrieved_ids_v2.json', 'utf8'));
const v3 = JSON.parse(fs.readFileSync('results/retrieved_ids_v3.json', 'utf8'));

const expected = {};
for (const line of fs.readFileSync('data/qrels.tsv', 'utf8').trim().split('\n').slice(1)) {
  const [q, c] = line.split('\t');
  (expected[q] ||= new Set()).add(Number(c));
}

function metrics(retrieved, E) {
  const R = [...new Set(retrieved)];
  const tp = R.filter(x => E.has(x)).length;
  const p = R.length ? tp / R.length : 0;
  const r = E.size ? tp / E.size : 0;
  const f1 = p + r > 0 ? (2 * p * r) / (p + r) : 0;
  const rel = R.slice(0, 5).map(x => (E.has(x) ? 1 : 0));
  const dcg = rel.reduce((s, v, i) => s + v / Math.log2(i + 2), 0);
  let idcg = 0;
  for (let i = 0; i < Math.min(5, E.size); i++) idcg += 1 / Math.log2(i + 2);
  const ndcg = idcg > 0 ? dcg / idcg : 0;
  const idx = R.findIndex(x => E.has(x));
  return { P: p, R: r, F1: f1, NDCG: ndcg, MRR: idx >= 0 ? 1 / (idx + 1) : 0 };
}

// conditions: name -> { queryId -> ordered ids }
const cond = {
  'no-rerank 256': v2['1'].retrieved_ids_by_query,
  'no-rerank 128': v2['3'].retrieved_ids_by_query,
  'rerank top2 256': v3['1'].retrieved_ids_by_query,
  'rerank top5 256': v3['2'].retrieved_ids_by_query,
  'rerank top2 128': v3['3'].retrieved_ids_by_query,
  'rerank top5 128': v3['4'].retrieved_ids_by_query,
};
const qids = Object.keys(cond['no-rerank 256']).sort((a, b) => a - b);
const KEYS = ['P', 'R', 'F1', 'NDCG', 'MRR'];

const per = {}; // name -> metric -> array over qids
for (const [name, byQ] of Object.entries(cond)) {
  per[name] = Object.fromEntries(KEYS.map(k => [k, []]));
  for (const q of qids) {
    const m = metrics(byQ[q], expected[q]);
    for (const k of KEYS) per[name][k].push(m[k]);
  }
}
const mean = a => a.reduce((s, v) => s + v, 0) / a.length;

// --- reproduce reported numbers (v2 CSV and v3 CSV) ---
const reported = {
  'no-rerank 256': { P: 0.35158730158730156, R: 0.49333333333333335, F1: 0.4096348096348096, NDCG: 0.34513412355279777, MRR: 0.6583333333333333 },
  'no-rerank 128': { P: 0.33690476190476193, R: 0.44, F1: 0.38018648018648016, NDCG: 0.349755343525716, MRR: 0.6 },
  'rerank top2 256': { P: 0.40, R: 0.16, F1: 0.228571, NDCG: 0.196224, MRR: 0.466667 },
  'rerank top5 256': { P: 0.37, R: 0.346667, F1: 0.357037, NDCG: 0.337419, MRR: 0.527778 },
  'rerank top2 128': { P: 0.20, R: 0.08, F1: 0.114286, NDCG: 0.118974, MRR: 0.333333 },
  'rerank top5 128': { P: 0.39, R: 0.346667, F1: 0.365926, NDCG: 0.332757, MRR: 0.513333 },
};
let ok = true;
for (const [name, rep] of Object.entries(reported))
  for (const k of KEYS) {
    const got = mean(per[name][k]);
    if (Math.abs(got - rep[k]) > 2e-6) { ok = false; console.log(`MISMATCH ${name} ${k}: recomputed ${got} vs reported ${rep[k]}`); }
  }
console.log(ok ? `Recomputed metrics reproduce all reported numbers (${qids.length} queries x 6 conditions).` : 'WARNING: recomputed metrics do NOT match reported numbers; do not trust the CIs below.');

// --- paired bootstrap over queries ---
function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const rand = rng(12345), B = 10000, n = qids.length;
const resamples = Array.from({ length: B }, () => Array.from({ length: n }, () => Math.floor(rand() * n)));

function diffCI(a, b, k) {
  const d = per[a][k].map((v, i) => v - per[b][k][i]);
  const est = mean(d);
  const bs = resamples.map(ix => mean(ix.map(i => d[i]))).sort((x, y) => x - y);
  return { est, lo: bs[Math.floor(0.025 * B)], hi: bs[Math.ceil(0.975 * B) - 1] };
}
const comparisons = [
  ['Chunk size (no reranker): 256 minus 128', 'no-rerank 256', 'no-rerank 128'],
  ['Chunk size (rerank top_n=5): 256 minus 128', 'rerank top5 256', 'rerank top5 128'],
  ['Chunk size (rerank top_n=2): 256 minus 128', 'rerank top2 256', 'rerank top2 128'],
  ['Reranker top_n=5 minus no reranker (256)', 'rerank top5 256', 'no-rerank 256'],
  ['Reranker top_n=5 minus no reranker (128)', 'rerank top5 128', 'no-rerank 128'],
  ['Reranker top_n=2 minus no reranker (256)', 'rerank top2 256', 'no-rerank 256'],
  ['Reranker top_n=2 minus no reranker (128)', 'rerank top2 128', 'no-rerank 128'],
  ['top_n=5 minus top_n=2 (256, reranked)', 'rerank top5 256', 'rerank top2 256'],
  ['top_n=5 minus top_n=2 (128, reranked)', 'rerank top5 128', 'rerank top2 128'],
];
const f = x => (x >= 0 ? '+' : '') + x.toFixed(3);
let md = `# Bootstrap confidence intervals (paired, over queries)\n\n`;
md += `Generated by \`scripts/bootstrap_ci.js\` from \`results/retrieved_ids_v2.json\`, \`results/retrieved_ids_v3.json\` and \`data/qrels.tsv\`.\n`;
md += `${n} queries, ${B} bootstrap resamples (seed 12345). Cells are *difference [95% CI]*; **bold** means the interval excludes 0.\n`;
md += `The interval only reflects which ${n} queries were sampled; it does not cover label quality or the other 15 queries.\n\n`;
md += `| Comparison | ${KEYS.join(' | ')} |\n|---|${KEYS.map(() => '---').join('|')}|\n`;
for (const [label, a, b] of comparisons) {
  const cells = KEYS.map(k => { const c = diffCI(a, b, k); const s = `${f(c.est)} [${f(c.lo)}, ${f(c.hi)}]`; return c.lo > 0 || c.hi < 0 ? `**${s}**` : s; });
  md += `| ${label} | ${cells.join(' | ')} |\n`;
}
console.log('\n' + md);
fs.writeFileSync('results/bootstrap_ci.md', md);
console.log('written: results/bootstrap_ci.md');
