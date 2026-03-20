# Company Briefing: TitanWorks

## Company Overview

| Attribute | Detail |
| --- | --- |
| Company Name | TitanWorks |
| Industry | Manufacturing |
| Employees | 2,000 |
| Annual Revenue | $300M |
| Facilities | 4 factories |
| Cloud Platform | Microsoft Azure (migrated ~6 months ago) |
| IT Team | 25 people (enterprise IT — ERP, networking; zero data science) |

## Current Situation

TitanWorks is experiencing significant unplanned downtime across its 4 factories, costing approximately **$2M/month ($24M/year)** in lost production, emergency repairs, and downstream impacts. Approximately 40% of critical equipment has sensor instrumentation; the remaining 60% relies on manual monitoring (visual inspections, scheduled rounds, operator judgment).

The company completed a migration to Microsoft Azure 6 months ago, establishing a cloud foundation but without any AI/ML workloads or advanced analytics.

## Likely Pain Points (Based on Industry Patterns)

1. **Unplanned equipment downtime** — confirmed at $2M/month; this is the primary driver for the engagement
2. **Reactive maintenance culture** — manual monitoring on 60% of critical assets suggests run-to-failure or time-based maintenance rather than condition-based
3. **Limited visibility into equipment health** — partial sensor coverage creates blind spots
4. **Knowledge concentration risk** — experienced maintenance technicians likely hold undocumented tribal knowledge about equipment behavior
5. **Quality variability** — equipment-related quality issues are common in partially monitored environments
6. **Supply chain and demand volatility** — standard manufacturing challenge, likely compounded by production unpredictability from unplanned downtime

## Known or Suspected AI Tools in Use

- **Microsoft Azure** — migrated 6 months ago; likely includes Azure Active Directory, some Azure services
- **Enterprise AI licensing** — unknown but Azure migration may include Microsoft 365 Copilot licenses or Azure AI services as part of enterprise agreement; needs verification
- **Shadow AI** — probable individual use of ChatGPT or similar by office workers; unconfirmed
- **Utilization estimate** — likely low to zero on any AI-specific tooling given zero data science capability

## Competitor AI Initiatives (Industry Context)

Manufacturing is in an active AI adoption wave:
- Major manufacturers (Siemens, GE, Bosch) have mature predictive maintenance programs reporting 30-50% downtime reduction
- Mid-market manufacturers are increasingly adopting cloud-based predictive maintenance platforms (Uptake, Augury, SparkCognition, Azure IoT + ML)
- Visual inspection AI (Cognex, Landing AI) is becoming standard in quality control
- GenAI for maintenance documentation and technician assistance is emerging

## Regulatory Considerations

- **OSHA** — workplace safety regulations; AI monitoring safety-critical systems needs fail-safe design
- **EPA** — environmental compliance for manufacturing processes
- **Industry-specific standards** — depending on product type (automotive, aerospace, food), additional quality and safety certifications may apply (ISO 9001, AS9100, etc.)
- **No high-barrier AI-specific regulations** — manufacturing is not a heavily regulated vertical for AI compared to healthcare or finance

## Organizational Context — Critical

- **Previous digital transformation failure**: An initiative 18 months ago was "considered a failure" and the project lead subsequently left the company. This creates organizational scar tissue that must be addressed directly.
- **CFO skepticism**: The CFO requires hard ROI numbers before committing. This is both a red flag (budget resistance) and a positive signal (data-driven decision making).
- **Plant manager enthusiasm**: Operational leadership wants this, providing bottom-up pull — a strong adoption signal.
- **Talent gap**: Zero data science capability means any initiative requires external execution or significant hiring.

## Preliminary Hypotheses

1. **Predictive maintenance is the obvious quick win** — $24M/year in unplanned downtime with 40% sensor coverage already in place means there's data to work with immediately
2. **Sensor expansion is a prerequisite for scale** — the 60% gap in monitoring will need to be addressed for comprehensive coverage
3. **Buy over build** — with zero data science staff, SaaS/platform solutions for predictive maintenance are strongly favored over custom ML development
4. **Change management is non-negotiable** — the failed digital transformation means extra investment in stakeholder alignment, communication, and visible quick wins
5. **GenAI for maintenance knowledge capture** — technician knowledge base could address tribal knowledge risk and provide immediate visible value
6. **Azure ecosystem alignment** — given the recent Azure migration, Azure IoT Hub, Azure Machine Learning, and Azure AI services should be the starting point for build options
