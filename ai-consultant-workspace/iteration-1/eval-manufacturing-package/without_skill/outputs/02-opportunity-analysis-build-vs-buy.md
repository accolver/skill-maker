# TitanWorks: Opportunity Analysis & Build vs. Buy Evaluation

**Prepared for:** TitanWorks Executive Leadership Team
**Date:** March 2026
**Classification:** Confidential

---

## 1. Downtime Cost Decomposition

Before evaluating solutions, we must understand what the $2M/month actually consists of.

### Estimated Downtime Cost Breakdown

| Cost Category | Monthly Est. | Annual Est. | % of Total | Notes |
|---------------|-------------|-------------|------------|-------|
| **Lost production output** | $1,100,000 | $13,200,000 | 55% | Revenue loss from idle lines |
| **Expedited repairs & emergency parts** | $400,000 | $4,800,000 | 20% | Premium freight, after-hours labor |
| **Scrap & rework from restart** | $200,000 | $2,400,000 | 10% | Quality losses during startup |
| **Overtime labor** | $160,000 | $1,920,000 | 8% | Emergency maintenance crews |
| **Customer penalties / late delivery** | $100,000 | $1,200,000 | 5% | SLA violations, expedited shipping |
| **Cascading downstream delays** | $40,000 | $480,000 | 2% | Impact on other production lines |
| **Total** | **$2,000,000** | **$24,000,000** | **100%** | |

### Downtime Distribution by Factory (Estimated)

| Factory | % of Downtime Events | Monthly Cost | Key Equipment Types |
|---------|---------------------|--------------|-------------------|
| Factory 1 (Flagship) | 30% | $600,000 | CNC machines, hydraulic presses |
| Factory 2 | 25% | $500,000 | Assembly lines, conveyors |
| Factory 3 | 25% | $500,000 | Furnaces, heat treatment |
| Factory 4 (Newest) | 20% | $400,000 | Mixed, most instrumented |

### Root Cause Analysis of Unplanned Downtime (Industry-Adjusted Estimates)

| Failure Category | % of Events | Addressable by Predictive Maintenance? | Potential Reduction |
|-----------------|-------------|---------------------------------------|-------------------|
| Bearing failures | 22% | Yes - vibration monitoring | 70-80% |
| Motor/drive failures | 18% | Yes - current/thermal monitoring | 60-70% |
| Hydraulic system failures | 15% | Yes - pressure/temp/particle monitoring | 65-75% |
| Electrical/control failures | 12% | Partially - anomaly detection | 40-50% |
| Wear-related failures | 10% | Yes - usage tracking + models | 60-70% |
| Lubrication failures | 8% | Yes - oil analysis + auto-scheduling | 80-90% |
| Operator error | 8% | Partially - anomaly detection | 20-30% |
| External factors (power, supply) | 5% | No | 0-10% |
| Unknown/undocumented | 2% | Requires investigation | N/A |

**Key Finding:** Approximately 73% of unplanned downtime events are addressable through condition-based or predictive monitoring, representing up to $17.5M/year in reducible costs.

---

## 2. Solution Landscape Assessment

### Solution Categories for Predictive Maintenance

| Category | Examples | Strengths | Weaknesses | Fit for TitanWorks |
|----------|----------|-----------|------------|-------------------|
| **Enterprise APM Suites** | IBM Maximo, SAP PM, Infor EAM | Full lifecycle asset management, ERP integration | Expensive, long implementation, may be overkill | Medium |
| **IIoT Platforms** | PTC ThingWorx, Siemens MindSphere, GE Predix | Purpose-built for manufacturing, rich OT connectivity | Vendor lock-in, expensive, complex | Low-Medium |
| **Cloud-Native PdM** | Azure IoT + ML, AWS IoT SiteWise | Leverages existing Azure investment, flexible | Requires significant build effort, needs data science skills | Medium (with partners) |
| **Specialized PdM SaaS** | Augury, Samsara, Uptake, Fiix | Fast deployment, ML included, managed service | Less customizable, per-asset pricing adds up | High |
| **Condition Monitoring Vendors** | SKF, Emerson, Honeywell | Hardware + software bundles, deep domain expertise | Proprietary ecosystems, expensive sensors | Medium-High |

---

## 3. Build vs. Buy Analysis

### Option A: Build on Azure (Custom Development)

**Approach:** Use Azure IoT Hub, Stream Analytics, Azure Data Lake, Azure ML to build a custom predictive maintenance platform.

| Dimension | Assessment |
|-----------|-----------|
| **Architecture** | IoT Hub -> Stream Analytics -> Data Lake -> Azure ML -> Power BI dashboards |
| **Sensor Integration** | Azure IoT Edge devices at each factory, custom connectors per protocol |
| **Analytics** | Custom ML models trained on TitanWorks-specific equipment data |
| **Timeline** | 18-24 months to first predictive capability on initial equipment |
| **Team Required** | 2 IoT engineers, 2 data scientists, 1 data engineer, 1 ML ops engineer (6 FTEs) |

**Cost Estimate - Build:**

| Cost Item | Year 1 | Year 2 | Year 3 | 3-Year Total |
|-----------|--------|--------|--------|-------------|
| Azure IoT/ML services | $180,000 | $240,000 | $300,000 | $720,000 |
| New hires (6 FTEs @ avg $130K) | $780,000 | $780,000 | $780,000 | $2,340,000 |
| Additional sensors + edge hardware | $600,000 | $400,000 | $200,000 | $1,200,000 |
| Systems integration consulting | $500,000 | $300,000 | $100,000 | $900,000 |
| Training & change management | $100,000 | $75,000 | $50,000 | $225,000 |
| Project management | $200,000 | $150,000 | $100,000 | $450,000 |
| **Total** | **$2,360,000** | **$1,945,000** | **$1,530,000** | **$5,835,000** |

**Build Risks:**
- **Critical:** Cannot hire 6 specialized FTEs in a reasonable timeframe (competitive market)
- **Critical:** 18-24 months before any predictive capability means no ROI for 2 years
- **High:** Custom models require 6-12 months of data collection before they produce useful predictions
- **High:** IT team has zero IoT/data science experience; steep learning curve
- **Medium:** Ongoing model maintenance and retraining burden falls on internal team

### Option B: Buy - Specialized PdM SaaS Platform

**Approach:** Deploy a managed predictive maintenance SaaS solution (e.g., Augury, Uptake, or Samsara) with vendor-provided sensors and pre-built ML models.

| Dimension | Assessment |
|-----------|-----------|
| **Architecture** | Vendor sensors -> Vendor cloud -> API integration to Azure/ERP |
| **Sensor Integration** | Vendor provides pre-configured sensors with wireless connectivity |
| **Analytics** | Pre-trained ML models with fleet learning across hundreds of customers |
| **Timeline** | 3-6 months to first alerts on initial equipment set |
| **Team Required** | 1 internal project lead, vendor professional services |

**Cost Estimate - Buy:**

| Cost Item | Year 1 | Year 2 | Year 3 | 3-Year Total |
|-----------|--------|--------|--------|-------------|
| SaaS platform license | $360,000 | $480,000 | $600,000 | $1,440,000 |
| Vendor sensors + installation | $500,000 | $350,000 | $150,000 | $1,000,000 |
| Integration to Azure/ERP | $200,000 | $75,000 | $50,000 | $325,000 |
| Vendor professional services | $250,000 | $100,000 | $50,000 | $400,000 |
| Internal project lead (1 FTE) | $140,000 | $140,000 | $140,000 | $420,000 |
| Training & change management | $80,000 | $40,000 | $30,000 | $150,000 |
| **Total** | **$1,530,000** | **$1,185,000** | **$1,020,000** | **$3,735,000** |

**Buy Risks:**
- **Medium:** Vendor lock-in; switching costs increase over time
- **Medium:** Per-asset pricing means costs scale linearly with coverage expansion
- **Low:** Less customization; may not perfectly fit all equipment types
- **Low:** Vendor viability risk (mitigated by choosing established player)

### Option C: Hybrid - Buy Platform + Build Integration Layer

**Approach:** Use a SaaS PdM platform for analytics and alerting, but build the Azure integration layer, data lake, and custom dashboards internally.

| Dimension | Assessment |
|-----------|-----------|
| **Architecture** | Vendor PdM + Azure Data Lake + custom Power BI + ERP integration |
| **Sensor Integration** | Mix of vendor sensors and existing sensors via Azure IoT Edge |
| **Analytics** | Vendor ML models for standard failure modes + custom models for unique equipment |
| **Timeline** | 4-8 months to first capability; custom extensions at 12-18 months |
| **Team Required** | 1 IoT/data engineer, 1 project lead, vendor support |

**Cost Estimate - Hybrid:**

| Cost Item | Year 1 | Year 2 | Year 3 | 3-Year Total |
|-----------|--------|--------|--------|-------------|
| SaaS platform license | $300,000 | $400,000 | $480,000 | $1,180,000 |
| Vendor sensors + installation | $400,000 | $300,000 | $150,000 | $850,000 |
| Azure IoT/data services | $100,000 | $150,000 | $180,000 | $430,000 |
| Integration development | $300,000 | $150,000 | $75,000 | $525,000 |
| New hires (2 FTEs) | $260,000 | $260,000 | $260,000 | $780,000 |
| Training & change management | $100,000 | $60,000 | $40,000 | $200,000 |
| **Total** | **$1,460,000** | **$1,320,000** | **$1,185,000** | **$3,965,000** |

---

## 4. Comparative Decision Matrix

| Criteria (Weight) | Build | Buy | Hybrid |
|-------------------|-------|-----|--------|
| **Time to first value** (25%) | 18-24 months (1/5) | 3-6 months (5/5) | 4-8 months (4/5) |
| **3-year TCO** (20%) | $5.84M (2/5) | $3.74M (4/5) | $3.97M (3/5) |
| **Hiring risk** (15%) | 6 FTEs needed (1/5) | 1 FTE needed (5/5) | 2 FTEs needed (4/5) |
| **Customizability** (10%) | Unlimited (5/5) | Limited (2/5) | High (4/5) |
| **Internal capability building** (10%) | High (5/5) | Low (1/5) | Medium (3/5) |
| **Long-term flexibility** (10%) | Full ownership (5/5) | Vendor dependent (2/5) | Balanced (4/5) |
| **Implementation risk** (10%) | Very high (1/5) | Low (4/5) | Medium (3/5) |
| **Weighted Score** | **2.25** | **3.75** | **3.55** |

---

## 5. Recommendation

### Primary Recommendation: Buy (Option B) for the First 12 Months, Transition to Hybrid (Option C) in Year 2

**Rationale:**

1. **Speed to value is paramount.** Given the failed transformation history, TitanWorks needs visible results in 90 days, not 18 months. A SaaS platform delivers alerts and dashboards within weeks of sensor installation.

2. **The skills gap is insurmountable in the near term.** Hiring 6 specialized FTEs takes 6-9 months in the current market and carries significant risk. Starting with Buy eliminates this blocker.

3. **The CFO needs ROI evidence, not promises.** A Buy approach can demonstrate measurable downtime reduction within Q1, providing the hard numbers the CFO requires before approving larger investments.

4. **Hybrid transition preserves long-term optionality.** Starting with Buy does not preclude building internal capability. By Year 2, TitanWorks will have data, experience, and credibility to hire 2 data-oriented FTEs and begin building custom extensions.

**Recommended Vendor Evaluation Shortlist:**
- **Augury** - Strong in rotating equipment, vibration-based, SaaS model
- **Samsara** - Broad IIoT platform, good for mixed equipment types
- **Uptake** - Industrial AI focused, strong in heavy manufacturing
- **SKF Enlight** - Best-in-class bearing/rotating equipment, hardware+software bundle

### Vendor Selection Criteria

| Criterion | Weight | Must-Have Threshold |
|-----------|--------|-------------------|
| Pre-trained models for manufacturing equipment | 20% | Yes |
| Azure integration capability (API/data export) | 15% | Yes |
| Time to first operational alerts | 15% | < 90 days |
| Mobile-friendly interface for technicians | 10% | Yes |
| Pricing transparency and scalability | 10% | Per-asset pricing with volume discounts |
| Customer references in similar manufacturing | 10% | >= 3 references |
| ERP integration (work order generation) | 10% | API available |
| Data portability (can export raw data) | 10% | Yes |

---

## 6. Opportunity Sizing by Equipment Category

| Equipment Category | Est. Units Across 4 Factories | Current Sensor Coverage | Priority | Est. Annual Savings if Monitored |
|-------------------|-------------------------------|------------------------|----------|--------------------------------|
| CNC Machines | 60-80 | 50% | High | $3.2M |
| Hydraulic Presses | 30-40 | 35% | High | $2.8M |
| Conveyor Systems | 100+ | 25% | Medium | $2.1M |
| HVAC/Compressors | 40-60 | 60% | Medium | $1.4M |
| Pumps & Motors | 150+ | 40% | High | $3.8M |
| Furnaces/Ovens | 20-30 | 30% | High | $2.4M |
| Packaging Lines | 40-50 | 45% | Low | $0.8M |

**Note:** Savings estimates assume 30-40% reduction in unplanned downtime for monitored equipment, phased over 18 months.

---

*This analysis directly informs the 3-Tier Proposal and Roadmap that follow.*
