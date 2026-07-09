# Original Skill Maker vs SkillOpt scores for remaining skills

This compares the latest original Skill Maker benchmark score for each remaining skill against the recorded SkillOpt `remaining-v1` score.

Important caveats:

- Original Skill Maker scores come from each skill workspace's latest `benchmark.json` and are in-sample eval-loop pass rates unless otherwise noted.
- SkillOpt `remaining-v1` scores are deterministic fallback mechanics scores using existing evals reused across train/validation/test. They are useful for seeing whether the applied candidate satisfies the existing checks, but they are not clean held-out live-LLM quality claims.
- Two skills did not have a latest Skill Maker benchmark artifact in `workspaces/`; they are listed as `N/A`.

| Skill | Original Skill Maker with-skill | Original without-skill | Original delta | SkillOpt hard | SkillOpt soft | SkillOpt hard - original | SkillOpt soft - original |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `ai-consultant` | N/A | N/A | N/A | 100.0% | 100.0% | N/A | N/A |
| `annuity-life-insurance-sales` | 100.0% | 44.2% | 55.8% | 33.3% | 91.7% | -66.7% | -8.3% |
| `api-doc-generator` | 100.0% | 16.7% | 83.3% | 100.0% | 100.0% | +0.0% | +0.0% |
| `automation-builder` | 100.0% | 25.0% | 75.0% | 100.0% | 100.0% | +0.0% | +0.0% |
| `changelog-generator` | 100.0% | 20.8% | 79.2% | 100.0% | 100.0% | +0.0% | +0.0% |
| `clean-room-risk-screen` | 100.0% | 50.0% | 50.0% | 100.0% | 100.0% | +0.0% | +0.0% |
| `cloudevents` | 70.1% | 70.1% | 0.0% | 100.0% | 100.0% | +29.9% | +29.9% |
| `code-reviewer` | 100.0% | 41.7% | 58.3% | 100.0% | 100.0% | +0.0% | +0.0% |
| `database-migration` | 100.0% | 4.2% | 95.8% | 100.0% | 100.0% | +0.0% | +0.0% |
| `differentiated-opportunity-engine` | 100.0% | 85.7% | 14.3% | 100.0% | 100.0% | +0.0% | +0.0% |
| `distribution-ops` | 100.0% | 75.0% | 25.0% | 100.0% | 100.0% | +0.0% | +0.0% |
| `edge-profiler` | 93.8% | 50.0% | 43.8% | 100.0% | 100.0% | +6.2% | +6.2% |
| `error-handling` | 100.0% | 8.3% | 91.7% | 100.0% | 100.0% | +0.0% | +0.0% |
| `experiment-tracker` | 100.0% | 58.3% | 41.7% | 100.0% | 100.0% | +0.0% | +0.0% |
| `gcp-foundation-fabric` | 100.0% | 70.8% | 29.2% | 33.3% | 91.7% | -66.7% | -8.3% |
| `micro-saas-scoper` | 83.3% | 41.7% | 41.7% | 100.0% | 100.0% | +16.7% | +16.7% |
| `monitoring-setup` | 100.0% | 26.1% | 73.9% | 100.0% | 100.0% | +0.0% | +0.0% |
| `nostr-bunker-integration` | 100.0% | 95.8% | 4.2% | 100.0% | 100.0% | +0.0% | +0.0% |
| `nostr-client-patterns` | 100.0% | 0.0% | 100.0% | 100.0% | 100.0% | +0.0% | +0.0% |
| `nostr-crypto-guide` | 100.0% | 4.2% | 95.8% | 100.0% | 100.0% | +0.0% | +0.0% |
| `nostr-dvms` | 100.0% | 0.0% | 100.0% | 100.0% | 100.0% | +0.0% | +0.0% |
| `nostr-event-builder` | 100.0% | 41.7% | 58.3% | 100.0% | 100.0% | +0.0% | +0.0% |
| `nostr-filter-designer` | 100.0% | 54.8% | 45.2% | 33.3% | 91.1% | -66.7% | -8.9% |
| `nostr-marketplace-builder` | 100.0% | 25.0% | 75.0% | 100.0% | 100.0% | +0.0% | +0.0% |
| `nostr-nip-advisor` | 100.0% | 100.0% | 0.0% | 100.0% | 100.0% | +0.0% | +0.0% |
| `nostr-nip05-setup` | 100.0% | 83.3% | 16.7% | 100.0% | 100.0% | +0.0% | +0.0% |
| `nostr-relay-builder` | 100.0% | 95.8% | 4.2% | 100.0% | 100.0% | +0.0% | +0.0% |
| `nostr-social-graph` | 100.0% | 0.0% | 100.0% | 100.0% | 100.0% | +0.0% | +0.0% |
| `nostr-zap-integration` | 100.0% | 91.7% | 8.3% | 100.0% | 100.0% | +0.0% | +0.0% |
| `offer-designer` | 100.0% | 58.3% | 41.7% | 100.0% | 100.0% | +0.0% | +0.0% |
| `pr-description` | 100.0% | 20.8% | 79.2% | 100.0% | 100.0% | +0.0% | +0.0% |
| `pr-qa` | 100.0% | 45.8% | 54.2% | 100.0% | 100.0% | +0.0% | +0.0% |
| `skill-maker` | 100.0% | 57.3% | 42.7% | 100.0% | 100.0% | +0.0% | +0.0% |
| `telos-guardian` | 79.1% | 79.1% | 0.0% | 100.0% | 100.0% | +20.9% | +20.9% |
| `terraform-github-actions-deploy` | N/A | N/A | N/A | 100.0% | 100.0% | N/A | N/A |
| `validation-planner` | 100.0% | 68.8% | 31.2% | 100.0% | 100.0% | +0.0% | +0.0% |

## Missing original Skill Maker benchmark artifacts

- `ai-consultant`
- `terraform-github-actions-deploy`

## Aggregate over comparable skills

- Comparable skills: 34
- Average original Skill Maker with-skill pass rate: 97.8%
- Average SkillOpt hard score: 94.1% (-3.7% vs original)
- Average SkillOpt soft score: 99.2% (+1.4% vs original)

## Source benchmark artifacts

- `ai-consultant`: Skill Maker `N/A`; SkillOpt `skillopt/results/remaining-v1/ai-consultant/summary.json`
- `annuity-life-insurance-sales`: Skill Maker `workspaces/annuity-life-insurance-sales-workspace/iteration-4/benchmark.json`; SkillOpt `skillopt/results/remaining-v1/annuity-life-insurance-sales/summary.json`
- `api-doc-generator`: Skill Maker `workspaces/api-doc-generator-workspace/iteration-3/benchmark.json`; SkillOpt `skillopt/results/remaining-v1/api-doc-generator/summary.json`
- `automation-builder`: Skill Maker `workspaces/automation-builder-workspace/iteration-2/benchmark.json`; SkillOpt `skillopt/results/remaining-v1/automation-builder/summary.json`
- `changelog-generator`: Skill Maker `workspaces/changelog-generator-workspace/iteration-3/benchmark.json`; SkillOpt `skillopt/results/remaining-v1/changelog-generator/summary.json`
- `clean-room-risk-screen`: Skill Maker `workspaces/clean-room-risk-screen-workspace/iteration-2/benchmark.json`; SkillOpt `skillopt/results/remaining-v1/clean-room-risk-screen/summary.json`
- `cloudevents`: Skill Maker `workspaces/cloudevents-workspace/iteration-3/benchmark.json`; SkillOpt `skillopt/results/remaining-v1/cloudevents/summary.json`
- `code-reviewer`: Skill Maker `workspaces/code-reviewer-workspace/iteration-4/benchmark.json`; SkillOpt `skillopt/results/remaining-v1/code-reviewer/summary.json`
- `database-migration`: Skill Maker `workspaces/database-migration-workspace/iteration-3/benchmark.json`; SkillOpt `skillopt/results/remaining-v1/database-migration/summary.json`
- `differentiated-opportunity-engine`: Skill Maker `workspaces/differentiated-opportunity-engine-workspace/iteration-4/benchmark.json`; SkillOpt `skillopt/results/remaining-v1/differentiated-opportunity-engine/summary.json`
- `distribution-ops`: Skill Maker `workspaces/distribution-ops-workspace/iteration-1/benchmark.json`; SkillOpt `skillopt/results/remaining-v1/distribution-ops/summary.json`
- `edge-profiler`: Skill Maker `workspaces/edge-profiler-workspace/iteration-2/benchmark.json`; SkillOpt `skillopt/results/remaining-v1/edge-profiler/summary.json`
- `error-handling`: Skill Maker `workspaces/error-handling-workspace/iteration-3/benchmark.json`; SkillOpt `skillopt/results/remaining-v1/error-handling/summary.json`
- `experiment-tracker`: Skill Maker `workspaces/experiment-tracker-workspace/iteration-2/benchmark.json`; SkillOpt `skillopt/results/remaining-v1/experiment-tracker/summary.json`
- `gcp-foundation-fabric`: Skill Maker `workspaces/gcp-foundation-fabric-workspace/iteration-3/benchmark.json`; SkillOpt `skillopt/results/remaining-v1/gcp-foundation-fabric/summary.json`
- `micro-saas-scoper`: Skill Maker `workspaces/micro-saas-scoper-workspace/iteration-2/benchmark.json`; SkillOpt `skillopt/results/remaining-v1/micro-saas-scoper/summary.json`
- `monitoring-setup`: Skill Maker `workspaces/monitoring-setup-workspace/iteration-3/benchmark.json`; SkillOpt `skillopt/results/remaining-v1/monitoring-setup/summary.json`
- `nostr-bunker-integration`: Skill Maker `workspaces/nostr-bunker-integration-workspace/iteration-1/benchmark.json`; SkillOpt `skillopt/results/remaining-v1/nostr-bunker-integration/summary.json`
- `nostr-client-patterns`: Skill Maker `workspaces/nostr-client-patterns-workspace/iteration-2/benchmark.json`; SkillOpt `skillopt/results/remaining-v1/nostr-client-patterns/summary.json`
- `nostr-crypto-guide`: Skill Maker `workspaces/nostr-crypto-guide-workspace/iteration-2/benchmark.json`; SkillOpt `skillopt/results/remaining-v1/nostr-crypto-guide/summary.json`
- `nostr-dvms`: Skill Maker `workspaces/nostr-dvms-workspace/iteration-2/benchmark.json`; SkillOpt `skillopt/results/remaining-v1/nostr-dvms/summary.json`
- `nostr-event-builder`: Skill Maker `workspaces/nostr-event-builder-workspace/iteration-1/benchmark.json`; SkillOpt `skillopt/results/remaining-v1/nostr-event-builder/summary.json`
- `nostr-filter-designer`: Skill Maker `workspaces/nostr-filter-designer-workspace/iteration-1/benchmark.json`; SkillOpt `skillopt/results/remaining-v1/nostr-filter-designer/summary.json`
- `nostr-marketplace-builder`: Skill Maker `workspaces/nostr-marketplace-builder-workspace/iteration-1/benchmark.json`; SkillOpt `skillopt/results/remaining-v1/nostr-marketplace-builder/summary.json`
- `nostr-nip-advisor`: Skill Maker `workspaces/nostr-nip-advisor-workspace/iteration-2/benchmark.json`; SkillOpt `skillopt/results/remaining-v1/nostr-nip-advisor/summary.json`
- `nostr-nip05-setup`: Skill Maker `workspaces/nostr-nip05-setup-workspace/iteration-5/benchmark.json`; SkillOpt `skillopt/results/remaining-v1/nostr-nip05-setup/summary.json`
- `nostr-relay-builder`: Skill Maker `workspaces/nostr-relay-builder-workspace/iteration-1/benchmark.json`; SkillOpt `skillopt/results/remaining-v1/nostr-relay-builder/summary.json`
- `nostr-social-graph`: Skill Maker `workspaces/nostr-social-graph-workspace/iteration-3/benchmark.json`; SkillOpt `skillopt/results/remaining-v1/nostr-social-graph/summary.json`
- `nostr-zap-integration`: Skill Maker `workspaces/nostr-zap-integration-workspace/iteration-3/benchmark.json`; SkillOpt `skillopt/results/remaining-v1/nostr-zap-integration/summary.json`
- `offer-designer`: Skill Maker `workspaces/offer-designer-workspace/iteration-2/benchmark.json`; SkillOpt `skillopt/results/remaining-v1/offer-designer/summary.json`
- `pr-description`: Skill Maker `workspaces/pr-description-workspace/iteration-3/benchmark.json`; SkillOpt `skillopt/results/remaining-v1/pr-description/summary.json`
- `pr-qa`: Skill Maker `workspaces/pr-qa-workspace/iteration-1/benchmark.json`; SkillOpt `skillopt/results/remaining-v1/pr-qa/summary.json`
- `skill-maker`: Skill Maker `workspaces/skill-maker-workspace/iteration-6/benchmark.json`; SkillOpt `skillopt/results/remaining-v1/skill-maker/summary.json`
- `telos-guardian`: Skill Maker `workspaces/telos-guardian-workspace/iteration-3/benchmark.json`; SkillOpt `skillopt/results/remaining-v1/telos-guardian/summary.json`
- `terraform-github-actions-deploy`: Skill Maker `N/A`; SkillOpt `skillopt/results/remaining-v1/terraform-github-actions-deploy/summary.json`
- `validation-planner`: Skill Maker `workspaces/validation-planner-workspace/iteration-1/benchmark.json`; SkillOpt `skillopt/results/remaining-v1/validation-planner/summary.json`
