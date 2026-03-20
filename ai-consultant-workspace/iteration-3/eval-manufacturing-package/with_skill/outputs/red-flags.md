# Red Flag Assessment: TitanWorks

## Identified Red Flags

### 1. Previous Failed "Digital Transformation" Initiative

| Attribute | Detail |
| --- | --- |
| **Severity** | **High** |
| **Description** | 18 months ago, TitanWorks undertook a "digital transformation" initiative that was considered a failure. The project lead subsequently left the company. The root cause of the failure has not been explicitly diagnosed or communicated. |
| **Risk** | Residual organizational trauma. Stakeholders may pattern-match this engagement to the failed one. Hidden blame dynamics may surface during execution. Budget approval will face heightened scrutiny. |
| **Mitigation** | 1. Conduct a brief retrospective on the failed initiative during discovery (what was attempted, what went wrong, what was learned). 2. Explicitly differentiate this engagement: specific problem ($2M/month downtime), measurable success criteria, phased approach with go/no-go gates. 3. Avoid using the term "digital transformation." Frame as "predictive maintenance program" or "equipment reliability initiative." 4. Design the engagement with small, visible wins to rebuild trust incrementally. |

### 2. Zero Data Science / AI Talent

| Attribute | Detail |
| --- | --- |
| **Severity** | **High** |
| **Description** | The 25-person IT team has zero data science, ML engineering, or analytics capability. All staff are enterprise IT generalists (ERP, networking). |
| **Risk** | No internal capability to evaluate, build, deploy, or maintain AI solutions. Complete dependency on external partners creates sustainability risk. Post-engagement, models may degrade without anyone to monitor them. |
| **Mitigation** | 1. Prioritize Buy over Build where possible to reduce need for deep ML expertise. 2. Include managed monitoring services in all proposals. 3. Build a talent acquisition plan into the roadmap (minimum: 1 data engineer by month 6, 1 ML engineer or data scientist by month 12). 4. Require knowledge transfer as a deliverable in every phase. 5. Invest in Azure AI certifications for 2-3 existing IT staff members. |

### 3. CFO Skepticism and ROI Gatekeeper

| Attribute | Detail |
| --- | --- |
| **Severity** | **Medium** |
| **Description** | The CFO is concerned about ROI and wants hard numbers before committing budget. This is reasonable given the failed previous initiative, but could block or delay engagement if not addressed proactively. |
| **Risk** | Budget approval bottleneck. If the ROI case is not compelling with conservative assumptions, the engagement may not proceed. Even if approved, ongoing funding may be contingent on proving returns at each phase gate. |
| **Mitigation** | 1. Lead with conservative financial projections (base case uses 50% of industry benchmarks). 2. Provide sensitivity analysis showing ROI under pessimistic, base, and optimistic scenarios. 3. Structure the engagement with phase gates and explicit go/no-go financial criteria. 4. Frame Phase 1 investment as low-risk proof point (small spend, measurable outcome, clear kill criteria). 5. Quantify the cost of inaction: $2M/month is $24M/year. Even a 10% reduction pays for significant investment. |

### 4. 60% of Critical Equipment Lacks Sensor Coverage

| Attribute | Detail |
| --- | --- |
| **Severity** | **Medium** |
| **Description** | Only 40% of critical equipment has sensors installed. The remaining 60% is monitored manually. Predictive maintenance AI requires sensor data to function. |
| **Risk** | AI value is limited to 40% of the equipment fleet initially. Expanding to the remaining 60% requires capital expenditure on sensors and instrumentation, which adds cost and timeline. Legacy equipment may be difficult or impossible to retrofit. |
| **Mitigation** | 1. Phase 1 targets only the 40% with existing sensors — no sensor CAPEX required. 2. Phase 2 includes a sensor expansion plan prioritized by equipment criticality and downtime cost. 3. Evaluate which legacy equipment can be cost-effectively retrofitted vs. which should remain on manual monitoring. 4. Consider vibration analysis, thermal imaging, and acoustic monitoring as lower-cost sensor alternatives for legacy equipment. |

### 5. No AI Governance Framework

| Attribute | Detail |
| --- | --- |
| **Severity** | **Medium** |
| **Description** | No AI use policy, no model approval process, no ethics guidelines, no monitoring framework. |
| **Risk** | Models deployed without validation standards could make incorrect predictions, leading to missed maintenance events or false alarms. No governance means no accountability structure for AI-influenced decisions. Scaling AI beyond pilot requires governance. |
| **Mitigation** | 1. Establish lightweight AI governance framework in Phase 1 (AI use policy, model approval checklist, monitoring requirements). 2. Keep governance proportional to maturity level — avoid overengineering. 3. Assign governance ownership to a specific person (e.g., IT Director + Operations Director jointly). 4. Build governance requirements into vendor selection criteria. |

### 6. OT/IT Convergence Unknown

| Attribute | Detail |
| --- | --- |
| **Severity** | **Medium** |
| **Description** | Manufacturing AI requires bridging operational technology (OT) networks (SCADA, historians, PLCs) with information technology (IT) networks (Azure cloud, ERP). The state of OT/IT convergence at TitanWorks is unknown. |
| **Risk** | OT networks are often air-gapped for cybersecurity reasons. Getting sensor data from the factory floor to Azure may require network architecture changes, security reviews, and OT team buy-in. This is a common blocker in manufacturing AI projects. |
| **Mitigation** | 1. Assess OT/IT network architecture in discovery phase. 2. Engage OT/plant engineering teams early — they are often gatekeepers. 3. Use Azure IoT Edge for secure, one-way data flow from OT to cloud (reduces cybersecurity concerns). 4. Plan for potential 4-8 week network architecture workstream if OT network is fully isolated. |

---

## Positive Indicators

### 1. Plant Manager Enthusiasm

| Attribute | Detail |
| --- | --- |
| **Strength** | **Strong** |
| **Description** | Plant managers are enthusiastic about AI and automation. These are the operational leaders closest to the problem who will need to champion adoption on the factory floor. |
| **Value** | Operational buy-in is the hardest thing to manufacture in an AI engagement. Having it from day one dramatically increases pilot success probability. Plant managers can provide domain expertise, prioritize equipment for instrumentation, and drive technician adoption. |

### 2. Clear, Quantifiable Problem

| Attribute | Detail |
| --- | --- |
| **Strength** | **Strong** |
| **Description** | The $2M/month unplanned downtime cost is specific, measurable, and significant (8% of revenue). |
| **Value** | Most AI engagements struggle with vague problem statements. TitanWorks has a concrete metric that everyone in the organization understands. This makes ROI calculation straightforward, success criteria unambiguous, and executive communication simple. |

### 3. Azure Cloud Platform Already in Place

| Attribute | Detail |
| --- | --- |
| **Strength** | **Moderate** |
| **Description** | Azure migration was completed 6 months ago, giving TitanWorks a cloud foundation. |
| **Value** | Eliminates the 3-6 month cloud migration workstream that would otherwise precede any AI work. Azure has strong manufacturing AI offerings (IoT Hub, Digital Twins, Machine Learning). The team already has Azure familiarity and vendor relationships. |

### 4. Existing Sensor Infrastructure (Partial)

| Attribute | Detail |
| --- | --- |
| **Strength** | **Moderate** |
| **Description** | 40% of critical equipment already has sensors installed and is generating data. |
| **Value** | Provides an immediate data foundation for a predictive maintenance pilot without capital expenditure on sensors. Even partial coverage allows a meaningful proof of concept that can demonstrate ROI before expanding sensor coverage to the remaining fleet. |

### 5. CFO Engagement (Not Dismissal)

| Attribute | Detail |
| --- | --- |
| **Strength** | **Moderate** |
| **Description** | The CFO is skeptical but actively asking for ROI analysis. This is engagement, not resistance. |
| **Value** | A CFO asking "show me the numbers" is far better than a CFO saying "no." It means the financial gate is passable with the right evidence. The $2M/month baseline gives us strong numbers to work with. Meeting the CFO's analytical rigor will actually produce a better engagement design. |

## Summary Assessment

| Category | Count |
| --- | --- |
| Critical Red Flags | 0 |
| High Severity Red Flags | 2 (failed initiative, talent gap) |
| Medium Severity Red Flags | 4 (CFO skepticism, sensor gaps, governance, OT/IT) |
| Strong Positive Indicators | 2 (plant manager enthusiasm, clear problem) |
| Moderate Positive Indicators | 3 (Azure platform, partial sensors, CFO engagement) |

**Overall Assessment**: No critical red flags that would require pausing the engagement. The two high-severity flags (failed initiative, talent gap) are manageable with the right engagement design. The positive indicators, especially the quantifiable problem and operational buy-in, create a strong foundation for a successful engagement.

**Key mitigation priority**: Address the failed initiative narrative explicitly and early. Design every aspect of the engagement to contrast with whatever went wrong previously.
