/**
 * Environment configuration template for Next.js CDK deployment.
 *
 * Copy this file to cdk/config/<environment>.ts and fill in values.
 * Each environment (staging, production) gets its own config file.
 */

export interface EnvironmentConfig {
  /** AWS account and region */
  env: {
    account: string;
    region: string;
  };

  /** Custom domain name for this environment */
  domainName: string;

  /** ARN of the ACM certificate (must be in us-east-1 for CloudFront) */
  certificateArn: string;

  /** Public API URL injected at build time via NEXT_PUBLIC_API_URL */
  nextPublicApiUrl: string;

  /** CloudWatch log retention in days */
  logRetentionDays: number;

  /** Enable AWS WAF for this environment */
  enableWaf: boolean;

  /** Minimum Lambda concurrency */
  minCapacity: number;

  /** Maximum Lambda concurrency */
  maxCapacity: number;
}

// Example: staging configuration
export const stagingConfig: EnvironmentConfig = {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT || "123456789012",
    region: "us-east-1",
  },
  domainName: "staging.example.com",
  certificateArn:
    process.env.STAGING_CERT_ARN ||
    "arn:aws:acm:us-east-1:123456789012:certificate/example",
  nextPublicApiUrl: "https://api-staging.example.com",
  logRetentionDays: 7,
  enableWaf: false,
  minCapacity: 1,
  maxCapacity: 5,
};

// Example: production configuration
export const productionConfig: EnvironmentConfig = {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT || "123456789012",
    region: "us-east-1",
  },
  domainName: "example.com",
  certificateArn:
    process.env.PRODUCTION_CERT_ARN ||
    "arn:aws:acm:us-east-1:123456789012:certificate/example",
  nextPublicApiUrl: "https://api.example.com",
  logRetentionDays: 90,
  enableWaf: true,
  minCapacity: 3,
  maxCapacity: 50,
};
