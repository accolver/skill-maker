# Red Flag Assessment: MedTech Solutions

**Date:** March 2026
**Status:** Pre-engagement assessment (to be validated during discovery)

---

## Identified Red Flags

### 1. Vague Budget ("has budget but is vague on how much")

| Attribute | Details |
| --- | --- |
| **Severity** | Medium |
| **Source** | CEO's initial conversation |
| **Risk** | We invest time in discovery and scoping, then the budget doesn't match the recommendations. Could propose $500K to a team expecting $50K, or under-scope because we're guessing. |

**Mitigation Plan:**
- In the CTO call next week, ask directly: "What investment range is the organization comfortable with for a first AI initiative?"
- If CTO deflects, use anchoring: "For companies your size, a typical first AI initiative runs $50K-$150K. Does that align with what you're thinking?"
- Before proceeding to opportunity scoping, get at minimum a budget range commitment (e.g., "we're thinking low six figures" vs. "we have $50K")
- Present phased options with clear go/no-go gates so the first commitment is smaller
- **Decision point:** If no budget signal emerges after CTO and CEO interviews, pause engagement and advise client to establish a budget before proceeding

### 2. Unrealistic Expectations Risk ("use AI to modernize operations")

| Attribute | Details |
| --- | --- |
| **Severity** | Medium-High |
| **Source** | CEO's framing |
| **Risk** | "AI" and "modernize" are broad terms that can mask wildly different expectations. The CEO may expect dramatic transformation in 3-6 months, whereas the real starting point is digitizing paper processes. Misaligned expectations lead to disappointed clients. |

**Mitigation Plan:**
- In CEO interview, ask: "What would a successful AI initiative look like in 12 months? What would you be able to point to?"
- Anchor expectations with industry benchmarks: "For companies at your current stage, the first 90 days typically focus on digitizing core processes to create the data foundation that AI needs"
- Be explicit in deliverables about what "AI" means in their context (initial phase is digitization and data capture, not autonomous agents)
- Include a maturity roadmap showing the progression from digitization to analytics to AI
- Frame Phase 1 as "preparing for AI" rather than "deploying AI"

### 3. No Indication of Data Strategy or Accessible Data

| Attribute | Details |
| --- | --- |
| **Severity** | High |
| **Source** | Paper-based intake processes |
| **Risk** | AI requires data. Paper-based processes mean significant patient and operational data is not in a structured, accessible format. If the broader data landscape is similarly immature, advanced AI use cases are not feasible in the near term. |

**Mitigation Plan:**
- In CTO call, conduct a data landscape inventory: where does data live, what is structured vs. unstructured, what is accessible via APIs
- If data maturity is confirmed at level 1-1.5, recommend data foundation work as Phase 1 (digitization, data capture, basic integration)
- Identify at least one AI use case that works with available data (e.g., patient communication automation using existing scheduling data)
- Do not propose data-hungry initiatives (predictive models, analytics dashboards) until data foundations are in place
- **Decision point:** If data is worse than expected, reshape the engagement from "AI consulting" to "digital foundation consulting with AI roadmap"

### 4. Compliance/Legal Has Not Been Consulted (Assumed)

| Attribute | Details |
| --- | --- |
| **Severity** | Medium |
| **Source** | Inferred -- no mention of compliance team involvement in AI planning |
| **Risk** | Healthcare AI touches HIPAA, patient consent, potentially FDA. If compliance and legal are not part of the conversation, AI deployments could violate regulations or be blocked late in the process. |

**Mitigation Plan:**
- Ask CTO: "Has your compliance or legal team been consulted about AI initiatives? Do they need to be part of our planning conversations?"
- Recommend including compliance/legal in stakeholder interview sequence
- For any AI solution involving PHI, verify HIPAA compliance posture: BAAs with cloud vendors, data handling procedures, access controls
- Include regulatory compliance as a workstream in the roadmap, not an afterthought
- **Decision point:** If compliance team is resistant or uninformed, add a regulatory readiness workstream to Phase 1

### 5. No Physician Champion Identified

| Attribute | Details |
| --- | --- |
| **Severity** | Medium |
| **Source** | Inferred -- engagement initiated by CEO, no clinical leadership mentioned |
| **Risk** | Clinical AI initiatives (documentation, decision support) fail without physician buy-in. If no physician champion exists, clinical AI opportunities should be deprioritized until one is identified. Physician resistance can kill entire AI programs. |

**Mitigation Plan:**
- Ask CTO: "Is there a physician or clinical leader who is enthusiastic about AI or technology improvement?"
- During stakeholder discovery, specifically interview 1-2 lead clinicians to gauge attitudes
- If no champion emerges, limit initial AI scope to operational/administrative use cases (intake, billing, scheduling) where physician buy-in is less critical
- Plan a physician engagement strategy as part of the roadmap

### 6. Small IT Team May Lack Capacity

| Attribute | Details |
| --- | --- |
| **Severity** | Medium |
| **Source** | 12-person IT team for 500 employees |
| **Risk** | A 12-person IT team is lean. They are likely consumed by day-to-day operations: help desk, EHR maintenance, infrastructure management, security. AI projects require implementation bandwidth, vendor management, integration work, and ongoing support. If the team has no spare capacity, projects stall. |

**Mitigation Plan:**
- In CTO call, ask: "How is your team currently allocated? What capacity exists for new projects?"
- Recommend buy-over-build for initial AI solutions to minimize internal implementation burden
- Include vendor management and integration support in any SOW
- If team is fully consumed, recommend either: (a) hiring 1-2 additional staff for AI projects, or (b) including managed services in the engagement scope
- Phase the roadmap to avoid overwhelming the IT team with simultaneous initiatives

---

## Red Flags Not Yet Observed (Monitor During Discovery)

| Potential Red Flag | What Would Indicate It | Severity If Found |
| --- | --- | --- |
| No executive sponsor | CEO or CTO backs away from ownership | Critical |
| Political resistance from key stakeholders | Department heads resist or sabotage during interviews | High |
| Previous failed AI initiative with unresolved blame | CTO or team mention past failure with bitterness | Medium |
| EHR vendor lock-in prevents integration | EHR system has no APIs or charges prohibitive fees | High |
| Clinician resistance to technology change | Physicians refuse to participate in pilots | High |

---

## Red Flag Summary

| # | Red Flag | Severity | Status | Must Resolve By |
| --- | --- | --- | --- | --- |
| 1 | Vague budget | Medium | Open | End of CTO + CEO interviews |
| 2 | Unrealistic expectations | Medium-High | Open | End of CEO interview |
| 3 | No data strategy | High | Open | End of CTO interview |
| 4 | Compliance not consulted | Medium | Assumed | End of discovery phase |
| 5 | No physician champion | Medium | Unknown | End of discovery phase |
| 6 | IT team capacity | Medium | Likely | End of CTO interview |

**Overall Assessment:** No critical red flags identified at this stage. The most significant risks (budget vagueness and data immaturity) are common for organizations at this maturity level and are addressable. The CTO call next week is the primary validation point for most of these flags.
