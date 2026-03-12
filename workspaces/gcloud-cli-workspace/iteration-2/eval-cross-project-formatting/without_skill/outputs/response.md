# Finding All n1-standard-1 Instances Across Your Org

## Approach

To find all Compute Engine instances using the `n1-standard-1` machine type
across multiple projects in your organization, there are two main approaches:

1. **Use `gcloud asset search-all-resources`** (recommended — single command,
   org-wide)
2. **Iterate over projects with `gcloud compute instances list`** (fallback if
   Cloud Asset API isn't enabled)

---

## Option 1: Cloud Asset Inventory (Recommended)

This queries the Cloud Asset API which indexes resources across your entire org.
It's the most efficient approach — one API call instead of N.

### Step 1: Search for all Compute instances org-wide

```bash
gcloud asset search-all-resources \
  --scope="organizations/YOUR_ORG_ID" \
  --asset-types="compute.googleapis.com/Instance" \
  --query="additionalAttributes.machineType:n1-standard-1" \
  --format="json"
```

This returns all instances across every project in the org. However, the output
schema from the Asset API is different from `gcloud compute instances list`, so
you'd need to post-process it.

### Step 2: Extract and reshape the fields you need

The asset search results include `name`, `location`, and `project` but in a
nested format. Use `--format` with projections:

```bash
gcloud asset search-all-resources \
  --scope="organizations/YOUR_ORG_ID" \
  --asset-types="compute.googleapis.com/Instance" \
  --query="additionalAttributes.machineType:n1-standard-1" \
  --format="json(name.basename(), location, project)"
```

If the built-in formatting doesn't give you clean enough output, pipe through
`jq`:

```bash
gcloud asset search-all-resources \
  --scope="organizations/YOUR_ORG_ID" \
  --asset-types="compute.googleapis.com/Instance" \
  --query="additionalAttributes.machineType:n1-standard-1" \
  --format="json" | \
jq '[.[] | {
  name: (.name | split("/") | last),
  zone: .location,
  project: .project
}]'
```

This produces clean JSON like:

```json
[
  {
    "name": "my-instance-1",
    "zone": "us-central1-a",
    "project": "project-alpha"
  },
  {
    "name": "worker-node-3",
    "zone": "europe-west1-b",
    "project": "project-beta"
  }
]
```

---

## Option 2: Iterate Over Projects (Fallback)

If the Cloud Asset API isn't enabled or you don't have org-level permissions,
iterate over each project.

### Step 1: Get all project IDs in the org

```bash
gcloud projects list --format="value(projectId)"
```

### Step 2: Query each project for n1-standard-1 instances

Loop through each project and collect results:

```bash
gcloud projects list --format="value(projectId)" | while read -r PROJECT; do
  gcloud compute instances list \
    --project="$PROJECT" \
    --filter="machineType:n1-standard-1" \
    --format="json(name, zone.basename(), machineType)" \
    2>/dev/null
done
```

The problem with this approach is each project returns its own JSON array, so
you get multiple arrays instead of one. You need to merge them.

### Step 3: Merge and reshape with jq

```bash
gcloud projects list --format="value(projectId)" | while read -r PROJECT; do
  gcloud compute instances list \
    --project="$PROJECT" \
    --filter="machineType:n1-standard-1" \
    --format="json(name, zone, machineType)" \
    2>/dev/null | \
  jq --arg proj "$PROJECT" '[.[] | {name: .name, zone: (.zone | split("/") | last), project: $proj}]'
done | jq -s 'add // []'
```

**Explanation of the pipeline:**

- `--filter="machineType:n1-standard-1"` — server-side filter so only matching
  instances are returned
- `--format="json(name, zone, machineType)"` — return JSON with only the fields
  we need
- `jq --arg proj "$PROJECT"` — injects the project ID (since
  `gcloud compute instances list` doesn't include it in output by default)
- `.zone | split("/") | last` — the zone field comes back as a full URL like
  `https://www.googleapis.com/compute/v1/projects/my-proj/zones/us-central1-a`,
  so this extracts just `us-central1-a`
- `jq -s 'add // []'` — slurps all the separate arrays and merges them into one
  flat array; `// []` handles the case where no results are found

### Expected output

```json
[
  {
    "name": "web-server-1",
    "zone": "us-central1-a",
    "project": "frontend-prod"
  },
  {
    "name": "api-worker-2",
    "zone": "us-east1-b",
    "project": "backend-staging"
  },
  {
    "name": "batch-processor",
    "zone": "europe-west1-c",
    "project": "data-pipeline"
  }
]
```

---

## Saving Output to a File

To pipe the result into a file for downstream scripting:

```bash
# Using Option 1 (Asset API)
gcloud asset search-all-resources \
  --scope="organizations/YOUR_ORG_ID" \
  --asset-types="compute.googleapis.com/Instance" \
  --query="additionalAttributes.machineType:n1-standard-1" \
  --format="json" | \
jq '[.[] | {
  name: (.name | split("/") | last),
  zone: .location,
  project: .project
}]' > n1_standard_instances.json
```

---

## Notes

- **Permissions**: Option 1 requires `cloudasset.assets.searchAllResources` at
  the org level. Option 2 requires `compute.instances.list` in each project.
- **Performance**: Option 1 is a single API call. Option 2 makes one API call
  per project, which can be slow if you have hundreds of projects.
- **The `--filter` flag** does server-side filtering, which is more efficient
  than fetching all instances and filtering client-side.
- **The `--format` flag** controls output format. `json(field1, field2)` returns
  JSON with only specified fields. `value(field)` returns raw text (one value
  per line). `table(field1, field2)` returns a human-readable table.
- If `jq` is not available, you can use `--format` with more complex
  projections, but `jq` is generally more flexible for reshaping JSON.
