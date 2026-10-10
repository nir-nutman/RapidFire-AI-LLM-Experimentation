# UCSB Course Catalog RAG System

**RapidFire AI Winter Competition Submission - RAG Track**

---

## 📚 Overview

A Retrieval-Augmented Generation (RAG) system that helps UCSB students quickly find information from the 2009-2010 course catalog. Instead of manually searching through 490 pages, students can ask natural language questions and receive accurate answers grounded in the catalog.

**Example Queries:**
- "What are the general education requirements?"
- "What courses are offered in the Computer Science department?"
- "What is the add/drop policy?"

---

## 🎯 Research Question

**Which chunking and reranking strategies provide optimal retrieval quality for academic course catalog queries?**

---

## 🔬 Experiment Design

### Configurations Tested (4 total)

| Config | Chunk Size | Rerank Top-N | Performance |
|--------|-----------|--------------|-------------|
| **1** ✅ | **256** | **2** | **Winner (tied)** |
| **2** ✅ | **256** | **5** | **Winner (tied)** |
| 3 | 128 | 2 | Baseline |
| 4 | 128 | 5 | Baseline |

### Fixed Parameters
- **Embedding Model**: `sentence-transformers/all-MiniLM-L6-v2`
- **Retrieval**: k=8 (similarity search with FAISS)
- **Reranker**: `cross-encoder/ms-marco-MiniLM-L6-v2`
- **Generator**: `Qwen/Qwen2.5-0.5B-Instruct` (0.5B parameters)

---

## 📊 Results Summary

### Winner: Config 1 & 2 (chunk_size=256)

| Metric | Config 1/2 (256 tokens) | Config 3/4 (128 tokens) | Improvement |
|--------|-------------------------|-------------------------|-------------|
| **Precision** | 0.373 | 0.341 | **+9.4%** |
| **Recall** | 0.520 | 0.427 | **+21.8%** |
| **F1 Score** | 0.434 | 0.372 | **+16.7%** |
| **NDCG@5** | 0.125 | 0.105 | **+19.0%** |
| **MRR** | 0.632 | 0.524 | **+20.6%** |

### Key Findings

1. ✅ **Larger chunks (256 tokens) significantly outperform smaller chunks (128 tokens)** across all metrics
2. ✅ **Chunk size is the critical parameter** for course catalog retrieval quality
3. ✅ **Reranking top_n had zero impact** on retrieval metrics
4. ✅ **Context preservation matters**: Complete course descriptions improve retrieval by 16-21%

---

## 📁 Dataset

### UCSB 2009-2010 Course Catalog
- **Source**: 490-page PDF with course descriptions, requirements, and policies
- **Corpus**: 1,304 document chunks
- **Queries**: 30 representative student questions
- **Qrels**: 150 relevance judgments (generated via embedding similarity)

**Dataset is included** in this repository (`data/` folder)

---

## 📂 Repository Structure
```
ucsb-catalog-rag/
├── notebooks/
│   └── UCSB_catalog_rag_notebook.ipynb  # Main experiment notebook
├── data/
│   ├── corpus.jsonl                 # 1,304 catalog chunks
│   ├── queries.jsonl                # 30 student questions
│   └── qrels.tsv                    # 150 relevance judgments
├── logs/
│   └── rapidfire.log                # Experiment log
├── results/
│   ├── ucsb_catalog_results.csv     # Final metrics
│   └── screenshots/                 # Experiment screenshots
├── README.md                         # This file
└── summary.md                        # Detailed experiment write-up
```

---

## 🛠️ How RapidFire AI Helped

RapidFire AI's experimentation framework enabled:

- ✅ **Parallel execution**: All 4 configs ran simultaneously (saved ~15-20 minutes)
- ✅ **Real-time metrics**: Live confidence intervals showed convergence
- ✅ **Interactive control**: Could stop/clone/resume configs dynamically
- ✅ **Automatic logging**: Complete experiment tracking for reproducibility
- ✅ **Grid search**: Automatically generated 4 configs from 2×2 parameter space

---

## 📖 Detailed Analysis

For complete analysis including:
- Hypothesis and methodology
- Detailed metrics breakdown
- Trade-offs and insights
- Future work recommendations

See **[summary.md](summary.md)**

---

## 🏆 Competition Submission

**Competition**: RapidFire AI Winter Competition on LLM Experimentation  
**Track**: RAG (Retrieval-First RAG Experimentation)  
**Submission Date**: January 2026  
**Award**: 🏅 Best Dataset Utilization  
**Press**: [RapidFire AI Celebrates Winners Showcasing How to Build Better LLM Applications, Faster](https://www.einpresswire.com/article/889751837/rapidfire-ai-celebrates-winners-showcasing-how-to-build-better-llm-applications-faster) (EIN Presswire, Feb 5, 2026)  

---

## 📝 Post-competition corrections

This section documents issues found in a later code audit (October 2026) and the corrections
made on the `v2-corrected-metrics` branch. **The original competition submission is unchanged** —
it's preserved at git tag `pre-correction` and in `notebooks/UCSB_catalog_rag_notebook.ipynb`,
`results/ucsb_catalog_results.csv`, and `summary.md`, none of which were edited in place. All
corrections live in new files: `notebooks/UCSB_catalog_rag_notebook_v2.ipynb`,
`results/ucsb_catalog_results_v2.csv` and `results/retrieved_ids_v2.json`.

### Original problems found

1. **Unordered sets fed to rank-sensitive metrics.** `sample_compute_metrics_fn` converted
   `retrieved_documents` to a Python `set` before calling `compute_ndcg_at_k` and `compute_rr`.
   Both functions depend on retrieval rank order (`compute_ndcg_at_k` slices `[:k]` and weights
   by position; `compute_rr` finds the *first* relevant hit) — a Python `set`'s iteration order
   is not retrieval rank order, so NDCG@5 and MRR were computed against effectively arbitrary
   ordering, not the real ranking.
2. **NDCG relevance-scale mismatch.** `compute_ndcg_at_k` scored actual hits with relevance `1`
   but the ideal ranking with relevance `3`. Since IDCG was built from `3`s against a DCG built
   from `1`s, the maximum achievable NDCG@5 was capped at **1/3 ≈ 0.333**, regardless of how good
   retrieval actually was — not a 0–1 scale as documented.
3. **Duplicate `corpus_id` merging.** `data/corpus.jsonl`'s 1,304 records average ~3,499
   characters each; the pipeline's own text splitter (128/256-token chunks) subdivides nearly
   all of them further at index time. Multiple sub-chunks from the same source record inherit the
   same `corpus_id` (LangChain's text splitters propagate parent-document metadata to every
   child chunk). When several such sub-chunks land in one query's retrieved set, collapsing to
   `set(pred)` merges them into a single `corpus_id`, shrinking the Precision denominator below
   the actual number of chunks retrieved.
4. **"1,304" is source sections, not retrieval chunks.** Per point 3, `corpus.jsonl`'s 1,304
   records are pre-text-splitter documents. The actual number of retrieval-time chunks the vector
   index searches over is larger and differs between the 128-token and 256-token configs — that
   number isn't recorded anywhere in this repository.
5. **Relevance judgments (`qrels.tsv`) can't be independently verified.** The README and notebook
   both state the 150 relevance judgments were "generated via embedding similarity," but no
   data-preparation script for this exists anywhere in this repository's git history (checked
   across every commit). The exact method, which embedding model was used for labeling, and
   whether any human review occurred could not be confirmed.
6. **Unsupported claims in the original "Key Findings" section.** "Students find relevant
   information 20% faster" and "answers are 9% more accurate" restate MRR and Precision — rank
   and retrieval-relevance metrics — as if they measured user-perceived speed and generated-answer
   correctness, which nothing in this codebase evaluates. "Real-time confidence intervals showed
   256-token superiority after just 50% of data was processed" isn't substantiated by
   `logs/rapidfire.log` (checked for any confidence/interval/convergence logging — none found).
7. **The headline numbers in the README/notebook don't match the committed results CSV.** The
   original "Results Summary" table lists 256-token chunks at Precision 0.373 / Recall 0.520 /
   F1 0.434 / NDCG@5 0.125 / MRR 0.632 and 128-token at 0.341 / 0.427 / 0.372 / 0.105 / 0.524.
   `results/ucsb_catalog_results.csv` has 0.352 / 0.493 / 0.410 / 0.119 / 0.616 and
   0.337 / 0.440 / 0.380 / 0.118 / 0.591. The claimed improvements (+9.4% Precision, +21.8% Recall)
   are larger than the CSV supports (+4.4%, +12.1%). **The README/`summary.md` numbers come from
   an earlier run, not from the committed CSV:** an earlier local notebook
   (`RapidFireAI_RAG_Pipeline_UCSB_Catalog.ipynb`, dated Jan 19) prints exactly those values
   (e.g. Precision 0.373413, Recall 0.520000, F1 0.433722 for 256 tokens), while the committed CSV
   matches the later run recorded in `logs/rapidfire.log` (Jan 21). The README and `summary.md`
   were apparently never updated after the later run. Why the two runs differ (for example a
   different query sample) hasn't been determined. Both runs show identical results for
   `top_n=2` and `top_n=5`.
8. **The reranker was configured but (per the package source) not applied at query time**, so
   `top_n` had no effect. Details in the section below.

### Metrics: original vs. corrected

The v2 notebook (`notebooks/UCSB_catalog_rag_notebook_v2.ipynb`) was run in Colab (T4,
`rapidfireai==0.12.9`) on the same 15 sampled queries. Results are in
`results/ucsb_catalog_results_v2.csv`; per-query retrieved IDs are in
`results/retrieved_ids_v2.json`.

| Config | Chunk / top_n | Precision (orig → v2) | Recall (orig → v2) | F1 (orig → v2) | NDCG@5 (orig → v2) | MRR (orig → v2) |
|---|---|---|---|---|---|---|
| 1 | 256 / 2 | 0.3516 → 0.3516 | 0.4933 → 0.4933 | 0.4096 → 0.4096 | 0.1189 → 0.3451 | 0.6156 → 0.6583 |
| 2 | 256 / 5 | 0.3516 → 0.3516 | 0.4933 → 0.4933 | 0.4096 → 0.4096 | 0.1189 → 0.3451 | 0.6156 → 0.6583 |
| 3 | 128 / 2 | 0.3369 → 0.3369 | 0.4400 → 0.4400 | 0.3802 → 0.3802 | 0.1184 → 0.3498 | 0.5911 → 0.6000 |
| 4 | 128 / 5 | 0.3369 → 0.3369 | 0.4400 → 0.4400 | 0.3802 → 0.3802 | 0.1184 → 0.3498 | 0.5911 → 0.6000 |

Original values are from `results/ucsb_catalog_results.csv`, unedited. How to read this:

- **Precision, Recall and F1 are unchanged**, as expected: they were already computed on
  de-duplicated sets, and the fixes only changed order and the NDCG scale. (Precision/F1 are now
  *documented* as being over unique `corpus_id`s; the underlying denominator behavior is the same.)
- **NDCG@5 and MRR changed**, because they now see real rank order and a 0–1 NDCG scale.
- **With corrected metrics, 256-token chunks no longer win on every metric.** 256 is higher on
  Precision (+4.4% relative), Recall (+12.1%), F1 (+7.7%) and MRR (+9.7%), but NDCG@5 is slightly
  *lower* for 256 (0.345 vs 0.350, −1.3%). This is 15 queries with no confidence intervals, so
  treat the small differences as unresolved rather than as findings.
- **Rows 1 vs 2 and 3 vs 4 are identical on every query** (the retrieved-ID lists are equal), so
  `top_n` had no effect. See the next section for why. Only two distinct configurations were
  effectively evaluated: chunk size 256 and chunk size 128.

### Why top_n=2 and top_n=5 produced identical metrics in the original run

**Finding: the cross-encoder reranker most likely never ran during evaluation, in the original
run or in v2.** This comes from reading the `rapidfireai==0.12.9` source (the version on PyPI on
2026-01-21, matching `logs/rapidfire.log`; not the current GitHub `main`, whose API differs) and
is consistent with the v2 data. It has not been confirmed by inspecting a live session.

- `LangChainRagSpec.__init__` sets `self.reranker = None` (`rapidfireai/evals/rag/rag_pipeline.py:170`).
  The reranker object is only created inside `build_pipeline()` (lines 220-233).
- Each query actor rebuilds its `rag_spec` from a prebuilt retriever and passes
  `reranker_cls`/`reranker_kwargs` as plain attributes
  (`rapidfireai/evals/actors/query_actor.py:201-214`). It never calls `build_pipeline()`, so the
  actor's `self.reranker` stays `None`.
- `_rerank_docs` returns the documents unchanged when `self.reranker` is falsy
  (`rag_pipeline.py:516`). So `rag.get_context(...)` returned the raw k=8 similarity results.
- **Consistent with the data:** `results/retrieved_ids_v2.json` has 6-8 unique `corpus_id`s per
  query, even for the `top_n=2` configs. A working `top_n=2` reranker would leave at most 2 chunks.
  8 is the raw k=8 search; 6-7 appear where several chunks share a `corpus_id`.

Consequences: **the reranker listed under "Fixed Parameters" was configured but not applied**, so
the evaluated pipeline was single-stage embedding retrieval (k=8), not two-stage retrieve-and-
rerank. `top_n` could not matter, which is why rows 1/2 and 3/4 are identical. Separately,
`get_hash()` (`rag_pipeline.py:461-496`) omits `top_n`, so the 4 configs collapsed to 2 shared
contexts ("Found 2 unique RAG context(s)" in the run log); that would also have hidden a top_n
difference, but it is not the cause here.

Two earlier versions of this section gave wrong explanations (first the duplicate-`corpus_id`
set collapsing, then "top_n=5 reused a top_n=2 reranker"). Neither is supported by the source or
the retrieved-ID data above.

To confirm in a live session: after `Experiment.run_evals` has started, a query actor's
`rag_spec.reranker` can be inspected; if it is `None`, no reranking happened.

### Embedding storage

Confirmed from the same `rapidfireai==0.12.9` source (`rapidfireai/evals/rag/rag_pipeline.py`,
`LangChainRagSpec.build_pipeline()`): with `vector_store=None` and `enable_gpu_search=True`, a
**FAISS** index is built using `faiss.IndexFlatL2` moved to GPU (exact L2 distance search). With
`enable_gpu_search=False` it would instead build `faiss.IndexHNSWFlat` (approximate, CPU).

---

## 📧 Contact

**Author**: Nir Nutman  
**Email**: nir.nutman@gmail.com
**GitHub**: [@nir-nutman](https://github.com/nir-nutman)

---

## 🙏 Acknowledgments

- **RapidFire AI** for the experimentation framework
- **UCSB** for the course catalog data
- **Claude (Anthropic)** for assistance in development