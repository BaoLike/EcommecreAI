# Assistant evaluation

`assistant_cases.jsonl` contains labeled shopping, follow-up, policy, mixed-intent,
order-boundary, and general questions. It is intentionally separate from runtime
retrieval data.

Run it with the Spring API and FastAPI service available:

```bash
cd EcomServer/EcomAI
AI_EVAL_API_URL=http://localhost:8000 python -m evals.run_evaluation
```

The evaluator prints route accuracy, extracted category/budget accuracy,
product and document Recall@K for labeled cases, citation validity, task
completion, error rate, latency, and provider-reported prompt/completion token
deltas from `/metrics`. Product-name expectations refer to the optional sample
catalog and should be adjusted for the catalog being scored. The token delta can
include concurrent traffic to the same AI process.

`citation_validity_proxy` and `groundedness_proxy` only check that `[P#]` and
`[S#]` markers point to returned evidence; they are not semantic groundedness
judges. `groundedness_requires_review` flags answers with evidence for manual
review. Review policy answers against approved policy documents before release.
The `/metrics` endpoint exposes process-level request, node, retrieval, and
provider-reported token counters for a Prometheus-compatible scraper. Metrics
reset on restart.
