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
│   └── UCSB_Catalog_RAG.ipynb      # Main experiment notebook
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

---

## 📧 Contact

**Author**: Nir Nutman  
**Email**: nir.nutman@gmail.com
**GitHub**: [@nirscripts](https://github.com/nirscripts)

---

## 🙏 Acknowledgments

- **RapidFire AI** for the experimentation framework
- **UCSB** for the course catalog data
- **Claude (Anthropic)** for assistance in development