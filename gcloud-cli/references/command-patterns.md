# gcloud Command Patterns by Service

Detailed command patterns for common GCP services. Use `--help` on any command
to discover additional flags and subcommands not listed here.

---

## Compute Engine

```bash
# List instances (all zones)
gcloud compute instances list --format="table(name,zone,machineType.basename(),status,networkInterfaces[0].accessConfigs[0].natIP)"

# Describe an instance
gcloud compute instances describe INSTANCE --zone=ZONE --format=yaml

# Create an instance (MUTATING - confirm first)
gcloud compute instances create NAME \
  --zone=ZONE \
  --machine-type=MACHINE_TYPE \
  --image-family=IMAGE_FAMILY \
  --image-project=IMAGE_PROJECT \
  --boot-disk-size=SIZE \
  --tags=TAG1,TAG2

# Stop/Start (MUTATING)
gcloud compute instances stop INSTANCE --zone=ZONE
gcloud compute instances start INSTANCE --zone=ZONE

# SSH into an instance (MUTATING - opens connection)
gcloud compute ssh INSTANCE --zone=ZONE

# Delete (MUTATING - destructive)
gcloud compute instances delete INSTANCE --zone=ZONE

# List disks
gcloud compute disks list --format="table(name,zone,sizeGb,status,users.basename())"

# Firewall rules
gcloud compute firewall-rules list --format="table(name,network,direction,priority,allowed[].map().firewall_rule().list():label=ALLOW)"
gcloud compute firewall-rules describe RULE_NAME
```

## Cloud Run

```bash
# List services
gcloud run services list --format="table(name,region,status.url,status.conditions.status)"

# Describe a service
gcloud run services describe SERVICE --region=REGION --format=yaml

# View revisions
gcloud run revisions list --service=SERVICE --region=REGION

# Deploy (MUTATING)
gcloud run deploy SERVICE \
  --source=. \
  --region=REGION \
  --allow-unauthenticated \
  --set-env-vars="KEY=VALUE"

# Deploy from image (MUTATING)
gcloud run deploy SERVICE \
  --image=IMAGE_URI \
  --region=REGION \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=10

# Update traffic (MUTATING)
gcloud run services update-traffic SERVICE --region=REGION --to-latest

# Read logs
gcloud logging read 'resource.type="cloud_run_revision" AND resource.labels.service_name="SERVICE"' --limit=50 --format=json
```

## Cloud Functions

```bash
# List functions
gcloud functions list --format="table(name,status,trigger,runtime)"

# Describe
gcloud functions describe FUNCTION --region=REGION

# Read logs
gcloud functions logs read FUNCTION --region=REGION --limit=50

# Deploy (MUTATING)
gcloud functions deploy FUNCTION \
  --runtime=RUNTIME \
  --trigger-http \
  --region=REGION \
  --entry-point=ENTRY_POINT \
  --allow-unauthenticated

# Deploy event-triggered (MUTATING)
gcloud functions deploy FUNCTION \
  --runtime=RUNTIME \
  --trigger-topic=TOPIC \
  --region=REGION

# Delete (MUTATING)
gcloud functions delete FUNCTION --region=REGION
```

## GKE (Google Kubernetes Engine)

```bash
# List clusters
gcloud container clusters list --format="table(name,location,currentMasterVersion,currentNodeCount,status)"

# Describe cluster
gcloud container clusters describe CLUSTER --location=LOCATION

# Get credentials (writes to kubeconfig - confirm first)
gcloud container clusters get-credentials CLUSTER --location=LOCATION

# Create cluster (MUTATING - expensive)
gcloud container clusters create CLUSTER \
  --location=LOCATION \
  --num-nodes=3 \
  --machine-type=e2-medium \
  --enable-autoscaling --min-nodes=1 --max-nodes=5

# Resize node pool (MUTATING)
gcloud container clusters resize CLUSTER \
  --location=LOCATION \
  --node-pool=POOL \
  --num-nodes=N

# Delete cluster (MUTATING - destructive)
gcloud container clusters delete CLUSTER --location=LOCATION
```

## IAM

```bash
# View project IAM policy
gcloud projects get-iam-policy PROJECT_ID --format=json

# List bindings for a specific member
gcloud projects get-iam-policy PROJECT_ID \
  --flatten="bindings[].members" \
  --filter="bindings.members:user@example.com" \
  --format="table(bindings.role)"

# Add binding (MUTATING)
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="user:EMAIL" \
  --role="roles/ROLE"

# Remove binding (MUTATING)
gcloud projects remove-iam-policy-binding PROJECT_ID \
  --member="user:EMAIL" \
  --role="roles/ROLE"

# List service accounts
gcloud iam service-accounts list --format="table(email,displayName,disabled)"

# Create service account (MUTATING)
gcloud iam service-accounts create SA_NAME \
  --display-name="Display Name" \
  --description="Description"

# List roles
gcloud iam roles list --filter="stage=GA" --format="table(name,title)"

# Describe a role
gcloud iam roles describe roles/ROLE_NAME
```

## Cloud Storage

```bash
# List buckets
gcloud storage ls

# List objects in a bucket
gcloud storage ls gs://BUCKET/PREFIX --recursive

# Cat a file
gcloud storage cat gs://BUCKET/PATH

# Get bucket metadata
gcloud storage buckets describe gs://BUCKET

# Copy files (MUTATING)
gcloud storage cp LOCAL_PATH gs://BUCKET/PATH
gcloud storage cp gs://BUCKET/PATH LOCAL_PATH   # download is safe
gcloud storage cp -r LOCAL_DIR gs://BUCKET/DIR   # recursive upload

# Remove (MUTATING - destructive)
gcloud storage rm gs://BUCKET/PATH
gcloud storage rm -r gs://BUCKET/DIR              # recursive delete

# Create bucket (MUTATING)
gcloud storage buckets create gs://BUCKET --location=LOCATION
```

## Cloud SQL

```bash
# List instances
gcloud sql instances list --format="table(name,databaseVersion,region,state,ipAddresses[0].ipAddress)"

# Describe instance
gcloud sql instances describe INSTANCE --format=yaml

# List databases
gcloud sql databases list --instance=INSTANCE

# Connect (opens connection - confirm first)
gcloud sql connect INSTANCE --user=USER

# Create instance (MUTATING - expensive, takes minutes)
gcloud sql instances create INSTANCE \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=REGION \
  --root-password=PASSWORD

# Patch instance (MUTATING)
gcloud sql instances patch INSTANCE \
  --tier=db-g1-small \
  --backup-start-time=04:00

# Delete instance (MUTATING - destructive, irreversible)
gcloud sql instances delete INSTANCE
```

## Pub/Sub

```bash
# List topics
gcloud pubsub topics list --format="table(name)"

# List subscriptions
gcloud pubsub subscriptions list --format="table(name,topic,ackDeadlineSeconds)"

# Describe topic
gcloud pubsub topics describe TOPIC

# Create topic (MUTATING)
gcloud pubsub topics create TOPIC

# Create subscription (MUTATING)
gcloud pubsub subscriptions create SUB --topic=TOPIC --ack-deadline=60

# Publish message (MUTATING)
gcloud pubsub topics publish TOPIC --message="MESSAGE"

# Pull messages (read-only)
gcloud pubsub subscriptions pull SUB --limit=10 --auto-ack

# Delete (MUTATING)
gcloud pubsub topics delete TOPIC
gcloud pubsub subscriptions delete SUB
```

## Cloud Logging

```bash
# Read recent logs
gcloud logging read "resource.type=RESOURCE_TYPE" --limit=50 --format=json

# Filter by severity
gcloud logging read "severity>=ERROR" --limit=20

# Filter by time
gcloud logging read 'timestamp>="2024-01-01T00:00:00Z"' --limit=100

# Filter by specific resource
gcloud logging read 'resource.type="gce_instance" AND resource.labels.instance_id="ID"' --limit=50

# List log names
gcloud logging logs list

# Read specific log
gcloud logging read "logName=projects/PROJECT/logs/LOG_NAME" --limit=20
```

## Networking

```bash
# List VPC networks
gcloud compute networks list --format="table(name,autoCreateSubnetworks,subnetworks.len())"

# List subnets
gcloud compute networks subnets list --format="table(name,region,network.basename(),ipCidrRange)"

# Describe network
gcloud compute networks describe NETWORK

# List addresses (IPs)
gcloud compute addresses list --format="table(name,region,address,status)"

# Create network (MUTATING)
gcloud compute networks create NETWORK --subnet-mode=custom

# Create subnet (MUTATING)
gcloud compute networks subnets create SUBNET \
  --network=NETWORK \
  --region=REGION \
  --range=CIDR
```

## Project and Services

```bash
# List enabled APIs
gcloud services list --enabled --format="table(name,title)"

# List available APIs
gcloud services list --available --filter="name:compute" --format="table(name,title)"

# Enable an API (MUTATING)
gcloud services enable SERVICE_NAME

# Disable an API (MUTATING)
gcloud services disable SERVICE_NAME

# List projects
gcloud projects list --format="table(projectId,name,projectNumber)"

# Describe project
gcloud projects describe PROJECT_ID

# Set project
gcloud config set project PROJECT_ID
```

## Useful Global Flags

| Flag                      | Purpose                                        |
| ------------------------- | ---------------------------------------------- |
| `--format=json`           | Machine-readable JSON output                   |
| `--format="table(f1,f2)"` | Custom table columns                           |
| `--format="value(field)"` | Raw value, good for scripting                  |
| `--format=yaml`           | YAML output for detailed inspection            |
| `--filter="EXPRESSION"`   | Server-side filtering                          |
| `--limit=N`               | Limit number of results                        |
| `--sort-by=FIELD`         | Sort results                                   |
| `--project=PROJECT`       | Override active project for this command       |
| `--quiet`                 | Suppress prompts (use with caution)            |
| `--verbosity=debug`       | Debug output for troubleshooting gcloud itself |
| `--log-http`              | Log HTTP requests/responses for debugging      |
