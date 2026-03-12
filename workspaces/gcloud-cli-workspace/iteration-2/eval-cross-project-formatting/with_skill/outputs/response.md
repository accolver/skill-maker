# Finding All n1-standard-1 Instances Across an Organization

## Step 1 — Verify context

Before running anything, confirm authentication and the active project:

```bash
gcloud auth list
gcloud config get-value project
gcloud config get-value account
```

These are read-only — run them immediately. You need an account that has
`compute.instances.list` permission across the org, or at minimum across each
project you want to query.

## Step 2 — Classify the operation

Every command below is **read-only** (`list`, `describe`, `projects list`). No
confirmation is needed. Execute freely.

## Step 3 — Get the list of projects in the org

Since instances may live in different projects, start by listing all projects
you have access to:

```bash
gcloud projects list --format="value(projectId)"
```

This returns one project ID per line — ideal for scripting. If you want to scope
to a specific organization or folder, add a filter:

```bash
gcloud projects list --filter="parent.id=ORG_ID AND parent.type=organization" --format="value(projectId)"
```

## Step 4 — Query instances across all projects

### Option A: Single-project query (if instances are in one project)

If you already know the project:

```bash
gcloud compute instances list \
  --project=my-project \
  --filter="machineType:n1-standard-1" \
  --format="json(name,zone.basename(),project)"
```

Key details:

- `--filter="machineType:n1-standard-1"` — server-side filter; the `:` operator
  does a substring match on the machine type URI, which contains `n1-standard-1`
- `--format="json(name,zone.basename(),project)"` — outputs clean JSON with only
  the three fields you need. `zone.basename()` extracts just `us-central1-a`
  from the full zone URI. `project` is automatically available on the resource.

### Option B: Loop across all projects (the full org-wide approach)

Combine project listing with a loop to query every project:

```bash
for PROJECT in $(gcloud projects list --format="value(projectId)"); do
  gcloud compute instances list \
    --project="$PROJECT" \
    --filter="machineType:n1-standard-1" \
    --format="json(name,zone.basename())" \
    2>/dev/null
done
```

This works but has two problems: (1) it outputs separate JSON arrays per
project, and (2) it doesn't include the project ID in the output since
`--format=json` only includes fields present on the resource (and `project` may
not always be populated in the list response depending on gcloud version).

### Option C: Robust cross-project query with jq (recommended)

This is the cleanest approach — loop through projects, inject the project ID
into each result, and merge everything into a single JSON array:

```bash
gcloud projects list --format="value(projectId)" | while read -r PROJECT; do
  gcloud compute instances list \
    --project="$PROJECT" \
    --filter="machineType:n1-standard-1" \
    --format="json(name,zone.basename())" \
    2>/dev/null \
  | jq --arg proj "$PROJECT" '[.[] | {name, zone, project: $proj}]' 2>/dev/null
done | jq -s 'add // []'
```

**How this works:**

1. `gcloud projects list --format="value(projectId)"` — emits one project ID per
   line
2. For each project, `gcloud compute instances list` runs with:
   - `--project="$PROJECT"` — targets that specific project
   - `--filter="machineType:n1-standard-1"` — server-side filter for the machine
     type
   - `--format="json(name,zone.basename())"` — returns only `name` and `zone` as
     clean JSON
3. `jq --arg proj "$PROJECT" '[.[] | {name, zone, project: $proj}]'` — reshapes
   each result to include the project ID
4. `jq -s 'add // []'` — slurps all the per-project arrays and merges them into
   one flat array. The `// []` fallback ensures you get an empty array if no
   instances match anywhere.

### Expected output

```json
[
  {
    "name": "legacy-api-server",
    "zone": "us-central1-a",
    "project": "prod-project-123"
  },
  {
    "name": "batch-worker-02",
    "zone": "europe-west1-b",
    "project": "staging-project-456"
  },
  {
    "name": "test-vm",
    "zone": "us-east1-c",
    "project": "dev-project-789"
  }
]
```

This is clean JSON you can pipe directly into a script.

## Step 5 — Alternative: Use asset inventory (faster for large orgs)

If you have the Cloud Asset API enabled and org-level permissions, Cloud Asset
Inventory can query across all projects in a single call instead of looping:

```bash
gcloud asset search-all-resources \
  --scope="organizations/ORG_ID" \
  --asset-types="compute.googleapis.com/Instance" \
  --query="additionalAttributes.machineType:n1-standard-1" \
  --format="json(name.basename(),location,project)" \
  | jq '[.[] | {name: .name, zone: .location, project: .project}]'
```

This is significantly faster for organizations with many projects because it's a
single API call rather than one per project. However, it requires:

- `cloudasset.assets.searchAllResources` permission at the org level
- The Cloud Asset API enabled
  (`gcloud services enable cloudasset.googleapis.com`)

## Step 6 — Save to a file

Pipe the output to a file for downstream consumption:

```bash
# Using Option C
gcloud projects list --format="value(projectId)" | while read -r PROJECT; do
  gcloud compute instances list \
    --project="$PROJECT" \
    --filter="machineType:n1-standard-1" \
    --format="json(name,zone.basename())" \
    2>/dev/null \
  | jq --arg proj "$PROJECT" '[.[] | {name, zone, project: $proj}]' 2>/dev/null
done | jq -s 'add // []' > n1-standard-1-instances.json
```

## Key flags used

| Flag                                    | Purpose                                                                        |
| --------------------------------------- | ------------------------------------------------------------------------------ |
| `--format="value(projectId)"`           | Raw project IDs, one per line, for scripting                                   |
| `--filter="machineType:n1-standard-1"`  | Server-side filter — only matching instances are returned                      |
| `--format="json(name,zone.basename())"` | JSON output with only selected fields; `basename()` strips the full URI        |
| `--project="$PROJECT"`                  | Override active project per-command — no need to `gcloud config set` in a loop |
| `2>/dev/null`                           | Suppress errors for projects where Compute API is not enabled                  |

## Notes

- All commands here are **read-only** (`list`, `projects list`,
  `asset search-all-resources`). No confirmation is needed.
- The `--filter` flag performs **server-side** filtering, which is faster and
  uses less bandwidth than piping through `grep`.
- `zone.basename()` in `--format` extracts the short zone name (e.g.,
  `us-central1-a`) from the fully qualified URI
  (`https://www.googleapis.com/compute/v1/projects/.../zones/us-central1-a`).
- If some projects don't have the Compute Engine API enabled, the loop will emit
  an error for that project — `2>/dev/null` suppresses this cleanly.
- `jq -s 'add // []'` handles the case where no projects have matching instances
  by returning `[]` instead of `null`.
