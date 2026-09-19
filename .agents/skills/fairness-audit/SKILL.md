---
name: fairness-audit
description: Specialized skill for the FairLens AI Fairness and Model Auditing project. Use when working on dataset validation, preprocessing, model training, performance evaluation, protected attributes, fairness metrics, bias detection, bias attribution, bias mitigation, threshold optimization, XAI, audit report/narrative generation, prediction APIs, fairness reports, or related frontend displays.
---

# FairLens Fairness Audit Skill

## Purpose

This skill defines the technical rules for the FairLens major project.

FairLens is an AI fairness and model auditing system that:
1. accepts datasets,
2. validates and preprocesses data,
3. trains an ML model,
4. evaluates model performance,
5. audits fairness across protected groups,
6. names which group is disadvantaged and (where possible) which features are driving the disparity,
7. applies appropriate bias mitigation,
8. compares baseline and mitigated results with a quantified, dataset-specific narrative,
9. explains individual predictions using XAI,
10. exposes results through APIs,
11. displays backend results in the frontend.

The system's core deliverable is not a pass/fail badge — it is a transparent, evidence-backed answer to three questions every run: **(a) is there bias, and against whom, by how much; (b) what did the system do about it; (c) did that work, quantified on the same held-out data.** If no bias is found, that is a complete and valuable result and must be reported with the same rigor as a "bias found and mitigated" result — not as an afterthought.

The system must prioritize correctness, transparency, simplicity, reproducibility, and viva/exam explainability.

---

# 1. GENERAL DEVELOPMENT RULES

## Inspect before modifying

Always inspect the existing project structure and implementation before making changes.

Do not rebuild the entire project if an existing implementation can be corrected.

Prefer:
- minimum necessary changes,
- reuse of working components,
- clear separation of concerns,
- simple maintainable code.

Do not introduce unnecessary frameworks, libraries, services, or abstractions.

## Never fake results

Never hardcode:
- accuracy,
- precision,
- recall,
- F1,
- fairness metrics,
- disparate impact,
- group rates,
- thresholds,
- prediction probabilities,
- XAI values,
- mitigation improvements.

All ML results must be calculated from actual data and actual model predictions.

The frontend must never invent ML results.

## Never fake — or template — the narrative text

This applies to every screen and report the same way it applies to numbers.

Any sentence shown to the user that states a fact ("fairness improved", "accuracy preserved", "no degradation", "bias found on X") must be **assembled at render time from the structured audit result of that specific run** — never a fixed string reused across datasets or runs.

Concrete anti-pattern to avoid: two different datasets producing the exact same sentence — e.g. "Accuracy preserved: high predictive accuracy and F1 score were fully maintained without degradation" — while their actual before/after deltas are completely different (one dataset's accuracy dropped, another's F1 jumped by a large margin). If that can happen, the text is templated, not generated, and it is a bug at the same severity as a hardcoded metric.

Practical rule: if you can imagine the same sentence appearing unchanged and still reading correctly in a report for a different dataset with different numbers, it must be rebuilt from the structured result object instead of authored as fixed prose.

---

# 2. DATASET VALIDATION

Before training a model, inspect the dataset.

Check:

- row count,
- column count,
- data types,
- missing values,
- duplicate rows,
- unique values,
- class distribution,
- constant columns,
- near-zero-variance columns,
- ID columns,
- PII columns,
- target column,
- protected attributes,
- possible target leakage,
- categorical features,
- numerical features.

Do not automatically assume column names.

The user must be able to explicitly select:
- target column,
- protected attribute,
- reference group where appropriate.

## Remove inappropriate model features

Do not use obvious:
- IDs,
- names,
- emails,
- phone numbers,
- addresses,
- application IDs,
- notes,
- free-text PII,
- constant columns

as predictive features unless there is a justified reason.

Protected attributes should normally be kept separately for fairness auditing rather than automatically being used as model features.

If a protected attribute is deliberately used as a model feature, clearly disclose it.

Excluding PII/IDs/protected attributes from model features is data governance, not bias mitigation — it must never be reported as "the fix." State this distinction explicitly wherever feature exclusion is shown (see Section 11).

---

# 3. TRAIN / VALIDATION / TEST PIPELINE

Use a proper data split.

Recommended structure:

Dataset
→ validation
→ train/validation/test split
→ preprocessing
→ baseline model
→ validation evaluation
→ mitigation/threshold optimization
→ final unseen test evaluation
→ comparison
→ XAI

Never tune mitigation using the final test set.

## Preprocessing

Fit preprocessing only on training data.

Do not allow information from validation or test data to leak into training preprocessing.

Use a reproducible random seed where appropriate.

Save the fitted preprocessing/model pipeline so individual prediction uses exactly the same transformation process.

---

# 4. BASELINE MODEL

Train a clear baseline model before mitigation.

Prefer simple models that are easy to explain in a college major project.

Suitable models may include:

- Logistic Regression
- Decision Tree
- Random Forest
- XGBoost, when justified

Do not add many models just for complexity.

The selected model should have a clear reason.

---

# 5. PERFORMANCE METRICS

Calculate baseline performance using actual predictions.

At minimum calculate:

- Accuracy
- Precision
- Recall
- F1 Score
- Confusion Matrix
- Positive Prediction Rate
- Class Distribution

For binary classification, clearly identify the positive class.

Do not rely on accuracy alone.

If the dataset is highly imbalanced, explicitly report that and explain why accuracy may be misleading.

---

# 6. FAIRNESS AUDIT

Fairness must be calculated across the selected protected attribute.

Examples:

- Gender
- Race
- Age group
- Other explicitly selected protected attribute

Do not automatically label a model as biased simply because group outcomes differ.

Observed group differences are evidence for an audit, not automatic proof of unlawful or algorithmic discrimination.

## Group-level results

For every protected group where appropriate, calculate:

- group count,
- positive prediction rate,
- actual positive rate,
- true positive rate,
- false positive rate,
- precision,
- recall.

The UI should clearly show which group is being compared.

## Name the finding, not just the status

For every protected attribute, the audit result must explicitly name:

- `reference_group` (fixed by the rule in Section 10),
- `advantaged_group` (the group with the better observed outcome in this run),
- `disadvantaged_group` (the group with the worse observed outcome in this run),
- `bias_found: true | false`,
- the underlying metric values that produced the verdict.

A status of "Fairness Concern Detected" with no named group and no numbers is not an acceptable output. The minimum acceptable finding reads like: *"applicant_race: Black applicants are approved at 0.48× the rate of White applicants (Disparate Impact 0.48, below the 0.80 threshold)."*

If `bias_found: false` for an attribute, still report its passing numbers explicitly — do not just omit it, since "here are the numbers that prove it's fine" is itself part of the audit trail (see Section 12).

---

# 7. DISPARATE IMPACT

For binary classification:

Disparate Impact (DI) is:

positive prediction rate of comparison group
divided by
positive prediction rate of reference group.

Example:

Reference group positive rate = 0.60
Comparison group positive rate = 0.45

DI = 0.45 / 0.60 = 0.75

The commonly used 80% rule can be presented as:

DI >= 0.80 → passes the selected screening threshold

DI < 0.80 → potential fairness concern

Do not describe DI >= 0.80 as proof that the model has "no bias".

Use wording such as:

"Passes the selected disparate-impact threshold."

or

"No potential disparate-impact concern detected under this threshold."

---

# 8. OTHER FAIRNESS METRICS

Where applicable calculate:

## Demographic / Statistical Parity

Compare positive prediction rates across groups.

## Equal Opportunity

Compare True Positive Rates across groups.

Report:

TPR difference = comparison TPR - reference TPR

## False Positive Rate Difference

Report:

FPR difference = comparison FPR - reference FPR

Always state which groups are being compared.

Do not hide the reference group.

---

# 9. PROXY FEATURE / BIAS ATTRIBUTION

Beyond the group-level pass/fail verdict, the audit should attempt to surface **which features are most associated with the disparity** — this is what makes the tool an auditing/explainability toolkit rather than a metrics calculator.

Approach (where the trained model supports it):

- Compute SHAP values (or comparable feature-importance/coefficient output) separately for the advantaged group and the disadvantaged group.
- Rank features by how differently they contribute between the two groups.
- Report the top features as candidate proxies, e.g.: *"`zip_code` and `years_employed` contribute more negatively to the disadvantaged group's scores than to the advantaged group's; these may be acting as proxies for `applicant_race`."*

This must be:

- computed from the actual trained model and actual data for the current run — never a fixed list of "biased terms" or a keyword dictionary;
- accompanied, every time it is shown, by this exact caveat: **"This identifies statistical correlation and candidate proxy features, not proof of causal or intentional discrimination."**
- kept as a distinct, separately labeled part of the report from the group-level fairness verdict (Section 6) — proxy attribution explains *why a disparity might exist*, it does not replace or override the fairness metrics that determine *whether* one exists.

Do not skip this section to save time — a report that says "bias found" with no attempt to say what's driving it is only half the audit.

---

# 10. REFERENCE GROUP

Reference groups must be explicit.

Do not silently choose an arbitrary group.

If a reference group is not specified, choose a reasonable default only when the project design requires it and clearly display the selected reference group.

The reference group, once chosen for a given run, is fixed for the entire audit and mitigation cycle — it must never be re-selected after seeing mitigation results, and never chosen because it produces a more favorable outcome.

Example:

Protected attribute: Gender
Reference group: Male

Comparison groups:
- Female
- Non-binary

---

# 11. BIAS MITIGATION

Mitigation must actually modify the prediction behavior or model.

Do not create a fake "after mitigation" result.

Possible methods include:

- threshold adjustment,
- reweighting,
- resampling,
- preprocessing mitigation,
- post-processing.

For this project, threshold adjustment can be used when appropriate because it is easy to explain.

## Threshold optimization

Candidate thresholds must be evaluated on validation data.

Example:

0.30
0.35
0.40
...
0.70

Choose thresholds according to a clearly defined objective balancing:

- fairness improvement,
- model performance,
- acceptable trade-off.

Do not automatically force every dataset to improve.

## Record the concrete action taken

The report must state the literal parameter that changed, not a vague phrase like "boundary adjustment." At minimum record and display, per mitigated attribute:

```
method: "per-group decision threshold calibration (learned on validation set)"
thresholds_before: { ...all groups, typically the shared default... }
thresholds_after: { group_name: learned_value, ... }
```

Never display a threshold such as 0.50 for every group unless the algorithm genuinely produced that value.

---

# 12. WHEN BASELINE ALREADY PASSES

This is extremely important.

If baseline fairness already satisfies the selected fairness criterion, do NOT artificially change the model just to show an improvement.

Correct result:

"Baseline already satisfies the selected fairness criterion. No mitigation was required."

The before and after metrics may legitimately be identical.

The UI must explain why.

Never fake an improvement.

## The "no bias" report must be complete, not a stub

A clean result is a real, useful finding and must be reported with the same completeness as a biased one:

- List every protected attribute that was tested.
- Show each attribute's actual passing metrics (Disparate Impact, TPR/FPR gaps, group rates) — the proof, not just the assertion.
- State explicitly that no mitigation ran, and why (baseline already satisfied the configured thresholds).

Do not shorten a clean result down to a single generic line — that is exactly the kind of low-information output this project exists to replace.

---

# 13. BEFORE / AFTER COMPARISON

Baseline and mitigated results must be independently calculated.

Never copy baseline values into the mitigated result object.

Compare:

- Accuracy
- Precision
- Recall
- F1
- Positive Prediction Rate
- Disparate Impact
- TPR difference
- FPR difference
- Group rates
- Thresholds

Possible mitigation statuses:

- Fairness improved
- Fairness maintained
- Fairness worsened
- No mitigation required
- No acceptable mitigation found

Use the actual calculated results to determine the status.

Before and after values must come from the identical held-out test rows in both cases — never compare a validation-stage baseline against a test-stage mitigated result, and never compare different row samples.

---

# 14. AUDIT NARRATIVE GENERATION RULES

This section exists because status labels and metrics alone are not the deliverable — the generated sentences that explain them are, and those sentences are the easiest part of the system to accidentally fake.

Every narrative sentence shown in the Fairness, Mitigation, Explainability, and Report screens must be built from the structured result of the current run:

- **Headline** — must name whether bias was found, on how many attributes, and (if found) against which group. Not: "Fairness Concern Detected." Instead: "Bias found on 1 of 2 attributes: Black applicants are disadvantaged on `applicant_race`."
- **Mitigation summary** — must state the actual method and actual learned parameters (Section 11), or explicitly "no mitigation — not needed" (Section 12).
- **Before/after headline** — must be assembled from the real before/after/delta values, e.g.: "Disparate Impact improved from 0.48 to 0.83, crossing the 0.80 threshold, at a cost of 0.7 accuracy points." A sentence claiming a metric was "preserved" or "maintained" may only be used when the delta is within an explicitly configured tolerance (define this tolerance in config — do not eyeball it per dataset).
- **Conclusion** — one sentence, generated from the final structured status, not authored once and reused.

Add a regression test asserting that two datasets with different computed deltas never produce byte-identical narrative strings. If they do, the text is templated and must be fixed at the generation source, not by editing the string.

---

# 15. MITIGATION TRADE-OFF

Fairness improvement may reduce some performance metrics.

That is acceptable if clearly reported.

Example:

Baseline:
Accuracy = 0.87
F1 = 0.22
DI = 0.65

Mitigated:
Accuracy = 0.84
F1 = 0.28
DI = 0.83

The system should explain:

"Disparate impact improved to above the selected threshold, while accuracy decreased."

Never hide trade-offs.

---

# 16. XAI / EXPLAINABILITY

XAI explains why a model produced an individual prediction.

It does NOT automatically determine whether a feature is biased.

For example:

Annual Income: +0.20
Loan Purpose: -0.08

A negative contribution means that the feature pushed this particular prediction toward the negative class.

It does NOT mean:

"Loan Purpose is biased."

Fairness is evaluated using group-level statistics.

XAI and fairness analysis must remain conceptually separate. Group-level proxy-feature attribution (Section 9) is a distinct, separately labeled analysis from individual-prediction XAI — do not conflate the two in the UI or in generated text.

---

# 17. XAI IMPLEMENTATION

Use an appropriate explainability method depending on the model.

Possible methods:

- SHAP
- model coefficients for suitable linear models
- feature importance where appropriate

For an individual prediction display:

Show:

- predicted class,
- probability,
- decision threshold,
- important positive contributions,
- important negative contributions.

Clearly explain:

"Feature contribution shows how the feature influenced this individual prediction. It is not by itself a measure of algorithmic bias."

---

# 18. INDIVIDUAL PREDICTION

Individual prediction must use:

the same preprocessing pipeline
+
the same trained model
+
the same feature schema

used during training.

Do not create separate prediction logic in the frontend.

Frontend sends input.

Backend performs:

input validation
→ preprocessing
→ model prediction
→ probability
→ threshold decision
→ XAI explanation

Frontend only displays the result.

---

# 19. API RULES

FastAPI should expose clear endpoints.

Suggested structure:

POST /datasets/upload

POST /model/train

GET /model/metrics

GET /fairness/audit

POST /mitigation/run

GET /mitigation/results

POST /predict

POST /explain

GET /audit/report

Exact endpoint names may differ if an existing API structure is already working.

Do not duplicate ML calculations in the frontend.

Use consistent response schemas.

The fairness/audit and audit/report responses must include the named `advantaged_group` / `disadvantaged_group` / `bias_found` fields from Section 6, and the mitigation/results response must include the concrete `thresholds_before` / `thresholds_after` fields from Section 11 — the frontend must not be left to infer or word these itself.

Handle:
- invalid datasets,
- missing columns,
- invalid target,
- invalid protected attribute,
- unsupported data types,
- model errors,
- empty datasets,
- missing model state.

Return useful error messages.

---

# 20. FRONTEND RULES

The frontend must display backend-generated results.

Never hardcode demonstration values in production UI.

Do not calculate fairness metrics independently in React.

Do not author or select narrative sentences client-side — render exactly the text the backend generated from the structured result (Section 14).

Recommended pages:

1. Dashboard
2. Dataset
3. Model
4. Fairness
5. Mitigation
6. Explain

Workflow:

UPLOAD
→ VALIDATE
→ TRAIN
→ AUDIT
→ MITIGATE
→ COMPARE
→ EXPLAIN

Keep the interface simple and professional.

---

# 21. FAIRNESS PAGE

The fairness page should clearly show:

Protected Attribute

Reference Group

Advantaged Group / Disadvantaged Group

Group Comparison

Positive Prediction Rate

Disparate Impact

TPR Difference

FPR Difference

Status

Interpretation (the generated headline sentence from Section 14, naming the disadvantaged group and the magnitude)

Top proxy features (Section 9), where available, with the causal caveat shown alongside

Avoid overwhelming the user with unnecessary charts.

Use tables when exact values matter.

---

# 22. MITIGATION PAGE

Show:

Baseline
→ Mitigation Method
→ Learned Thresholds
→ Mitigated Result
→ Quantified Before/After Headline

Example:

Baseline DI: 0.65

Method: Threshold Adjustment

Learned thresholds:
Group A: 0.50
Group B: 0.43

Mitigated DI: 0.83

Performance trade-off:
Accuracy: 0.87 → 0.84

Headline (generated, not authored): "Disparate Impact improved from 0.65 to 0.83, crossing the fairness threshold, at a 0.03 accuracy-point cost."

Never display thresholds such as 0.50 for every group unless the algorithm actually produced them.

---

# 23. DATASET-SPECIFIC BEHAVIOR

The project may use datasets for:

- income,
- education,
- hiring,
- loan approval.

Do not assume all datasets have the same columns.

Create a reusable pipeline that adapts to:

- target column,
- protected attribute,
- numerical features,
- categorical features.

Do not hardcode dataset-specific column names throughout the application.

---

# 24. TESTING

Create tests for:

## Dataset tests

- valid dataset
- missing target
- missing protected attribute
- missing values
- constant columns
- invalid data types

## ML tests

- model training
- preprocessing
- prediction
- probability output

## Fairness tests

- group positive rates
- disparate impact
- TPR
- FPR
- reference group handling
- advantaged/disadvantaged group naming is correct given the computed rates

## Mitigation tests

Test at least:

1. Dataset where baseline fairness fails and mitigation improves it.
2. Dataset where baseline already passes and no mitigation is required.

## Report / narrative tests

- the generated headline, mitigation summary, and conclusion sentences are built from the current run's structured result (not fixed strings);
- running the pipeline on two datasets with different computed deltas must not produce byte-identical narrative sentences;
- a "no bias found" report includes every tested attribute's passing numbers, not just a one-line statement.

## XAI tests

- explanation generated
- contributions returned
- prediction and explanation refer to same sample
- group-level proxy-feature attribution (Section 9) is computed from actual per-group SHAP/importance values, not a fixed list

## API tests

- upload
- train
- audit
- mitigation
- prediction
- explanation

---

# 25. REPRODUCIBILITY

Where appropriate:

- use fixed random seeds,
- record model configuration,
- record preprocessing configuration,
- record dataset information,
- record selected protected attribute,
- record reference group,
- record thresholds,
- record mitigation method.

The same input and configuration should produce reproducible results where the underlying algorithm permits it.

---

# 26. PROJECT SIMPLICITY

This is a college major project.

Prefer:

correctness
>
explainability
>
maintainability
>
visual complexity.

Do not add unnecessary:

- microservices,
- databases,
- authentication systems,
- cloud infrastructure,
- complicated MLOps,
- unnecessary AI agents,
- unnecessary models,
- unnecessary charts.

The project should be easy to demonstrate and explain during a viva.

---

# 27. ERROR HANDLING

Never silently fail.

If something cannot be calculated, clearly explain why.

Examples:

"No positive class was detected."

"Protected attribute contains only one group."

"Disparate Impact cannot be calculated because the reference group has zero positive predictions."

"Mitigation could not find an acceptable threshold."

Do not replace missing results with zero.

Do not display fake success states.

---

# 28. CODE QUALITY

Follow existing project conventions where reasonable.

Use:

- type hints,
- clear function names,
- small reusable functions,
- meaningful variable names,
- validation,
- error handling,
- comments only where useful.

Avoid:

- giant functions,
- duplicated ML logic,
- hardcoded metrics,
- hardcoded thresholds,
- duplicated preprocessing,
- unnecessary abstractions.

---

# 29. FINAL VALIDATION BEFORE COMPLETING CHANGES

Before declaring a feature complete:

1. Run the relevant tests.
2. Verify the backend starts.
3. Verify API responses.
4. Verify frontend receives real backend data.
5. Verify baseline metrics are calculated.
6. Verify fairness metrics are calculated.
7. Verify mitigation actually changes predictions when appropriate.
8. Verify the no-mitigation case works, and that its report is complete (Section 12).
9. Verify XAI uses the actual prediction pipeline.
10. Verify narrative sentences differ meaningfully between two differently-scored datasets (Section 14).
11. Check for hardcoded ML values.
12. Check for data leakage.
13. Check for obvious PII/ID misuse.
14. Check frontend/backend field consistency.

If any result is suspicious, investigate the pipeline rather than masking the issue in the UI.

---

# 30. PRIORITY

When requirements conflict, use this priority:

1. Correct ML/fairness calculations
2. No data leakage
3. Reproducibility
4. Transparent, dataset-specific reporting (named groups, real deltas, non-templated narrative)
5. Simple architecture
6. API/frontend consistency
7. Testing
8. UI polish

Never sacrifice ML correctness to make the dashboard look better.

---

# 31. IMPORTANT FAIRNESS PRINCIPLE

Fairness metrics are measurements under a chosen definition of fairness.

A passing metric does not prove that a system is universally fair.

Use careful wording:

"Passes the selected fairness criterion."

rather than:

"The model has no bias."

The system should report evidence and metrics rather than make unsupported claims.