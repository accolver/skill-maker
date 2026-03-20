# Opportunity Matrix: TitanWorks

## Opportunity Scoring Summary

| # | Opportunity | Business Impact | Feasibility | Combined | Quadrant |
| --- | --- | --- | --- | --- | --- |
| 1 | Predictive Maintenance (instrumented equipment) | 5 | 4 | 9 | Quick Win |
| 2 | Maintenance Knowledge Base (GenAI) | 3 | 4 | 7 | Quick Win |
| 3 | Sensor Expansion + Extended Predictive Maintenance | 5 | 3 | 8 | Strategic Bet |
| 4 | Visual Quality Inspection (Computer Vision) | 4 | 2.5 | 6.5 | Strategic Bet |
| 5 | Demand Forecasting | 3.5 | 3 | 6.5 | Fill-in |
| 6 | Energy Optimization | 3 | 2.5 | 5.5 | Fill-in |
| 7 | Supply Chain Optimization | 4 | 2 | 6 | Strategic Bet |
| 8 | Digital Twin / Process Simulation | 4 | 1.5 | 5.5 | Deprioritize |

---

## Detailed Opportunity Assessments

### Opportunity 1: Predictive Maintenance (Instrumented Equipment)

**Quadrant: Quick Win — Do First**

**Business Impact: 5/5**
- Revenue/cost impact: $2M/month = $24M/year in unplanned downtime. Industry benchmarks show 30-50% reduction achievable. Conservative 25% reduction = **$6M/year savings**.
- Strategic alignment: Directly addresses the stated business problem and CFO's primary concern
- Scope: Affects all 4 factories, all production teams, maintenance teams, and supply chain
- Customer impact: Improved on-time delivery through reduced production disruptions

**Feasibility: 4/5**
- Data readiness: 40% of critical equipment already has sensors producing data. Data exists but needs pipeline to Azure.
- Technical complexity: Medium — predictive maintenance is a well-understood ML application with mature vendor solutions
- Integration: Requires OT-to-Azure data pipeline (the hardest part) and integration with CMMS/ERP for work order generation
- Organizational readiness: Plant managers are enthusiastic; the use case is intuitive for maintenance teams
- Time to first value: 60-90 days for pilot on a subset of instrumented equipment in one factory

**Build vs. Buy Analysis:**

| Factor | Build (Custom ML) | Buy (Commercial Platform) | Recommendation |
| --- | --- | --- | --- |
| Time to deploy | 6-12 months | 8-16 weeks | Buy |
| Internal skills required | Data scientists, ML engineers | IT integration, domain experts | Buy |
| Upfront cost | $300K-$600K | $80K-$200K (pilot) | Buy |
| Ongoing cost | $150K-$250K/year (team + infra) | $100K-$300K/year (license + support) | Comparable |
| Customization | Full control | Configurable, not fully custom | Buy is sufficient |
| Risk | High (team doesn't exist) | Low (proven platforms) | Buy |

**Recommendation: Buy.** Given zero internal data science capability and the urgency of the problem, a commercial predictive maintenance platform is the clear choice. Options in the Azure ecosystem include:

- **Azure IoT + Azure Machine Learning** (Microsoft native) — requires more configuration but tight Azure integration
- **Senseye (Siemens)** — purpose-built predictive maintenance, strong manufacturing focus
- **Augury** — machine health platform with vibration/temperature analytics, fast deployment
- **SparkCognition** — AI for industrial assets, supports multiple data types
- **Uptake** — asset analytics platform for industrial equipment

**GenAI vs. Traditional ML:** Traditional ML. Predictive maintenance uses time-series anomaly detection, survival analysis, and classification models. GenAI is not the right tool for this use case.

**Agent Potential:** Low for Phase 1. In Phase 3, an AI agent could potentially automate the workflow from anomaly detection through work order creation, parts ordering, and maintenance scheduling — but this requires a more mature foundation.

**Estimated Investment:** $150K-$250K (Phase 1 pilot, one factory, instrumented equipment)
**Estimated Annual Benefit:** $3M-$6M (25-50% of $12M attributable to instrumented equipment downtime, assuming instrumented equipment accounts for ~50% of total downtime)

---

### Opportunity 2: Maintenance Knowledge Base (GenAI)

**Quadrant: Quick Win — Do in Parallel with #1**

**Business Impact: 3/5**
- Addresses tribal knowledge risk and technician efficiency
- Reduces mean time to repair (MTTR) by providing instant access to equipment history, manuals, and troubleshooting guides
- Estimated 15-25% reduction in MTTR = $1.2M-$2M/year in reduced downtime duration
- Improves knowledge transfer to newer technicians

**Feasibility: 4/5**
- Data readiness: Equipment manuals, service bulletins, and work order history exist (though scattered)
- Technical complexity: Low-Medium — RAG (Retrieval Augmented Generation) over document corpus is a well-understood GenAI pattern
- Integration: Needs document ingestion, a search interface (mobile-friendly for factory floor), and connection to work order history
- Organizational readiness: Technicians would welcome a tool that helps them diagnose faster
- Time to first value: 30-60 days for an MVP with manuals and basic Q&A

**Build vs. Buy Analysis:**

| Factor | Build (Custom RAG) | Buy (Commercial Solution) | Recommendation |
| --- | --- | --- | --- |
| Time to deploy | 4-8 weeks | 2-4 weeks | Buy for MVP, customize later |
| Internal skills required | Some AI/prompt engineering | Configuration + content curation | Buy |
| Upfront cost | $50K-$100K | $30K-$60K | Buy |
| Ongoing cost | $20K-$40K/year | $30K-$80K/year | Build may be cheaper long-term |
| Customization | Full control over prompts and retrieval | Template-based | Buy is sufficient for Phase 1 |

**Recommendation: Buy initially, evaluate build for Phase 2.** Solutions like Microsoft Azure AI Search + Azure OpenAI Service, or commercial solutions like Guru, Shelf, or Moveworks could provide fast time-to-value. Since TitanWorks is on Azure, the Azure AI Search + OpenAI Service combination is natural.

**GenAI vs. Traditional ML:** GenAI. This is a natural language query and document retrieval use case where LLMs excel.

**Agent Potential:** High in Phase 2-3. A maintenance assistant agent could:
- Accept natural language descriptions of equipment symptoms
- Search historical work orders for similar failures
- Retrieve relevant manual sections and service bulletins
- Suggest troubleshooting steps ranked by probability
- Auto-generate work order drafts from diagnostic conclusions

**Estimated Investment:** $50K-$80K (Phase 1 MVP)
**Estimated Annual Benefit:** $1.2M-$2M (MTTR reduction) + non-quantifiable value (knowledge preservation, training acceleration)

---

### Opportunity 3: Sensor Expansion + Extended Predictive Maintenance

**Quadrant: Strategic Bet — Plan for Phase 2**

**Business Impact: 5/5**
- Extends predictive maintenance coverage from 40% to 80-90% of critical equipment
- Remaining 60% of un-instrumented equipment likely accounts for $12M/year in downtime (proportional estimate)
- 25-50% reduction on newly instrumented equipment = $3M-$6M additional annual savings
- Combined with Opportunity 1, total savings potential: $6M-$12M/year

**Feasibility: 3/5**
- Data readiness: Must create data — sensors need to collect 3-6 months of baseline data before models can detect anomalies effectively
- Technical complexity: Medium — sensor selection, installation, and calibration require industrial IoT expertise
- Integration: Extends the OT-to-Azure pipeline built in Phase 1
- Organizational readiness: If Phase 1 succeeds, enthusiasm will increase; if it fails, this is dead
- Time to first value: 6-9 months (3 months for installation + 3-6 months for data collection + model training)

**Build vs. Buy:**
- **Sensors:** Buy — standard industrial IoT sensors from vendors like Honeywell, Emerson, ABB, or IoT-focused vendors like Petasense, Fluke
- **Platform:** Extend the platform selected in Opportunity 1
- **Integration:** Mix of vendor services and internal IT implementation

**Estimated Investment:** $400K-$800K (sensors, installation, integration, model expansion)
**Estimated Annual Benefit:** $3M-$6M (additional downtime reduction on newly instrumented equipment)

---

### Opportunity 4: Visual Quality Inspection (Computer Vision)

**Quadrant: Strategic Bet — Evaluate in Phase 2, Implement in Phase 3**

**Business Impact: 4/5**
- Catches defects humans miss, operates 24/7, provides consistent quality
- Reduces scrap, rework, and customer returns
- Impact depends heavily on current defect rates and cost of quality issues (need data from discovery)
- Estimated $500K-$1.5M/year in quality cost reduction (highly variable by manufacturing type)

**Feasibility: 2.5/5**
- Data readiness: Requires labeled image datasets of good and defective products — this data likely does not exist today
- Technical complexity: Medium-High — computer vision models require careful training and validation
- Integration: Requires camera hardware on production lines, edge computing for real-time inference
- Organizational readiness: Quality teams must trust and adopt the system
- Time to first value: 6-12 months including data collection, labeling, and model training

**Build vs. Buy:**
- **Buy** recommended — vendors like Landing AI, Cognex ViDi, Keyence, or Instrumental provide platforms with faster deployment
- Custom build only justified if quality requirements are highly specialized

**GenAI vs. Traditional ML:** Traditional ML (computer vision / CNNs). GenAI is not the primary approach for visual inspection, though multimodal models are emerging in this space.

**Estimated Investment:** $200K-$500K per production line
**Estimated Annual Benefit:** $500K-$1.5M (depends on current quality costs)

---

### Opportunity 5: Demand Forecasting

**Quadrant: Fill-in — Phase 3 if Resources Allow**

**Business Impact: 3.5/5**
- Reduces inventory carrying costs (15-30% improvement typical)
- Improves production scheduling and capacity planning
- Better alignment of raw materials purchasing with actual demand
- Estimated $1M-$2M/year in inventory and scheduling optimization

**Feasibility: 3/5**
- Data readiness: Historical sales/order data exists in ERP; external demand signals (market data, economic indicators) would enhance forecasts
- Technical complexity: Medium — well-understood statistical/ML problem
- Integration: Connects to ERP planning modules
- Time to first value: 3-6 months

**Build vs. Buy:** Buy — ERP vendors often have demand forecasting modules (SAP IBP, Oracle Demand Management) or use specialized vendors (Blue Yonder, Kinaxis, o9 Solutions).

**Estimated Investment:** $100K-$300K
**Estimated Annual Benefit:** $1M-$2M

---

### Opportunity 6: Energy Optimization

**Quadrant: Fill-in — Phase 3**

**Business Impact: 3/5**
- Manufacturing energy costs are significant; 10-20% reduction is achievable with AI optimization
- Environmental/sustainability reporting benefits
- Estimated $300K-$800K/year savings depending on energy-intensity of operations

**Feasibility: 2.5/5**
- Requires energy metering data at equipment/process level (may not exist)
- Needs integration with building management and process control systems

**Estimated Investment:** $100K-$250K
**Estimated Annual Benefit:** $300K-$800K

---

### Opportunity 7: Supply Chain Optimization

**Quadrant: Strategic Bet — Phase 3**

**Business Impact: 4/5**
- Reduces lead times, improves supplier performance management, optimizes logistics
- Significant cost savings potential but requires broad data integration

**Feasibility: 2/5**
- Requires integration with supplier systems, logistics data, market data
- Complex multi-variable optimization
- Long implementation timeline

**Estimated Investment:** $300K-$700K
**Estimated Annual Benefit:** $1.5M-$3M

---

### Opportunity 8: Digital Twin / Process Simulation

**Quadrant: Deprioritize — Revisit at Maturity Level 3+**

**Business Impact: 4/5**
- Powerful for process optimization, new product introduction, and what-if analysis
- But requires a mature data foundation and modeling capability that TitanWorks does not have

**Feasibility: 1.5/5**
- Extremely data-intensive — requires comprehensive sensor coverage, process models, and calibration
- Needs specialized simulation engineering skills
- 12-24 month implementation timeline

**Recommendation:** This is a Phase 4+ capability. Deprioritize entirely until TitanWorks reaches maturity level 3.

---

## Impact-Feasibility Matrix

```
                        HIGH FEASIBILITY (4-5)          LOW FEASIBILITY (1-3)
                    ┌─────────────────────────┬─────────────────────────┐
                    │                         │                         │
   HIGH IMPACT      │   QUICK WINS            │   STRATEGIC BETS        │
   (4-5)            │                         │                         │
                    │   1. Predictive Maint.  │   3. Sensor Expansion   │
                    │      (Impact:5, Feas:4) │      (Impact:5, Feas:3) │
                    │                         │   4. Visual QC          │
                    │                         │      (Impact:4, Feas:2.5)│
                    │                         │   7. Supply Chain       │
                    │                         │      (Impact:4, Feas:2) │
                    ├─────────────────────────┼─────────────────────────┤
                    │                         │                         │
   LOW IMPACT       │   FILL-INS              │   DEPRIORITIZE          │
   (1-3)            │                         │                         │
                    │   2. Knowledge Base     │   8. Digital Twin       │
                    │      (Impact:3, Feas:4) │      (Impact:4, Feas:1.5)│
                    │   5. Demand Forecast    │   6. Energy Optim.      │
                    │      (Impact:3.5, Feas:3)│     (Impact:3, Feas:2.5)│
                    │                         │                         │
                    └─────────────────────────┴─────────────────────────┘
```

*Note: Opportunity 2 (Knowledge Base) is categorized as a Quick Win despite a lower impact score because its low cost and fast deployment make it an excellent companion to the primary predictive maintenance initiative. It addresses a different stakeholder need (technician efficiency) and demonstrates GenAI capability alongside the traditional ML approach.*

## Recommended Sequencing

1. **Phase 1 (Month 1-3):** Opportunity 1 (Predictive Maintenance pilot) + Opportunity 2 (Knowledge Base MVP)
2. **Phase 2 (Month 4-9):** Opportunity 3 (Sensor Expansion) + Opportunity 2 enhancement (Agent capabilities)
3. **Phase 3 (Month 9-18):** Opportunity 4 (Visual QC) + Opportunity 5 (Demand Forecasting)
4. **Phase 4 (Month 18+):** Opportunities 6, 7, 8 based on maturity progression and business priorities
