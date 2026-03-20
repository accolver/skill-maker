# Company Briefing: TitanWorks

## Company Overview

| Attribute | Detail |
| --- | --- |
| Company | TitanWorks |
| Industry | Manufacturing |
| Employees | ~2,000 |
| Annual Revenue | $300M |
| Facilities | 4 factories |
| Cloud Platform | Microsoft Azure (migrated ~6 months ago) |
| IT Team | 25 people (enterprise IT: ERP, networking) |
| AI/Data Science Capability | None |

## Current Situation

TitanWorks is a mid-market manufacturer experiencing significant unplanned downtime across its four factories, costing approximately **$2M per month ($24M/year)**. This represents roughly 8% of annual revenue being lost to preventable equipment failures.

Approximately 40% of critical equipment has sensors installed; the remaining 60% relies on manual monitoring (visual inspections, time-based maintenance schedules, operator judgment).

## Known Technology Landscape

- **Cloud**: Recently migrated to Microsoft Azure (6 months). Migration maturity is early; the team is still stabilizing.
- **ERP**: Enterprise resource planning system in place (likely SAP or similar, given company size).
- **IT Team**: 25 enterprise IT professionals focused on ERP administration, networking, and infrastructure. Zero data science, ML engineering, or analytics engineering capability.
- **Sensor Coverage**: 40% of critical equipment instrumented. Sensor data likely flowing into historian databases or local SCADA systems.
- **Enterprise AI Tools**: Unknown. Given recent Azure migration, there may be bundled Azure AI services or Copilot licenses that are unactivated or underutilized. This requires investigation.

## Likely Pain Points (Industry Pattern Matching)

Based on manufacturing industry patterns for a company of this size:

1. **Unplanned downtime** (confirmed): $2M/month cost, likely from reactive maintenance on aging equipment
2. **Manual quality inspection**: Visual inspection processes prone to fatigue and inconsistency
3. **Demand forecasting**: Inventory overstock/understock driven by spreadsheet-based planning
4. **Maintenance knowledge loss**: Tribal knowledge held by experienced technicians approaching retirement
5. **Energy costs**: No optimization of energy consumption across four facilities
6. **Supply chain disruption**: Manual monitoring of supplier performance and lead times

## Competitive AI Landscape (Manufacturing Sector)

Manufacturing is one of the most active sectors for industrial AI adoption:

- **Predictive maintenance** is the most common first use case (Siemens, GE, Honeywell all offer solutions)
- **Computer vision for quality control** is rapidly maturing with off-the-shelf solutions
- **Azure-specific**: Microsoft offers Azure IoT Hub, Azure Digital Twins, and Azure Machine Learning with manufacturing templates. Their Azure migration positions them well for these tools.
- **Key vendors**: Uptake, Augury, Samsara, PTC ThingWorx, Siemens MindSphere

## Regulatory Considerations

- **OSHA**: Safety monitoring AI must comply with workplace safety regulations
- **ISO 9001 / IATF 16949**: Quality management system requirements may apply depending on their customer base (automotive, aerospace)
- **Environmental regulations**: Energy optimization and emissions monitoring may have reporting requirements
- **No HIPAA/SOX/PCI concerns** for core manufacturing operations

## Political and Organizational Context

**Critical context**: A previous "digital transformation" initiative 18 months ago was considered a failure. The project lead has since left the company. This creates:

- Residual skepticism, especially from finance (CFO wants hard ROI numbers)
- Potential political landmines around who was blamed for the failure
- Need to explicitly differentiate this engagement from the previous failed initiative
- Opportunity to diagnose what went wrong and avoid repeating mistakes

**Stakeholder dynamics**:
- **Plant managers**: Enthusiastic about AI/automation (positive signal)
- **CFO**: Skeptical, demanding hard ROI numbers before commitment (gatekeeper)
- **Previous project lead**: Departed (unresolved organizational trauma)

## Preliminary Hypotheses

1. **Predictive maintenance** is the obvious quick win given the $2M/month downtime cost. Even a 20% reduction justifies significant investment.
2. **Sensor gap** (60% unmonitored) is both a blocker and an opportunity. Phase 1 can work with existing 40% sensor coverage; Phase 2 expands coverage.
3. **Azure platform** creates a natural fit for Azure IoT + Azure ML stack. No multi-cloud complexity.
4. **Talent gap** is the biggest bottleneck. Zero data science capability means heavy reliance on vendor solutions, managed services, or consulting support initially.
5. **The failed digital transformation** must be addressed head-on. Understanding why it failed is essential to designing an engagement that succeeds.
6. **CFO alignment** is critical path. The proposal must lead with conservative financial projections and sensitivity analysis.
