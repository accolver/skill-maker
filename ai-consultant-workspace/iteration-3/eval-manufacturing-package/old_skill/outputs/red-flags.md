# Red Flag Assessment: TitanWorks

## Identified Red Flags

### 1. Previous Failed "Digital Transformation" Initiative
**Severity: High**

The digital transformation initiative 18 months ago was considered a failure, and the project lead left the company. This is one of the most significant risk factors for the engagement.

**Evidence:**
- Initiative described as "a failure" — language matters; this isn't "we learned a lot," it's a perceived loss
- Project lead departing signals either termination or voluntary departure due to blame
- 18 months is recent enough that organizational memory is fresh and emotions are active
- The CFO's demand for hard ROI numbers is likely a direct consequence of this experience

**Impact:**
- Organizational trust in technology-driven change is damaged
- Stakeholders will be hyper-vigilant about costs, timelines, and deliverables
- Any misstep early in the engagement will be magnified through the lens of the previous failure
- Budget approval will face higher scrutiny than typical

**Mitigation:**
1. Address the previous failure directly in the first executive meeting — acknowledge it, don't avoid it
2. Diagnose what specifically went wrong (scope creep? no quick wins? poor communication? wrong vendor? no executive alignment?) and explicitly explain how this engagement differs
3. Structure the engagement with frequent checkpoints and visible deliverables — nothing goes 3+ months without a tangible result
4. Start with a small, high-confidence quick win to rebuild trust before proposing larger investments
5. Over-communicate progress and be transparent about challenges immediately

---

### 2. Zero Data Science Capability
**Severity: High**

The IT team of 25 is entirely enterprise IT with no data science, ML engineering, or advanced analytics skills.

**Evidence:**
- "Zero data science capability" is explicit in the client description
- 25-person IT team focused on ERP and networking
- No AI training budget or hiring pipeline mentioned

**Impact:**
- TitanWorks cannot independently evaluate AI vendors, build models, or maintain AI systems
- Complete dependency on external partners or SaaS platforms for all AI capability
- Risk of vendor lock-in if no internal capability is developed
- Inability to troubleshoot, tune, or improve AI systems after initial deployment
- Maintenance and monitoring of deployed AI will fall to a team that doesn't understand it

**Mitigation:**
1. **Short-term**: Use SaaS/platform solutions that minimize need for in-house ML expertise (e.g., Azure IoT + pre-built predictive maintenance, or dedicated PdM platforms like Augury/Uptake)
2. **Medium-term** (within 6 months): Hire at least 1 data engineer and 1 AI/ML lead
3. **Long-term**: Build a 3-5 person data science team
4. **Immediate**: Invest in AI literacy training for IT team and operations leadership
5. **Engagement structure**: Include knowledge transfer and capability building in every phase of the SOW

---

### 3. CFO Requires Hard ROI Before Committing
**Severity: Medium**

The CFO is demanding hard numbers and sensitivity analysis before approving budget. While this is rational behavior, it creates a potential blocker if expectations aren't managed.

**Evidence:**
- CFO "wants hard numbers before committing"
- Specifically requested sensitivity analysis
- Previous failed initiative likely drives this heightened scrutiny

**Impact:**
- Could delay engagement start if business case isn't compelling enough
- May result in approval of only minimal scope (which isn't necessarily bad)
- Risk of analysis paralysis — wanting more data before deciding
- Could veto expansion even if pilot succeeds if numbers don't meet threshold

**Mitigation:**
1. Provide the CFO exactly what they're asking for: conservative ROI projections with sensitivity analysis showing pessimistic, base, and optimistic scenarios
2. Anchor all projections to the known $2M/month downtime cost — this gives a hard baseline
3. Propose a phased investment with go/no-go gates tied to measurable outcomes
4. Frame Phase 1 as a relatively small investment (<$500K) against a $24M/year problem — the ratio is compelling
5. Include "cost of inaction" scenario: what happens if downtime continues or worsens?

---

### 4. Partial Sensor Coverage (40%)
**Severity: Medium**

Only 40% of critical equipment has sensor instrumentation. The remaining 60% is monitored manually.

**Evidence:**
- "Sensors on about 40% of critical equipment, the rest is monitored manually"

**Impact:**
- Predictive maintenance can only address instrumented equipment initially — 60% of the problem remains untouched by AI
- Sensor retrofit requires capital expenditure, OT/IT coordination, and potentially production line downtime
- Manual monitoring data (inspection logs, operator observations) is likely inconsistent and hard to use for ML
- Stakeholders may expect AI to solve the full downtime problem, but initial impact is limited to the instrumented subset

**Mitigation:**
1. Set clear expectations: Phase 1 targets the 40% already instrumented; Phase 2 expands sensor coverage
2. Include sensor expansion in the roadmap and budget — this is a prerequisite for full coverage
3. Prioritize sensor retrofit based on which uninstrumented equipment causes the most downtime
4. Explore low-cost, non-invasive sensor options (vibration sensors, thermal cameras) for quick retrofit
5. Use manual monitoring data for basic analytics (failure frequency, MTBF) even if it can't feed ML models

---

### 5. No AI Governance Framework
**Severity: Medium**

No AI policy, no ethics guidelines, no model review process, no compliance considerations for AI.

**Evidence:**
- Governance scored 1/5 in maturity assessment
- No prior AI initiatives means no governance was ever needed
- Enterprise IT focus means the team thinks in terms of IT governance (access controls, change management), not AI governance (model monitoring, bias, drift)

**Impact:**
- No process for approving AI tools or models
- No monitoring framework for deployed AI — risk of model degradation going unnoticed
- No clear escalation path if AI makes a bad recommendation (e.g., AI says equipment is fine, it fails anyway)
- Could become a blocker when scaling beyond pilot

**Mitigation:**
1. Include lightweight AI governance setup in Phase 1 — don't over-engineer it for a maturity-1 organization
2. Establish minimum viable governance: (a) AI use policy, (b) approval process for new AI tools, (c) monitoring requirements, (d) incident response for AI failures
3. Assign governance ownership — likely the IT director with input from operations
4. Build governance maturity incrementally as AI deployment expands

---

## Positive Indicators

### 1. Strong Operational Champion
**Signal Strength: High**

Plant managers across 4 factories are enthusiastic about AI for predictive maintenance. This bottom-up pull from the people who will actually use the system is one of the strongest predictors of adoption success. Most AI projects fail because users resist; here, users are requesting it.

### 2. Clear, Quantified Business Problem
**Signal Strength: High**

$2M/month in unplanned downtime is a specific, measurable pain point with a known dollar value. This is rare and valuable — most AI engagements struggle to quantify the problem. The hard number makes ROI calculation straightforward and gives the CFO the baseline they need.

### 3. Existing Sensor Infrastructure (40%)
**Signal Strength: Medium-High**

40% sensor coverage on critical equipment means there is already data being collected that can be used for predictive maintenance without any hardware investment. This dramatically reduces time-to-first-value compared to a greenfield sensor deployment.

### 4. Recent Azure Migration
**Signal Strength: Medium-High**

The Azure migration provides cloud infrastructure, Azure identity/access management, and a pathway to Azure IoT, Azure ML, and Azure AI services. The team has recent experience with cloud migration, reducing the organizational shock of another technology initiative.

### 5. CFO Engagement (Not Avoidance)
**Signal Strength: Medium**

The CFO is asking for hard numbers and sensitivity analysis — this means they are *engaged*, not *opposed*. A CFO who refuses to discuss AI or says "come back next year" is a blocker. A CFO who says "show me the numbers" is a buyer who needs the right information. This is a workable dynamic.

### 6. Industry Precedent is Strong
**Signal Strength: Medium**

Predictive maintenance in manufacturing is one of the best-proven AI use cases in any industry. There are abundant case studies, mature vendors, and documented ROI outcomes. This is not experimental technology — it's proven, which helps with the CFO's risk concerns and the organization's post-failure caution.

---

## Red Flag Summary

| Red Flag | Severity | Status | Mitigation Feasibility |
| --- | --- | --- | --- |
| Previous failed digital transformation | High | Active — must be addressed before proceeding | High — with direct acknowledgment and structured approach |
| Zero data science capability | High | Structural — long-term constraint | Medium — SaaS/platform approach mitigates short-term; hiring needed long-term |
| CFO requires hard ROI before committing | Medium | Active — must be satisfied for budget approval | High — $2M/month baseline makes ROI case compelling |
| Partial sensor coverage (40%) | Medium | Structural — limits initial scope | Medium — phased approach with sensor expansion plan |
| No AI governance framework | Medium | Structural — will block scaling | High — lightweight governance is achievable quickly |

**Critical blockers requiring immediate action**: None are true engagement killers. The previous failure and talent gap are the highest risks, but both have viable mitigation paths. The engagement should proceed with the mitigations above built into the approach.
