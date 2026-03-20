# Red Flag Assessment: MedTech Solutions

## Identified Red Flags

### 1. No Data Strategy or Data is Siloed/Inaccessible

| Attribute | Detail |
| --- | --- |
| Severity | **HIGH** |
| Evidence | Paper-based patient intake confirmed by CEO. Multi-site clinics almost certainly have fragmented data across locations. |
| Risk | AI cannot operate on paper. Any AI initiative will fail without digitized, accessible, structured data. This is the single biggest risk to the engagement. |
| Mitigation | Recommend data digitization as Phase 0 / prerequisite work. Patient intake digitization becomes both a foundation activity and a quick win. Frame this to the CEO as "the first step toward AI" — not as "you're not ready for AI." |

### 2. Unrealistic Expectations ("Use AI to Modernize Operations")

| Attribute | Detail |
| --- | --- |
| Severity | **HIGH** |
| Evidence | CEO's stated goal is vague — "use AI to modernize operations" without specific outcomes, metrics, or scope. This pattern frequently leads to misaligned expectations around timeline and impact. |
| Risk | CEO may expect transformative results in 90 days when the organization needs 6-12 months of foundation building. Disappointment leads to project cancellation and blame on the consultant. |
| Mitigation | Use CTO call to understand whether CTO has more specific expectations. On the first executive readout, present industry benchmarks for healthcare AI timelines at similar maturity levels. Frame the engagement as phased with clear decision gates. Show the maturity assessment to ground expectations in evidence. |

### 3. Budget is Vague ("Has Budget but Unclear How Much")

| Attribute | Detail |
| --- | --- |
| Severity | **MEDIUM** |
| Evidence | CEO "has budget" but amount is unspecified. No budget range, no approved allocation, no procurement process clarity. |
| Risk | Without budget boundaries, there's risk of either: (a) scoping work that exceeds what they'll approve, wasting proposal effort, or (b) under-scoping to be safe and missing the real opportunity. Also signals that AI spend may not have board/finance approval yet. |
| Mitigation | Get budget range commitment from CTO on the call. Frame it as: "To make sure our recommendations are calibrated to your investment comfort, can you share a rough range?" If CTO defers, propose a tiered approach (Essential / Recommended / Comprehensive) so they can self-select. Get clarity on approval authority and procurement process. |

### 4. Compliance/Legal Likely Not Yet Consulted for AI

| Attribute | Detail |
| --- | --- |
| Severity | **MEDIUM** |
| Evidence | No mention of compliance or legal involvement in the AI conversation. Healthcare companies have HIPAA compliance programs, but AI-specific compliance review has almost certainly not happened. |
| Risk | Any AI solution touching patient data (which is most healthcare AI) without compliance review could create HIPAA violations with severe financial and reputational penalties. Legal discovering AI initiatives late creates project-stopping friction. |
| Mitigation | Recommend looping in compliance officer immediately. On CTO call, ask: "Has your compliance team been involved in this AI conversation?" If not, add them to stakeholder interview list as priority. Include AI governance and compliance framework as a deliverable in the engagement. |

### 5. No Plan for GenAI-Specific Risks

| Attribute | Detail |
| --- | --- |
| Severity | **MEDIUM** |
| Evidence | Organization has no AI experience, so GenAI-specific risks (hallucination in clinical contexts, PHI leakage through prompts, prompt injection) have not been assessed. |
| Risk | Healthcare is a high-stakes domain for GenAI errors. A hallucinated clinical recommendation could harm patients. PHI in prompts sent to third-party LLM APIs without proper BAAs is a HIPAA violation. Shadow AI usage by clinicians (e.g., pasting patient notes into ChatGPT) may already be happening. |
| Mitigation | Include GenAI risk assessment as a required activity before any GenAI deployment. Specifically address: (1) hallucination risk in clinical contexts, (2) PHI leakage prevention, (3) shadow AI audit and policy, (4) vendor BAA requirements for any LLM API usage. |

### 6. Potential Shadow AI Usage Without Governance

| Attribute | Detail |
| --- | --- |
| Severity | **MEDIUM** |
| Evidence | Circumstantial — clinicians and administrative staff may be using consumer AI tools (ChatGPT, Google Gemini) for drafting notes, letters, or summaries. This is widespread in healthcare and often invisible to IT. |
| Risk | Patient data entered into consumer AI tools without BAAs is a HIPAA violation. The organization may already be in violation without knowing it. |
| Mitigation | On CTO call, ask directly about shadow AI awareness. Recommend a shadow AI audit as an early engagement activity. Establish an acceptable-use policy for AI tools before deploying any sanctioned AI solutions. |

---

## Positive Indicators

| Indicator | Evidence | Value |
| --- | --- | --- |
| **Active executive sponsor** | CEO is driving the AI conversation and has engaged a consultant. This is the #1 predictor of AI initiative success. | High |
| **CTO engaged early** | CTO is the next call — technical leadership is involved from the start, not sidelined. | High |
| **Budget exists (even if vague)** | CEO has indicated budget availability. This is better than "we have no money" or "build the business case first." | Medium |
| **AWS presence** | Some cloud infrastructure exists. The organization is not starting from zero on modern infrastructure. | Medium |
| **Clear pain point identified** | Paper-based intake is a concrete, visible problem. This provides a natural starting point with obvious before/after metrics. | High |
| **Mid-size sweet spot** | 500 employees / $80M revenue is large enough to fund AI initiatives but small enough to move quickly without enterprise bureaucracy. | Medium |
| **Specialty clinics model** | Chain model means proven processes can be replicated across locations — AI deployed at one clinic can scale to all. | Medium |

---

## Red Flag Severity Summary

| Severity | Count | Flags |
| --- | --- | --- |
| Critical | 0 | — |
| High | 2 | No data strategy; Unrealistic expectations |
| Medium | 4 | Vague budget; Compliance not consulted; No GenAI risk plan; Potential shadow AI |

**Assessment**: No critical (engagement-stopping) red flags identified. The two
High-severity flags (data and expectations) are both addressable through proper
engagement framing and phased approach. The engagement can proceed, but Phase 1
must focus on foundations, not advanced AI deployment.

## Flags to Validate on CTO Call

Priority questions to confirm or dismiss these flags:

1. "What does your patient data workflow look like end-to-end — from intake
   through billing?" (validates data flag)
2. "What does success look like for the CEO in 6 months? 12 months?" (validates
   expectations flag)
3. "Do you have a rough budget range in mind for this initiative?" (validates
   budget flag)
4. "Has your compliance team been part of this AI conversation yet?" (validates
   compliance flag)
5. "Are you aware of any staff using AI tools like ChatGPT in their work today?"
   (validates shadow AI flag)
