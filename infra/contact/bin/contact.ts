#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { ContactStack } from '../lib/contact-stack';

/**
 * Inputs come from CDK context (`cdk synth -c key=value`) — see README.md. Nothing secret is
 * read here; secrets live in SSM Parameter Store and are referenced by name only.
 */
const app = new cdk.App();

function required(key: string): string {
  const value = app.node.tryGetContext(key);
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Missing required CDK context "${key}". Example: cdk synth -c ${key}=...`);
  }
  return value.trim();
}

const stage = String(app.node.tryGetContext('stage') ?? 'prod').trim().toLowerCase();
if (stage === 'local' || stage === 'test') {
  throw new Error('Stages "local" and "test" are reserved for the local mock and cannot be deployed.');
}

const fromEmail = required('fromEmail');
const allowedOrigins = required('allowedOrigins')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
for (const origin of allowedOrigins) {
  if (!/^https:\/\/[A-Za-z0-9.-]+(:\d+)?$/.test(origin)) {
    throw new Error(`allowedOrigins must be https origins without path or wildcard (got "${origin}")`);
  }
}

const dailySendCap = Number(app.node.tryGetContext('dailySendCap') ?? 50);
if (!Number.isInteger(dailySendCap) || dailySendCap < 1) {
  throw new Error('dailySendCap must be a positive integer');
}

const RUNTIMES: Record<string, lambda.Runtime> = {
  'nodejs20.x': lambda.Runtime.NODEJS_20_X,
  'nodejs22.x': lambda.Runtime.NODEJS_22_X,
};
const runtimeName = String(app.node.tryGetContext('lambdaRuntime') ?? 'nodejs20.x');
const runtime = RUNTIMES[runtimeName];
if (!runtime) {
  throw new Error(`lambdaRuntime must be one of: ${Object.keys(RUNTIMES).join(', ')}`);
}

new ContactStack(app, `EasyPaymentsContact-${stage}`, {
  stage,
  runtime,
  toEmail: String(app.node.tryGetContext('toEmail') ?? 'jantvb@gmail.com').trim(),
  fromEmail,
  sesIdentity: String(app.node.tryGetContext('sesIdentity') ?? fromEmail).trim(),
  allowedOrigins,
  turnstileSecretParam: String(
    app.node.tryGetContext('turnstileSecretParam') ?? `/easy-payments/contact/${stage}/turnstile-secret`,
  ),
  ipHashSecretParam: String(
    app.node.tryGetContext('ipHashSecretParam') ?? `/easy-payments/contact/${stage}/ip-hash-secret`,
  ),
  dailySendCap,
  env: {
    account: process.env['CDK_DEFAULT_ACCOUNT'],
    region: process.env['CDK_DEFAULT_REGION'],
  },
});
