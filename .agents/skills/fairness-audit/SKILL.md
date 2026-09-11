---
name: fairness-audit
description: Specialized skill for the FairLens AI Fairness and Model Auditing project. Use when working on dataset validation, preprocessing, model training, performance evaluation, protected attributes, fairness metrics, bias detection, bias mitigation, threshold optimization, XAI, prediction APIs, fairness reports, or related frontend displays.
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
6. applies appropriate bias mitigation,
7. compares baseline and mitigated results,
8. explains individual predictions using XAI,
9. exposes results through APIs,
10. displays backend results in the frontend.

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

# 9. REFERENCE GROUP

Reference groups must be explicit.

Do not silently choose an arbitrary group.

If a reference group is not specified, choose a reasonable default only when the project design requires it and clearly display the selected reference group.

Example:

Protected attribute: Gender
Reference group: Male

Comparison groups:
- Female
- Non-binary

---

# 10. BIAS MITIGATION

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

---

# 11. WHEN BASELINE ALREADY PASSES

This is extremely important.

If baseline fairness already satisfies the selected fairness criterion, do NOT artificially change the model just to show an improvement.

Correct result:

"Baseline already satisfies the selected fairness criterion. No mitigation was required."

The before and after metrics may legitimately be identical.

The UI must explain why.

Never fake an improvement.

---

# 12. BEFORE / AFTER COMPARISON

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

---

# 13. MITIGATION TRADE-OFF

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

# 14. XAI / EXPLAINABILITY

XAI explains why a model produced an individual prediction.

It does NOT automatically determine whether a feature is biased.

For example:

Annual Income: +0.20
Loan Purpose: -0.08

A negative contribution means that the feature pushed this particular prediction toward the negative class.

It does NOT mean:

"Loan Purpose is biased."

Fairness is evaluated using group-level statistics.

XAI and fairness analysis must remain conceptually separate.

---

# 15. XAI IMPLEMENTATION

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

# 16. INDIVIDUAL PREDICTION

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

# 17. API RULES

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

# 18. FRONTEND RULES

The frontend must display backend-generated results.

Never hardcode demonstration values in production UI.

Do not calculate fairness metrics independently in React.

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

# 19. FAIRNESS PAGE

The fairness page should clearly show:

Protected Attribute

Reference Group

Group Comparison

Positive Prediction Rate

Disparate Impact

TPR Difference

FPR Difference

Status

Interpretation

Avoid overwhelming the user with unnecessary charts.

Use tables when exact values matter.

---

# 20. MITIGATION PAGE

Show:

Baseline
→ Mitigation Method
→ Learned Thresholds
→ Mitigated Result

Example:

Baseline DI: 0.65

Method: Threshold Adjustment

Learned thresholds:
Group A: 0.50
Group B: 0.43

Mitigated DI: 0.83

Performance trade-off:
Accuracy: 0.87 → 0.84

Never display thresholds such as 0.50 for every group unless the algorithm actually produced them.

---

# 21. DATASET-SPECIFIC BEHAVIOR

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

# 22. TESTING

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

## Mitigation tests

Test at least:

1. Dataset where baseline fairness fails and mitigation improves it.
2. Dataset where baseline already passes and no mitigation is required.

## XAI tests

- explanation generated
- contributions returned
- prediction and explanation refer to same sample

## API tests

- upload
- train
- audit
- mitigation
- prediction
- explanation

---

# 23. REPRODUCIBILITY

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

# 24. PROJECT SIMPLICITY

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

# 25. ERROR HANDLING

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

# 26. CODE QUALITY

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

# 27. FINAL VALIDATION BEFORE COMPLETING CHANGES

Before declaring a feature complete:

1. Run the relevant tests.
2. Verify the backend starts.
3. Verify API responses.
4. Verify frontend receives real backend data.
5. Verify baseline metrics are calculated.
6. Verify fairness metrics are calculated.
7. Verify mitigation actually changes predictions when appropriate.
8. Verify the no-mitigation case works.
9. Verify XAI uses the actual prediction pipeline.
10. Check for hardcoded ML values.
11. Check for data leakage.
12. Check for obvious PII/ID misuse.
13. Check frontend/backend field consistency.

If any result is suspicious, investigate the pipeline rather than masking the issue in the UI.

---

# 28. PRIORITY

When requirements conflict, use this priority:

1. Correct ML/fairness calculations
2. No data leakage
3. Reproducibility
4. Transparent reporting
5. Simple architecture
6. API/frontend consistency
7. Testing
8. UI polish

Never sacrifice ML correctness to make the dashboard look better.

---

# 29. IMPORTANT FAIRNESS PRINCIPLE

Fairness metrics are measurements under a chosen definition of fairness.

A passing metric does not prove that a system is universally fair.

Use careful wording:

"Passes the selected fairness criterion."

rather than:

"The model has no bias."

The system should report evidence and metrics rather than make unsupported claims.