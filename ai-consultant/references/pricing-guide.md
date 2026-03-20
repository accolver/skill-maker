# AI Project Effort Estimation Guide

Rough order-of-magnitude effort estimates for common AI project types, expressed
in Staff-level AI Engineer hours. Use for initial scoping conversations — always
refine based on specific client requirements, team experience, and technical
complexity.

Estimates assume a Staff-level AI Engineer (8+ years experience, capable of
end-to-end delivery including architecture, implementation, and deployment).
Adjust up for less experienced teams or down for teams with existing
infrastructure and reusable components.

## Engagement Types

### Discovery & Strategy

| Engagement | Duration | Staff Engineer Hours | Deliverables |
| --- | --- | --- | --- |
| AI Readiness Assessment | 2-4 weeks | 80-160 hrs | Maturity assessment, opportunity map, roadmap |
| AI Strategy Development | 4-8 weeks | 200-400 hrs | Full strategy, business cases, implementation plan |
| Use Case Prioritization | 1-2 weeks | 40-80 hrs | Scored opportunity matrix, top 3 business cases |
| Vendor/Platform Selection | 2-4 weeks | 80-200 hrs | Evaluation criteria, vendor comparison, recommendation |

### Proof of Concept / Pilot

| Project Type | Duration | Staff Engineer Hours | What's Included |
| --- | --- | --- | --- |
| GenAI Chatbot/Assistant (pilot) | 4-8 weeks | 160-400 hrs | RAG pipeline, basic UI, evaluation, handoff docs |
| Document Processing Pipeline | 4-8 weeks | 200-480 hrs | Extraction model, validation workflow, integration spec |
| Predictive Model (single use case) | 6-12 weeks | 240-600 hrs | Data prep, model training, evaluation, deployment plan |
| AI Agent (single workflow) | 6-10 weeks | 200-500 hrs | Agent design, tool integration, testing, monitoring |

### Production Implementation

| Project Type | Duration | Staff Engineer Hours | What's Included |
| --- | --- | --- | --- |
| GenAI Application (production) | 3-6 months | 600-1,500 hrs | Full app, RAG, guardrails, monitoring, ops |
| ML Platform / MLOps Setup | 3-6 months | 800-2,000 hrs | Pipeline, registry, serving, monitoring, governance |
| Multi-Agent System | 4-8 months | 1,000-2,500 hrs | Agent design, orchestration, testing, monitoring, ops |
| Enterprise AI Platform | 6-12 months | 2,000-5,000+ hrs | Platform, multiple use cases, governance, training |

### Ongoing / Retainer

| Service | Cadence | Staff Engineer Hours | What's Included |
| --- | --- | --- | --- |
| AI Advisory Retainer | Monthly | 20-60 hrs/month | Strategic guidance, quarterly reviews, ad hoc advice |
| Model Monitoring & Optimization | Monthly | 10-40 hrs/month | Performance monitoring, retraining, drift detection |
| AI CoE Support | Monthly | 40-100 hrs/month | Capability building, governance, project oversight |

## Estimation Multipliers

Adjust base hours using these multipliers for common complexity factors:

| Factor | Multiplier | When to Apply |
| --- | --- | --- |
| Regulated industry (HIPAA, SOX, PCI) | 1.3-1.5x | Compliance documentation, audit trails, approval gates |
| Legacy system integration | 1.2-1.5x | No APIs, proprietary formats, vendor dependencies |
| Multi-language/region deployment | 1.2-1.4x | i18n, data residency, regional compliance |
| First AI project for the org | 1.3-1.5x | Extra time for education, change management, governance setup |
| Existing MLOps/AI platform | 0.7-0.8x | Reusable infrastructure reduces build effort |
| Underutilized enterprise AI licenses | 0.5-0.7x | Configuring existing tools (Copilot, Gemini, etc.) vs building custom |

## Engagement Structure Tips

- **Phase the engagement**: Break large efforts into phases with go/no-go
  decisions. Reduces risk for both sides and allows scope refinement.
- **Include options**: Present 3 tiers (essential, recommended, comprehensive).
  Most clients pick the middle option.
- **Build vs buy comparison**: If a SaaS tool or existing enterprise license can
  cover 80% of the need, the hours to configure it are a fraction of custom
  build. Always check what the client already has before scoping new work.
- **Account for non-engineering work**: Discovery, stakeholder alignment, change
  management, and training often add 20-30% on top of engineering hours.
- **Team composition matters**: A Staff engineer working solo may take 400 hours.
  A team of 3 mid-level engineers might take 500 total hours but finish in
  half the calendar time. Factor in coordination overhead for larger teams.
