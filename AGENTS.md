# FairLens Project Instructions

## Project

FairLens — AI Fairness & Model Auditing

This is a college major project focused on:
- ML model evaluation
- fairness auditing
- bias mitigation
- explainable AI
- transparent reporting

## Design hierarchy

Use these priorities:

1. Vercel Web Interface Guidelines
2. Linear-style information hierarchy and visual refinement
3. FairLens-specific requirements
4. Tailwind CSS
5. Reusable UI components

## Visual direction

Build a modern 2026 AI SaaS / developer-tool interface.

The UI should be:

- clean
- professional
- minimal
- responsive
- accessible
- data-focused
- typography-focused
- compact where appropriate
- visually calm
- easy to understand during a project demonstration

Avoid:

- old-style admin dashboards
- excessive cards
- excessive gradients
- glassmorphism
- rainbow colors
- decorative charts
- unnecessary animations
- giant headings
- excessive icons
- unnecessary UI elements
- fake dashboard statistics

## Product identity

Product name:

FairLens

Tagline:

AI Fairness & Model Auditing

FairLens should look like a professional AI/data product rather than a generic college project.

## ML integrity

NEVER hardcode:

- accuracy
- precision
- recall
- F1
- fairness metrics
- disparate impact
- thresholds
- prediction probabilities
- XAI values
- mitigation results

All values must come from the backend ML pipeline.

The frontend must never implement a second version of the ML logic.

## Architecture

Preferred flow:

Dataset
→ Validation
→ Preprocessing
→ Train/Validation/Test
→ Baseline Model
→ Performance
→ Fairness Audit
→ Mitigation
→ Before/After Comparison
→ XAI
→ FastAPI
→ Frontend

## Important

Inspect the existing implementation before modifying it.

Prefer fixing existing code over rebuilding working functionality.

Keep the project simple enough to explain clearly in a viva.

Do not add unnecessary technologies or dependencies.

Follow the fairness-audit skill whenever modifying ML, fairness, mitigation, prediction, XAI, or related API/frontend functionality.