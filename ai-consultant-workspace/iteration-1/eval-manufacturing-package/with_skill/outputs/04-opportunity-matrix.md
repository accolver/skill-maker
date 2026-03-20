# Opportunity Matrix: TitanWorks

## Scoring Methodology

Each opportunity is scored on two axes (1-5):

**Business Impact:** Revenue potential/cost savings, strategic alignment, number of people/processes affected, customer experience improvement.

**Feasibility:** Data readiness, technical complexity, integration difficulty, organizational readiness (skills, change management), time to first value.

Combined score = Impact + Feasibility (max 10). Higher is better.

---

## Opportunity Map

### Opportunity 1: Predictive Maintenance (Sensor-Equipped Equipment)

| Attribute | Detail |
| --- | --- |
| Category | Traditional ML |
| Business Impact | **5** |
| Feasibility | **4** |
| Combined Score | **9** |
| Classification | **Quick Win** |
| Build vs Buy | **Buy** |
| GenAI vs Traditional ML | Traditional ML (time-series anomaly detection, remaining useful life prediction) |
| Agent Potential | Low — this is sensor data analysis, not workflow automation |

**Description:** Deploy a predictive maintenance platform on the 40% of critical equipment that already has sensors. The platform ingests vibration, temperature, pressure, and other sensor data to detect anomaly patterns indicative of impending failure. Alerts maintenance teams before failure occurs, enabling planned repairs during scheduled downtime windows.

**Impact Rationale (5/5):**
- Directly addresses the $24M/year unplanned downtime problem
- Even applied to only 40% of equipment, conservative 30% downtime reduction on that subset = $2.88M/year savings
- Strategic alignment: this is the stated business priority
- Affects all 4 factories, all maintenance teams, all production lines with instrumented equipment

**Feasibility Rationale (4/5):**
- Data exists — 40% of critical equipment has sensors already producing data
- Mature SaaS solutions exist (Azure IoT + partner solutions, Uptake, Samsara, SparkCognition, etc.)
- Azure is already in place — IoT Hub, Stream Analytics, and ML services are native
- Technical complexity is moderate — the platform vendor handles model training
- Deducted 1 point: data quality is unknown, integration with existing SCADA/historian requires assessment, and the IT team will need to manage a new platform

**Build vs Buy Analysis:**
- **Buy (Recommended):** SaaS predictive maintenance platforms cost $50K-$150K/year in licensing + $100K-$200K implementation. Time to first prediction: 60-90 days after data integration.
- **Build:** Custom ML pipeline on Azure ML would cost $250K-$500K in consulting, require 6-9 months to first prediction, and need ongoing data science talent to maintain.
- **Decision: Buy.** TitanWorks has zero data science talent. A build approach would require hiring 2-3 people who do not exist in the organization. The SaaS premium is justified by faster time-to-value and lower operational burden.

---

### Opportunity 2: Maintenance Knowledge Base (GenAI Assistant)

| Attribute | Detail |
| --- | --- |
| Category | GenAI |
| Business Impact | **3** |
| Feasibility | **4** |
| Combined Score | **7** |
| Classification | **Quick Win** |
| Build vs Buy | **Buy** |
| GenAI vs Traditional ML | GenAI (RAG over maintenance documents, equipment manuals, work order history) |
| Agent Potential | **Medium-High** — this could evolve into an autonomous diagnostic agent that walks technicians through troubleshooting |

**Description:** Deploy a GenAI-powered knowledge base that maintenance technicians can query in natural language. The system indexes equipment manuals, historical maintenance records, work order notes, and troubleshooting guides. Technicians ask "What should I check when pump 7B shows high vibration readings?" and get contextual answers drawn from TitanWorks' own maintenance history and OEM documentation.

**Impact Rationale (3/5):**
- Addresses knowledge loss risk — experienced technicians' expertise becomes searchable
- Reduces mean time to repair (MTTR) by providing faster diagnostic guidance
- Moderate direct cost savings — estimated 10-15% MTTR reduction = $200K-$400K/year
- High qualitative value: improves newer technician effectiveness, reduces dependency on tribal knowledge

**Feasibility Rationale (4/5):**
- Equipment manuals and ERP work order data exist and can be ingested into a RAG pipeline
- Several off-the-shelf platforms exist (Microsoft Copilot Studio, Azure OpenAI + AI Search, Atheer, Augmentir)
- Low integration complexity — primarily a knowledge retrieval tool, not a production system integration
- Frontline adoption risk: technicians must be willing to use a digital tool on the factory floor
- Deducted 1 point: quality of historical maintenance notes is likely variable (handwritten, abbreviated, inconsistent)

**Build vs Buy Analysis:**
- **Buy (Recommended):** Azure OpenAI Service + Azure AI Search for RAG. Platform cost: $2K-$5K/month. Implementation: $50K-$100K with consulting partner.
- **Build:** Similar technology stack but more customization. $75K-$150K in development. Not justified at this stage.
- **Decision: Buy** with light customization. Use Azure OpenAI + AI Search (already on Azure), ingest maintenance documents, and configure for the manufacturing domain.

---

### Opportunity 3: Sensor Expansion Program (Foundation for Scale)

| Attribute | Detail |
| --- | --- |
| Category | Infrastructure/IoT |
| Business Impact | **4** |
| Feasibility | **3** |
| Combined Score | **7** |
| Classification | **Strategic Investment** |
| Build vs Buy | N/A — this is hardware/infrastructure |
| GenAI vs Traditional ML | N/A — this is data collection, not AI |
| Agent Potential | None — this is infrastructure |

**Description:** Retrofit the remaining 60% of critical equipment with IoT sensors and connectivity. This is not an AI project per se but is the prerequisite for scaling predictive maintenance across all factories.

**Impact Rationale (4/5):**
- Unlocks the remaining 60% of downtime reduction potential — if 40% coverage yields $2.88M/year savings, full coverage could yield $7.2M+/year
- Enables quality monitoring, energy optimization, and other AI use cases that require sensor data
- Strategic foundation for all future manufacturing AI initiatives

**Feasibility Rationale (3/5):**
- Capital expenditure: $5K-$25K per machine depending on type, age, and required sensors. For potentially 100+ machines, this is $500K-$2.5M
- Requires OT expertise to select sensors, install without disrupting production, and validate data quality
- Timeline: 6-12 months across 4 factories — installation must be scheduled around production
- Need to coordinate between OT (factory floor) and IT (Azure IoT Hub) teams
- Deducted points: capital intensity, production disruption risk, and timeline

---

### Opportunity 4: Visual Quality Inspection (Computer Vision)

| Attribute | Detail |
| --- | --- |
| Category | Traditional ML (Computer Vision) |
| Business Impact | **4** |
| Feasibility | **2** |
| Combined Score | **6** |
| Classification | **Strategic Bet** |
| Build vs Buy | **Buy** (Cognex, Landing AI, Instrumental) |
| GenAI vs Traditional ML | Traditional ML (convolutional neural networks for defect detection) |
| Agent Potential | Low — this is perception, not decision-making |

**Description:** Deploy camera-based inspection systems on production lines to automatically detect defects in manufactured products. Systems run 24/7 with higher consistency than human inspectors.

**Impact Rationale (4/5):**
- Reduces quality escapes (defective products reaching customers), which carries direct cost (warranty, returns, rework) and indirect cost (reputation, customer satisfaction)
- Industry benchmarks: 20-40% reduction in defect escape rate
- Estimated value: depends on current defect rates and costs, but typically $500K-$2M/year for a manufacturer of TitanWorks' size

**Feasibility Rationale (2/5):**
- Requires line-specific camera installation and lighting — highly dependent on product type and line layout
- Training data collection: need thousands of labeled images of defective vs. good products
- Integration with production line PLCs for real-time reject/pass decisions
- No internal capability to manage computer vision projects
- Significant upfront investment per production line ($100K-$300K)
- Timeline: 6-12 months per production line for implementation and validation

---

### Opportunity 5: Demand Forecasting

| Attribute | Detail |
| --- | --- |
| Category | Traditional ML |
| Business Impact | **3** |
| Feasibility | **3** |
| Combined Score | **6** |
| Classification | **Fill-In** |
| Build vs Buy | **Buy** (ERP add-on or dedicated platform like Blue Yonder, o9) |
| GenAI vs Traditional ML | Traditional ML (time-series forecasting) |
| Agent Potential | Low |

**Description:** ML-based demand forecasting to improve production planning, reduce inventory costs, and prevent stockouts. Uses historical sales data, market signals, and seasonal patterns.

**Impact Rationale (3/5):**
- Industry benchmark: 15-30% reduction in inventory costs, improved on-time delivery
- For a $300M manufacturer, inventory optimization could save $2M-$5M/year
- Important but not the stated priority — management focus is on downtime, not demand planning

**Feasibility Rationale (3/5):**
- Historical sales/order data exists in ERP
- Mature solutions available as ERP modules or standalone platforms
- Requires clean demand history data and collaboration with sales/planning teams
- Medium implementation timeline: 3-6 months

---

### Opportunity 6: Energy Optimization

| Attribute | Detail |
| --- | --- |
| Category | Traditional ML |
| Business Impact | **2** |
| Feasibility | **3** |
| Combined Score | **5** |
| Classification | **Deprioritize (for now)** |
| Build vs Buy | Buy |
| GenAI vs Traditional ML | Traditional ML |
| Agent Potential | Low |

**Description:** Optimize energy consumption across 4 factories using ML-based analysis of production schedules, equipment usage patterns, and utility pricing.

**Impact Rationale (2/5):** Industry benchmark: 10-20% energy cost reduction. Meaningful for 4 factories but not strategically aligned with the stated downtime priority. Estimated $500K-$1M/year savings.

**Feasibility Rationale (3/5):** Requires energy metering at equipment level (may not exist), integration with production scheduling. Moderate complexity.

**Deprioritization Rationale:** Not aligned with the urgent priority ($24M/year downtime), lower impact, and requires additional sensor infrastructure that does not exist.

---

## Impact-Feasibility Matrix Summary

| | High Feasibility (4-5) | Medium Feasibility (3) | Low Feasibility (1-2) |
|---|---|---|---|
| **High Impact (4-5)** | **1. Predictive Maintenance (9)** | 3. Sensor Expansion (7) | 4. Visual Quality Inspection (6) |
| **Medium Impact (3)** | **2. Maintenance Knowledge Base (7)** | 5. Demand Forecasting (6) | |
| **Low Impact (1-2)** | | 6. Energy Optimization (5) | |

## Recommended Priority Order

1. **Predictive Maintenance** — Quick win. Directly addresses the $24M/year problem. Data exists. Mature platforms available. Start immediately.
2. **Maintenance Knowledge Base** — Quick win. Complements predictive maintenance by improving repair speed. Low risk, high qualitative value.
3. **Sensor Expansion** — Strategic investment. Unlocks scaling predictive maintenance to all equipment. Plan in Phase 1, execute in Phase 2.
4. **Visual Quality Inspection** — Strategic bet. High potential but requires significant infrastructure and expertise. Plan for Phase 3.
5. **Demand Forecasting** — Fill-in. Pursue when bandwidth allows, not the current strategic priority.
6. **Energy Optimization** — Deprioritize. Revisit after sensor expansion when data is available.
