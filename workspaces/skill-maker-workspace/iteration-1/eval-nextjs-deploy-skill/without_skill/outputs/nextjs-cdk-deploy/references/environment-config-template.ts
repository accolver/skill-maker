/**
 * Environment Configuration Template
 *
 * Copy this file to your project at: cdk/config/<stage>.ts
 * Replace placeholder values with your actual configuration.
 */

export interface ComputeConfig {
  /** Compute type: 'fargate' for containers, 'lambda' for serverless */
  type: 'fargate' | 'lambda';
  /** CPU units (Fargate only): 256, 512, 1024, 2048, 4096 */
  cpu?: number;
  /** Memory in MB (Fargate only) */
  memory?: number;
  /** Desired number of running tasks/instances */
  desiredCount: number;
  /** Minimum tasks for auto-scaling */
  minCount: number;
  /** Maximum tasks for auto-scaling */
  maxCount: number;
}

export interface CdnConfig {
  /** Enable CloudFront distribution */
  enabled: boolean;
  /** CloudFront price class */
  priceClass: 'PriceClass_100' | 'PriceClass_200' | 'PriceClass_All';
  /** Default cache TTL in seconds */
  cacheTtl: number;
}

export interface MonitoringConfig {
  /** Email for alarm notifications */
  alarmEmail: string;
  /** 5xx error rate threshold (percent) */
  errorRateThreshold: number;
  /** P99 latency threshold (milliseconds) */
  latencyThreshold: number;
}

export interface EnvironmentConfig {
  /** AWS environment (account + region) */
  env: {
    account: string;
    region: string;
  };
  /** Application name (used for resource naming) */
  appName: string;
  /** Deployment stage */
  stage: 'staging' | 'production';
  /** Domain name for the application */
  domain: string;
  /** ACM certificate ARN (must be in us-east-1 for CloudFront) */
  certificateArn: string;
  /** Compute configuration */
  compute: ComputeConfig;
  /** CDN configuration */
  cdn: CdnConfig;
  /** Monitoring configuration */
  monitoring: MonitoringConfig;
  /** Runtime environment variables for Next.js */
  environment: Record<string, string>;
}

// ─── Example: Staging Configuration ─────────────────────────────────────────

export const stagingConfig: EnvironmentConfig = {
  env: {
    account: '123456789012',       // ← Replace with your AWS account ID
    region: 'us-east-1',           // ← Replace with your preferred region
  },
  appName: 'my-nextjs-app',       // ← Replace with your app name
  stage: 'staging',
  domain: 'staging.example.com',  // ← Replace with your staging domain
  certificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
  compute: {
    type: 'fargate',
    cpu: 512,
    memory: 1024,
    desiredCount: 1,
    minCount: 1,
    maxCount: 2,
  },
  cdn: {
    enabled: true,
    priceClass: 'PriceClass_100',
    cacheTtl: 60,                  // Short TTL for staging
  },
  monitoring: {
    alarmEmail: 'dev-team@example.com',
    errorRateThreshold: 10,        // More lenient for staging
    latencyThreshold: 5000,
  },
  environment: {
    NEXT_PUBLIC_API_URL: 'https://api-staging.example.com',
    NEXT_PUBLIC_ENV: 'staging',
    // Use SSM Parameter Store for secrets:
    DATABASE_URL: '{{resolve:ssm:/myapp/staging/database-url}}',
    SECRET_KEY: '{{resolve:ssm:/myapp/staging/secret-key}}',
  },
};

// ─── Example: Production Configuration ──────────────────────────────────────

export const productionConfig: EnvironmentConfig = {
  env: {
    account: '123456789012',
    region: 'us-east-1',
  },
  appName: 'my-nextjs-app',
  stage: 'production',
  domain: 'www.example.com',
  certificateArn: 'arn:aws:acm:us-east-1:123456789012:certificate/yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy',
  compute: {
    type: 'fargate',
    cpu: 1024,
    memory: 2048,
    desiredCount: 3,               // Higher for production
    minCount: 2,
    maxCount: 10,
  },
  cdn: {
    enabled: true,
    priceClass: 'PriceClass_200',  // Broader CDN coverage
    cacheTtl: 300,                 // Longer TTL for production
  },
  monitoring: {
    alarmEmail: 'ops-team@example.com',
    errorRateThreshold: 1,         // Stricter for production
    latencyThreshold: 3000,
  },
  environment: {
    NEXT_PUBLIC_API_URL: 'https://api.example.com',
    NEXT_PUBLIC_ENV: 'production',
    DATABASE_URL: '{{resolve:ssm:/myapp/production/database-url}}',
    SECRET_KEY: '{{resolve:ssm:/myapp/production/secret-key}}',
  },
};
