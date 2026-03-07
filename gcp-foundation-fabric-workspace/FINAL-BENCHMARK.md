# gcp-foundation-fabric — Final Benchmark

## Summary

| Metric                          | Value                 |
| ------------------------------- | --------------------- |
| Skill                           | gcp-foundation-fabric |
| Total iterations                | 3                     |
| Final pass rate (with skill)    | 100%                  |
| Final pass rate (without skill) | 70.8%                 |
| Delta                           | **+29.2%**            |
| Plateau at                      | Iteration 3 (100%)    |
| Eval cases                      | 3                     |
| Total assertions                | 24                    |

## Iteration History

| Iteration | With Skill | Without Skill | Delta      | Notes                                                          |
| --------- | ---------- | ------------- | ---------- | -------------------------------------------------------------- |
| 1         | 95.8%      | 91.7%         | +4.2%      | Baseline assertions — too easy, both conditions pass most      |
| 2         | 95.8%      | 91.7%         | +4.2%      | Improved assertions but still insufficient discrimination      |
| 3         | **100%**   | **70.8%**     | **+29.2%** | Highly discriminating assertions testing CFF-specific patterns |

## Per-Eval Results (Iteration 3)

| Eval            | With Skill | Without Skill | Delta  |
| --------------- | ---------- | ------------- | ------ |
| project-config  | 8/8 (100%) | 5/8 (62.5%)   | +37.5% |
| networking      | 8/8 (100%) | 6/8 (75%)     | +25%   |
| project-factory | 8/8 (100%) | 6/8 (75%)     | +25%   |

## What the Skill Fixes

Without-skill agents consistently miss these CFF-specific patterns:

| Pattern                        | Without Skill Failure Rate | Description                                                   |
| ------------------------------ | -------------------------- | ------------------------------------------------------------- |
| `service_agent_iam`            | 100%                       | Uses wrong name (`service_identity_iam`) or omits entirely    |
| `depends_on` in outputs        | 100%                       | Forgets CFF convention of adding explicit module dependencies |
| `group_iam`                    | 100%                       | Uses `iam_by_principals` or role-based `iam` instead          |
| `enable_private_access`        | 100%                       | Omits Private Google Access on subnets                        |
| `secondary_ip_ranges`          | 100%                       | Omits or uses wrong format (bare strings vs map of objects)   |
| `basepath` in factories_config | 50%                        | Uses wrong factory config structure                           |
| `factories_config`             | 50%                        | Omits or uses alternative patterns                            |

## Assertions Used (Iteration 3)

### project-config

1. `service_agent_iam` — CFF-specific field name in shared VPC config
2. `shared_vpc_service_config` — service project attachment pattern
3. `vmExternalIpAccess` — org policy constraint name
4. `service_encryption_key_ids` — CMEK encryption pattern
5. `depends_on` — CFF output dependency convention
6. `group_iam` — CFF group-based IAM pattern
7. `container-engine` — short service name (not full email)
8. `cloudservices` — short service name

### networking

1. `modules/net-vpc` — correct CFF module path
2. `enable_private_access` — subnet private access flag
3. `35.235.240.0/20` — IAP source range
4. `secondary_ip_ranges` — CFF subnet pattern
5. `router_network` — Cloud NAT VPC reference
6. `layer4_configs` — firewall rule protocol matching
7. `modules/net-cloudnat` — correct module path
8. `modules/net-vpc-peering` — correct module path

### project-factory

1. `modules/project-factory` — correct module path
2. `basepath` — factory config structure
3. `data_defaults` — lowest precedence tier
4. `data_merges` — additive merge tier
5. `data_overrides` — highest precedence tier
6. `factories_config` — factory configuration block
7. `org_policies` — policy enforcement pattern
8. `billing_account` — required configuration
