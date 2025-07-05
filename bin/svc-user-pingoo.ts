#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { SvcUserPingooStack } from '../lib/svc-user-pingoo-stack';

const app = new cdk.App();
new SvcUserPingooStack(app, 'SvcUserPingooStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
});