# Opportunity Matrix: TitanWorks

## Scoring Methodology

Each opportunity scored on two axes (1-5):

**Business Impact**: Revenue potential/cost savings, strategic alignment, number of people/processes affected, customer experience improvement.

**Feasibility**: Data readiness, technical complexity, integration difficulty, organizational readiness, time to first value.

---

## Opportunity Scores

### Opportunity 1: Predictive Maintenance on Instrumented Equipment (40%)

| Attribute | Detail |
| --- | --- |
| **Business Impact** | **5** — Directly addresses the $2M/month unplanned downtime problem. Industry benchmarks show 30-50% reduction in unplanned downtime. Conservative estimate: 30% reduction on 40% of equipment = $2.88M/year savings. Affects all 4 factories. |
| **Feasibility** | **4** — Sensor data exists on 40% of equipment. Mature SaaS platforms available (Augury, Uptake, Azure IoT + ML). Doesn't require in-house data science for SaaS route. Azure infrastructure in place. Main risk: data pipeline from OT to cloud needs building. |
| **Quadrant** | **Quick Win** (High Impact, High Feasibility) |
| **Build vs Buy vs Already Licensed** | **Buy strongly recommended.** With zero data science staff, custom build is not viable. SaaS predictive maintenance platforms (Augury, Uptake, SparkCognition, Senseye) provide turnkey solutions. Azure IoT + Azure ML is a "build on platform" option if more customization is needed, but requires hiring. Check if Azure enterprise agreement includes Azure IoT or Azure ML credits. **Estimated effort if buy (SaaS)**: 200-400 hrs for integration, configuration, and deployment. **Estimated effort if build**: 600-1,500 hrs (not recommended given talent gap). |
| **GenAI vs Traditional ML** | **Traditional ML.** Predictive maintenance uses time-series analysis, anomaly detection, and classification models — these are well-established traditional ML techniques. GenAI is not needed or appropriate here. |
| **Agent Potential** | **Medium-term.** In its initial form, this is a monitoring and alerting system, not an agent. However, future evolution could include an autonomous agent that: (a) detects anomaly, (b) generates work order in ERP, (c) checks spare parts inventory, (d) schedules maintenance window, (e) notifies relevant technicians. This agent workflow becomes viable once the base predictive model is proven and trusted. |

---

### Opportunity 2: Sensor Expansion to Remaining 60% of Critical Equipment

| Attribute | Detail |
| --- | --- |
| **Business Impact** | **5** — Extends predictive maintenance coverage from 40% to 100% of critical equipment. Remaining 60% is currently the bigger risk because it's manually monitored. Potential additional savings: 30-50% downtime reduction on the uncovered 60% = $4.32-7.2M/year. |
| **Feasibility** | **2** — Requires capital expenditure for sensors, retrofitting on legacy equipment, OT/IT network changes, and potentially production line downtime for installation. Timeline is 6-12 months. Depends on equipment age and type — some may be difficult to instrument. |
| **Quadrant** | **Strategic Bet** (High Impact, Low Feasibility) |
| **Build vs Buy vs Already Licensed** | **Buy.** Sensor hardware (vibration, temperature, acoustic) from vendors like Fluke, SKF, Augury, Banner Engineering. Select sensors compatible with the chosen PdM platform from Opportunity 1. **Estimated effort**: Hardware procurement and installation is separate from AI work. Integration effort: 160-400 hrs for connecting new sensors to existing PdM platform. |
| **GenAI vs Traditional ML** | **Traditional ML.** Same as Opportunity 1 — once sensors are installed, they feed the same predictive models. |
| **Agent Potential** | **Same as Opportunity 1** — expanding coverage feeds the same eventual agent workflow. |

---

### Opportunity 3: Maintenance Knowledge Base (GenAI)

| Attribute | Detail |
| --- | --- |
| **Business Impact** | **3** — Captures tribal knowledge from experienced technicians, reduces diagnostic time for less experienced staff, improves first-time fix rates. Doesn't directly reduce downtime but improves maintenance efficiency and reduces knowledge concentration risk. Estimated impact: 10-20% reduction in mean time to repair (MTTR). |
| **Feasibility** | **4** — GenAI RAG (retrieval-augmented generation) technology is mature. Content sources: equipment manuals, maintenance records, vendor documentation, technician interviews. Azure OpenAI service available. Minimal integration needed for v1 (standalone tool). |
| **Quadrant** | **Quick Win** (Medium Impact, High Feasibility) |
| **Build vs Buy vs Already Licensed** | **Build on platform** recommended. Use Azure OpenAI + Azure AI Search for a RAG pipeline over maintenance documentation and historical records. Alternatively, evaluate SaaS options like Augmentir or Dozuki for manufacturing-specific knowledge management with AI. Check if Microsoft 365 Copilot is included in Azure EA — could be a partial solution for document search. **Estimated effort if build on platform**: 200-500 hrs. **Estimated effort if SaaS**: 80-200 hrs. |
| **GenAI vs Traditional ML** | **GenAI.** This is a natural language understanding and generation use case — technicians asking questions in plain language and getting contextual answers from documentation. Classic RAG application. |
| **Agent Potential** | **High.** This is an ideal AI agent use case. A maintenance assistant agent could: (a) receive alert from PdM system, (b) pull relevant equipment history and manuals, (c) suggest diagnostic steps based on similar past failures, (d) recommend parts needed, (e) generate work order draft. Integrates directly with Opportunity 1 for a complete workflow. |

---

### Opportunity 4: Quality Control — Visual Inspection AI

| Attribute | Detail |
| --- | --- |
| **Business Impact** | **4** — Visual inspection catches defects humans miss, operates 24/7, and improves consistency. Manufacturing industry typically sees 20-40% reduction in defect escape rate. Direct impact on scrap costs, rework, and customer quality complaints. |
| **Feasibility** | **2** — Requires camera hardware installation on production lines, significant image data collection and labeling, custom model training per product type, and real-time edge inference. No internal capability to build or maintain. Higher complexity than PdM. |
| **Quadrant** | **Strategic Bet** (High Impact, Low Feasibility) |
| **Build vs Buy vs Already Licensed** | **Buy** recommended. Turnkey visual inspection platforms (Cognex ViDi, Landing AI, Instrumental) provide pre-built models and hardware. Custom build requires computer vision expertise TitanWorks doesn't have. **Estimated effort if buy**: 400-800 hrs for system integration and model training per production line. **Estimated effort if build**: 1,000-2,500 hrs (not recommended). |
| **GenAI vs Traditional ML** | **Traditional ML.** Visual inspection uses computer vision (CNNs, object detection) — established ML techniques. GenAI is not needed for this use case. |
| **Agent Potential** | **Low-Medium.** Primarily a detection system. Could evolve to agent that detects defect, classifies root cause, adjusts upstream process parameters, and generates quality report. But this requires extensive process integration. |

---

### Opportunity 5: Demand Forecasting

| Attribute | Detail |
| --- | --- |
| **Business Impact** | **3** — Reduces inventory carrying costs (industry benchmark: 15-30% reduction) and improves production scheduling. Aligns production with demand, reducing overproduction and stockouts. Secondary benefit: better downtime scheduling when demand patterns are known. |
| **Feasibility** | **3** — Historical sales/order data likely exists in ERP. Standard time-series forecasting methods are mature. However, requires data engineering to extract and clean ERP data. Moderate integration needed with production planning systems. |
| **Quadrant** | **Fill-in** (Medium Impact, Medium Feasibility) |
| **Build vs Buy vs Already Licensed** | **Buy or already licensed.** Many ERP systems (SAP, Oracle) have built-in or add-on demand forecasting modules. Check if current ERP has this capability — configuring an existing module is dramatically cheaper than building custom. Azure ML also provides time-series forecasting templates. **Estimated effort if ERP module exists**: 80-160 hrs. **Estimated effort if Azure ML build**: 240-600 hrs. |
| **GenAI vs Traditional ML** | **Traditional ML.** Time-series forecasting uses ARIMA, Prophet, gradient boosting, or neural network models — all traditional ML. GenAI adds no value here. |
| **Agent Potential** | **Low.** Demand forecasting is a batch analytics process, not an agent workflow. Output feeds planning systems. |

---

### Opportunity 6: Energy Optimization

| Attribute | Detail |
| --- | --- |
| **Business Impact** | **2** — Industry benchmark: 10-20% reduction in energy costs. For a 4-factory operation, energy costs are significant but savings are modest compared to the $24M/year downtime cost. Relevant for sustainability goals. |
| **Feasibility** | **3** — Requires energy monitoring data (may partially exist via sensors on instrumented equipment). Standard optimization techniques. Azure IoT infrastructure built for PdM can be extended. |
| **Quadrant** | **Fill-in** (Low Impact, Medium Feasibility) |
| **Build vs Buy vs Already Licensed** | **Buy.** Energy management platforms (Schneider Electric EcoStruxure, Siemens, Enel X) provide turnkey solutions. Some overlap with PdM sensor infrastructure. **Estimated effort**: 200-400 hrs for integration with existing IoT infrastructure. |
| **GenAI vs Traditional ML** | **Traditional ML.** Optimization algorithms and time-series analysis. Not a GenAI use case. |
| **Agent Potential** | **Medium.** An energy optimization agent could dynamically adjust equipment scheduling and power usage based on real-time energy prices, production demand, and equipment health. But this requires significant process integration and operational trust. |

---

### Opportunity 7: Safety Monitoring

| Attribute | Detail |
| --- | --- |
| **Business Impact** | **4** — Reducing workplace incidents protects employees, avoids regulatory penalties, reduces insurance costs, and prevents production shutdowns from safety events. High strategic and ethical importance. |
| **Feasibility** | **2** — Requires camera/sensor deployment in safety-critical areas, real-time processing at edge, integration with safety alert systems. Safety-critical AI needs extensive validation and fail-safe design. Regulatory and union considerations. |
| **Quadrant** | **Strategic Bet** (High Impact, Low Feasibility) |
| **Build vs Buy vs Already Licensed** | **Buy.** Safety monitoring platforms (Intenseye, Protex AI, VisionAI) provide computer vision-based safety monitoring. Requires camera installation and configuration. **Estimated effort**: 400-800 hrs for multi-factory deployment. |
| **GenAI vs Traditional ML** | **Traditional ML.** Computer vision for object/person detection and zone monitoring. Not a GenAI use case. |
| **Agent Potential** | **Low.** Safety systems should alert and escalate to humans, not take autonomous action. Agent patterns are inappropriate for safety-critical decisions. |

---

### Opportunity 8: Supplier Communication Agent

| Attribute | Detail |
| --- | --- |
| **Business Impact** | **2** — Automates routine supplier communications, order tracking, and issue escalation. Reduces administrative burden on procurement team. Moderate efficiency gain. |
| **Feasibility** | **3** — GenAI for email/communication automation is mature. Requires integration with ERP procurement module and email systems. Data exists in ERP. |
| **Quadrant** | **Fill-in** (Low Impact, Medium Feasibility) |
| **Build vs Buy vs Already Licensed** | **Buy or already licensed.** Microsoft 365 Copilot (if licensed) can handle much of this. Alternatively, Salesforce Einstein or similar CRM AI. Check Azure EA for Copilot licenses. **Estimated effort if Copilot available**: 40-80 hrs to configure. **Estimated effort if custom build**: 200-500 hrs. |
| **GenAI vs Traditional ML** | **GenAI.** Natural language communication automation is a GenAI use case. |
| **Agent Potential** | **High.** Classic agent workflow: monitor order status, detect delays, draft escalation emails, update procurement team. Low risk, high automation potential. |

---

## Impact-Feasibility Matrix Summary

| | High Feasibility (4-5) | Medium Feasibility (3) | Low Feasibility (1-2) |
|---|---|---|---|
| **High Impact (4-5)** | **QUICK WINS**: (1) Predictive Maintenance on Instrumented Equipment [5,4] | | **STRATEGIC BETS**: (2) Sensor Expansion [5,2]; (4) Quality Control Visual Inspection [4,2]; (7) Safety Monitoring [4,2] |
| **Medium Impact (3)** | **QUICK WINS**: (3) Maintenance Knowledge Base [3,4] | **FILL-INS**: (5) Demand Forecasting [3,3] | |
| **Low Impact (1-2)** | | **FILL-INS**: (6) Energy Optimization [2,3]; (8) Supplier Communication Agent [2,3] | |

---

## Prioritized Recommendations

### Priority 1: Predictive Maintenance Pilot (Quick Win)
Start here. Existing sensor data, proven technology, massive ROI potential, addresses the #1 pain point, and rebuilds organizational trust after the previous failure.

### Priority 2: Maintenance Knowledge Base (Quick Win)
Run in parallel with PdM pilot. Lower cost, visible to technicians immediately, captures tribal knowledge, and demonstrates GenAI value. Can be delivered with Azure OpenAI.

### Priority 3: Sensor Expansion (Strategic Bet — Phase 2)
Plan and budget now, execute after PdM pilot proves value. This is the gateway to full coverage and maximum downtime reduction.

### Priority 4: Quality Control Visual Inspection (Strategic Bet — Phase 3)
Defer until data science capability is partially built and PdM is proven. Higher complexity, needs more organizational readiness.

### Deprioritized
- **Demand Forecasting**: Worth exploring if ERP has existing capability, but not a priority given the downtime problem
- **Energy Optimization**: Low relative impact compared to downtime; revisit after core PdM is deployed
- **Safety Monitoring**: High importance but high complexity and regulatory sensitivity; consider after Year 1
- **Supplier Communication Agent**: Low impact; only pursue if Microsoft Copilot is already licensed and underutilized
