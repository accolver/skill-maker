# Pipeline Stages Reference

CDK CodePipeline configuration for staged Next.js deployments with manual
approval gate.

## Table of Contents

1. [Pipeline Stack Overview](#pipeline-stack-overview)
2. [Source Stage](#source-stage)
3. [Build Stage](#build-stage)
4. [Deploy Staging Stage](#deploy-staging-stage)
5. [Smoke Test Stage](#smoke-test-stage)
6. [Manual Approval Stage](#manual-approval-stage)
7. [Deploy Production Stage](#deploy-production-stage)
8. [Complete Pipeline Example](#complete-pipeline-example)

---

## Pipeline Stack Overview

```
Source → Build (staging) → Deploy Staging → Smoke Test → Manual Approval → Build (prod) → Deploy Production
```

The pipeline uses AWS CodePipeline with CodeBuild for the build steps and
CloudFormation actions for CDK deployments.

---

## Source Stage

```typescript
import * as codepipeline from "aws-cdk-lib/aws-codepipeline";
import * as codepipeline_actions from "aws-cdk-lib/aws-codepipeline-actions";

const sourceOutput = new codepipeline.Artifact("SourceOutput");

// GitHub source (using CodeStar connection)
const sourceAction = new codepipeline_actions.CodeStarConnectionsSourceAction({
  actionName: "GitHub",
  owner: "your-org",
  repo: "your-nextjs-app",
  branch: "main",
  connectionArn:
    "arn:aws:codestar-connections:us-east-1:ACCOUNT:connection/xxx",
  output: sourceOutput,
  triggerOnPush: true,
});
```

**Alternatives:**

- `CodeCommitSourceAction` for AWS CodeCommit
- `S3SourceAction` for S3-triggered deployments
- `GitHubSourceAction` (legacy, uses OAuth tokens — prefer CodeStar)

---

## Build Stage

Separate builds per environment because `NEXT_PUBLIC_*` vars are baked at build
time.

```typescript
import * as codebuild from "aws-cdk-lib/aws-codebuild";

function createBuildProject(
  scope: Construct,
  id: string,
  envName: string,
  envConfig: EnvironmentConfig,
): codebuild.PipelineProject {
  return new codebuild.PipelineProject(scope, id, {
    projectName: `${envName}-nextjs-build`,
    environment: {
      buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
      computeType: codebuild.ComputeType.MEDIUM,
    },
    environmentVariables: {
      NODE_ENV: { value: "production" },
      // NEXT_PUBLIC_* vars baked into the build
      ...Object.fromEntries(
        Object.entries(envConfig.nextPublicVars).map(([k, v]) => [
          k,
          { value: v },
        ]),
      ),
    },
    buildSpec: codebuild.BuildSpec.fromObject({
      version: "0.2",
      phases: {
        install: {
          "runtime-versions": { nodejs: "20" },
          commands: ["npm ci"],
        },
        build: {
          commands: [
            "npm run build",
            // Verify standalone output exists
            "test -d .next/standalone || (echo 'ERROR: standalone output not found. Set output: standalone in next.config.js' && exit 1)",
          ],
        },
      },
      artifacts: {
        "base-directory": ".",
        files: [
          ".next/**/*",
          "public/**/*",
          "package.json",
          "next.config.js",
          "cdk.json",
          "lib/**/*",
          "config/**/*",
          "scripts/**/*",
          "node_modules/**/*",
        ],
      },
      cache: {
        paths: ["node_modules/**/*", ".next/cache/**/*"],
      },
    }),
  });
}

const stagingBuildProject = createBuildProject(
  this,
  "StagingBuild",
  "staging",
  environments.staging,
);
const productionBuildProject = createBuildProject(
  this,
  "ProductionBuild",
  "production",
  environments.production,
);

const stagingBuildOutput = new codepipeline.Artifact("StagingBuildOutput");
const productionBuildOutput = new codepipeline.Artifact(
  "ProductionBuildOutput",
);

const stagingBuildAction = new codepipeline_actions.CodeBuildAction({
  actionName: "BuildForStaging",
  project: stagingBuildProject,
  input: sourceOutput,
  outputs: [stagingBuildOutput],
});

const productionBuildAction = new codepipeline_actions.CodeBuildAction({
  actionName: "BuildForProduction",
  project: productionBuildProject,
  input: sourceOutput,
  outputs: [productionBuildOutput],
});
```

---

## Deploy Staging Stage

```typescript
const deployStagingAction = new codepipeline_actions
  .CloudFormationCreateUpdateStackAction({
  actionName: "DeployStaging",
  stackName: "staging-nextjs-stack",
  templatePath: stagingBuildOutput.atPath(
    "cdk.out/staging-nextjs-stack.template.json",
  ),
  adminPermissions: true,
  extraInputs: [stagingBuildOutput],
  parameterOverrides: {
    envName: "staging",
  },
});
```

---

## Smoke Test Stage

```typescript
const smokeTestProject = new codebuild.PipelineProject(this, "SmokeTest", {
  projectName: "nextjs-smoke-test",
  environment: {
    buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
    computeType: codebuild.ComputeType.SMALL,
  },
  environmentVariables: {
    STAGING_URL: { value: `https://${environments.staging.domainName}` },
  },
  buildSpec: codebuild.BuildSpec.fromObject({
    version: "0.2",
    phases: {
      install: {
        "runtime-versions": { nodejs: "20" },
        commands: [
          "curl -fsSL https://bun.sh/install | bash",
          "export PATH=$HOME/.bun/bin:$PATH",
        ],
      },
      build: {
        commands: [
          "export PATH=$HOME/.bun/bin:$PATH",
          "bun run scripts/smoke-test.ts --url $STAGING_URL",
        ],
      },
    },
  }),
});

const smokeTestAction = new codepipeline_actions.CodeBuildAction({
  actionName: "SmokeTest",
  project: smokeTestProject,
  input: stagingBuildOutput,
});
```

---

## Manual Approval Stage

The critical safety gate between staging and production.

```typescript
import * as sns from "aws-cdk-lib/aws-sns";

const approvalTopic = new sns.Topic(this, "ApprovalTopic", {
  topicName: "nextjs-deployment-approval",
});

// Subscribe approvers (email, Slack webhook, etc.)
// new sns.Subscription(this, "ApproverEmail", { ... });

const manualApprovalAction = new codepipeline_actions.ManualApprovalAction({
  actionName: "ApproveProductionDeploy",
  notificationTopic: approvalTopic,
  additionalInformation: [
    "Next.js deployment to production requires approval.",
    "",
    `Staging URL: https://${environments.staging.domainName}`,
    "Please verify the staging deployment before approving.",
    "",
    "Checklist:",
    "- [ ] Homepage loads correctly",
    "- [ ] Key user flows work (cart, checkout, etc.)",
    "- [ ] No console errors in browser",
    "- [ ] Performance is acceptable",
    "",
    "Approve to deploy to production. Reject to cancel.",
  ].join("\n"),
  externalEntityLink: `https://${environments.staging.domainName}`,
});
```

**Key requirements:**

- SNS notification sent to approvers with staging URL
- `additionalInformation` includes verification checklist
- `externalEntityLink` provides direct link to staging for review
- Blocks indefinitely until approved or rejected
- Pipeline logs who approved and when

---

## Deploy Production Stage

```typescript
const deployProductionAction = new codepipeline_actions
  .CloudFormationCreateUpdateStackAction({
  actionName: "DeployProduction",
  stackName: "production-nextjs-stack",
  templatePath: productionBuildOutput.atPath(
    "cdk.out/production-nextjs-stack.template.json",
  ),
  adminPermissions: true,
  extraInputs: [productionBuildOutput],
  parameterOverrides: {
    envName: "production",
  },
});
```

---

## Complete Pipeline Example

```typescript
const pipeline = new codepipeline.Pipeline(this, "NextjsPipeline", {
  pipelineName: "nextjs-deployment-pipeline",
  restartExecutionOnUpdate: false,
  stages: [
    {
      stageName: "Source",
      actions: [sourceAction],
    },
    {
      stageName: "Build",
      actions: [stagingBuildAction, productionBuildAction],
    },
    {
      stageName: "DeployStaging",
      actions: [deployStagingAction],
    },
    {
      stageName: "SmokeTest",
      actions: [smokeTestAction],
    },
    {
      stageName: "Approval",
      actions: [manualApprovalAction],
    },
    {
      stageName: "DeployProduction",
      actions: [deployProductionAction],
    },
  ],
});
```

**Note:** Both staging and production builds run in parallel in the Build stage
to save time. The staging build output is used for staging deployment and smoke
tests. The production build output waits until after approval to be deployed.
