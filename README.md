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
corrections live in new files: `notebooks/UCSB_catalog_rag_notebook_v2.ipynb` and (once the v2
notebook is run in Colab) `results/ucsb_catalog_results_v2.csv` and `results/retrieved_ids_v2.json`.

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

### Metrics: original vs. corrected

The v2 notebook (`notebooks/UCSB_catalog_rag_notebook_v2.ipynb`) has the fixes for items 1–3
above applied but **has not been run yet** — corrected values below are pending a Colab run.

| Config | Chunk / top_n | Precision (orig → corrected) | Recall (orig → corrected) | F1 (orig → corrected) | NDCG@5 (orig → corrected) | MRR (orig → corrected) |
|---|---|---|---|---|---|---|
| 1 | 256 / 2 | 0.3516 → *pending* | 0.4933 → *pending* | 0.4096 → *pending* | 0.1189 → *pending* | 0.6156 → *pending* |
| 2 | 256 / 5 | 0.3516 → *pending* | 0.4933 → *pending* | 0.4096 → *pending* | 0.1189 → *pending* | 0.6156 → *pending* |
| 3 | 128 / 2 | 0.3369 → *pending* | 0.4400 → *pending* | 0.3802 → *pending* | 0.1184 → *pending* | 0.5911 → *pending* |
| 4 | 128 / 5 | 0.3369 → *pending* | 0.4400 → *pending* | 0.3802 → *pending* | 0.1184 → *pending* | 0.5911 → *pending* |

(Original values from `results/ucsb_catalog_results.csv`, unedited. Recall is the one metric the
audit found unaffected by either bug — its inputs don't depend on retrieval order or on the
duplicate-`corpus_id` denominator issue.)

### Why top_n=2 and top_n=5 produced identical metrics in the original run

Confirmed by reading the actual installed package source (`rapidfireai==0.12.9` — the version
live on PyPI on 2026-01-21, matching `logs/rapidfire.log`'s run timestamp; **not** the current
GitHub `main` branch, whose `RFLangChainRagSpec` API has since changed parameter names and would
not match this notebook's calls at all): `rag.get_context()` genuinely does apply the
cross-encoder reranker and its configured `top_n` cutoff via
`CrossEncoderReranker.compress_documents()` — top_n is not silently ignored. The most plausible
explanation for the identical metrics is bug #3 above: whichever extra chunks top_n=5 keeps
beyond top_n=2's cutoff most likely come from source documents already represented in the top 2,
so both sets collapse to the same unique `corpus_id`s once `set(pred)` runs — identical input to
every downstream metric. This is the best-supported explanation found, not a certainty — the
actual per-query retrieved chunk IDs from the original run were never saved anywhere, so it can't
be checked directly. The v2 notebook now saves `results/retrieved_ids_v2.json` specifically so
this kind of question can be checked without re-running the GPU job in the future.

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