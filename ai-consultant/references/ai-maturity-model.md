# AI Maturity Model

Score each dimension 1-5 based on evidence gathered during discovery.

## Dimension 1: Data (Weight: 25%)

| Level | Score | Indicators |
| --- | --- | --- |
| Ad Hoc | 1 | Data in spreadsheets and personal drives. No catalog. No quality standards. Teams don't share data. |
| Managed | 2 | Central database exists but inconsistent quality. Some documentation. Manual ETL. Limited access controls. |
| Defined | 3 | Data warehouse or lake in place. Quality monitoring. Documented schemas. Role-based access. Regular audits. |
| Measured | 4 | Data governance program active. Data quality SLAs. Automated pipelines. Cross-team data sharing norms. Lineage tracking. |
| Optimized | 5 | Real-time data mesh or fabric. Self-service analytics. ML feature stores. Data products with SLAs. Continuous quality improvement. |

**Key questions:**
- Where does your most valuable data live today?
- How do teams currently access data for decision-making?
- What data quality issues have you encountered?
- Is there a data catalog or inventory?
- Who owns data governance?

## Dimension 2: Infrastructure (Weight: 20%)

| Level | Score | Indicators |
| --- | --- | --- |
| Legacy | 1 | On-prem only. No cloud. Monolithic applications. Manual deployments. No API layer. |
| Transitioning | 2 | Partial cloud migration. Some APIs. Basic CI/CD. Limited compute elasticity. |
| Cloud-Ready | 3 | Primary workloads in cloud. API-first architecture. Container orchestration. Scalable compute. |
| ML-Ready | 4 | MLOps pipeline exists. Model registry. Feature stores. GPU/TPU access. Experiment tracking. |
| AI-Native | 5 | Full MLOps maturity. Real-time inference. A/B testing infra. LLM serving infrastructure. Agent orchestration capability. |

**Key questions:**
- What's your cloud strategy and current cloud footprint?
- Do you have CI/CD pipelines?
- What does your API architecture look like?
- Have you deployed any ML models to production?
- What compute resources are available for AI workloads?
- What enterprise AI tools are already licensed (Copilot, Gemini, ChatGPT Enterprise, etc.) and what's the utilization rate?
- Is there shadow AI usage — employees using unapproved AI tools?

## Dimension 3: Talent (Weight: 20%)

| Level | Score | Indicators |
| --- | --- | --- |
| No AI Skills | 1 | No data scientists or ML engineers. Limited analytics capability. No AI training budget. |
| Emerging | 2 | 1-2 data scientists or analysts with ML exposure. Some interest in AI upskilling. Ad hoc learning. |
| Building | 3 | Dedicated data science team. Some ML engineering. AI training programs. External partnerships for capability gaps. |
| Established | 4 | Cross-functional AI teams. ML engineers, data engineers, AI product managers. Regular hiring pipeline. Internal AI community of practice. |
| Leading | 5 | AI center of excellence. Research capability. Publishing/speaking at conferences. Attracting top AI talent. Mentoring ecosystem. |

**Key questions:**
- How many people work on data science or ML today?
- What AI/ML tools and frameworks does your team use?
- Is there a training budget for AI skills?
- How do you currently hire for AI roles?
- Are any teams using GenAI tools (Copilot, ChatGPT, etc.) today?

## Dimension 4: Governance (Weight: 20%)

| Level | Score | Indicators |
| --- | --- | --- |
| None | 1 | No AI policy. No ethical guidelines. No model review process. No compliance consideration for AI. |
| Reactive | 2 | Policies created after incidents. Legal reviews AI on case-by-case basis. No standard approval process. |
| Proactive | 3 | AI use policy exists. Ethics review board or process. Model documentation requirements. Compliance playbook for AI. |
| Integrated | 4 | AI governance embedded in development lifecycle. Automated bias testing. Model monitoring and alerting. Regular audits. Clear escalation paths. |
| Advanced | 5 | Industry-leading AI governance. Public transparency reports. Third-party audits. Contributing to industry standards. Continuous policy evolution. |

**Key questions:**
- Do you have an AI use policy?
- How would a new AI project get approved today?
- Who is responsible for AI ethics and risk?
- What's your approach to bias detection and mitigation?
- How do you handle model monitoring and drift detection?

## Dimension 5: Culture (Weight: 15%)

| Level | Score | Indicators |
| --- | --- | --- |
| Resistant | 1 | Fear of AI replacing jobs. No exec interest. "We've always done it this way." Active resistance to automation. |
| Curious | 2 | Some interest but no action. Individuals experimenting. No organizational support. "AI is interesting but not for us yet." |
| Supportive | 3 | Executive sponsorship exists. Innovation encouraged. Pilot projects approved. Some tolerance for experimentation. |
| Embracing | 4 | AI on strategic roadmap. Data-driven decision culture. Cross-functional AI initiatives. Celebrating AI wins. Change management in place. |
| AI-First | 5 | AI considered for every new initiative. Innovation is core value. Rapid experimentation culture. Employees propose AI solutions. AI literacy widespread. |

**Key questions:**
- How does leadership talk about AI?
- Have there been any previous AI initiatives? What happened?
- How does the organization handle change and new technology?
- Are employees using AI tools independently?
- Is there an executive sponsor for AI?

## Scoring and Interpretation

### Aggregate Score Calculation

```
Aggregate = (Data * 0.25) + (Infrastructure * 0.20) + (Talent * 0.20) + (Governance * 0.20) + (Culture * 0.15)
```

### Engagement Approach by Score

| Score Range | Stage | Recommended Engagement |
| --- | --- | --- |
| 1.0 - 1.9 | Foundation | Data strategy, infrastructure planning, executive education. 6-12 month horizon before meaningful AI. Focus on data foundations and building the case. |
| 2.0 - 2.9 | Pilot-Ready | Identify 1-2 high-feasibility use cases. Proof of concept with clear success metrics. Build internal capability alongside. 3-6 month first value. |
| 3.0 - 3.9 | Scale-Ready | Operationalize existing efforts. Expand use cases. Build MLOps. Establish governance. Invest in talent pipeline. 1-3 month first value for new use cases. |
| 4.0 - 5.0 | Optimize | Advanced capabilities (GenAI, agents, real-time). Competitive differentiation. Industry leadership. Continuous improvement. Immediate start possible. |

### Dimension Gap Analysis

Look for dimensions that are 2+ levels below the aggregate. These are
bottlenecks that will block AI initiatives regardless of other strengths.

Common bottleneck patterns:
- **High talent, low data**: Smart team but nothing to work with. Fix data first.
- **High infrastructure, low governance**: Can deploy fast but will hit compliance walls. Build governance before scaling.
- **High culture, low talent**: Organization wants AI but can't execute. Hire or partner.
- **High data, low culture**: Has the assets but resistance prevents use. Executive sponsorship and change management needed.
