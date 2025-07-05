// lib/dynamodb_setup.ts

import {
  CfnOutput,
  RemovalPolicy,
  Stack,
  aws_dynamodb as dynamodb,
  aws_ssm as ssm,
} from "aws-cdk-lib";
import { ParameterTier } from "aws-cdk-lib/aws-ssm";

/**
 * Configures DynamoDB tables for the HouseStack.
 */
export class DynamoDBSetup {
  private stack: Stack;
  private userTable: dynamodb.Table;

  /**
   * Constructs a new instance of the DynamoDBSetup class.
   * @param {Stack} stack - The stack on which to deploy the DynamoDB tables.
   */
  constructor(stack: Stack) {
    this.stack = stack;
  }

  /**
   * Sets up DynamoDB tables and their configurations.
   */
  public setupTables(): void {
    this.userTable = new dynamodb.Table(this.stack, "House", {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Adding a Global Secondary Index for categories with a sort key
    this.userTable.addGlobalSecondaryIndex({
      indexName: "GSI1",
      partitionKey: { name: "GSI1PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "GSI1SK", type: dynamodb.AttributeType.STRING },
    });

    // ---------- SSM Parameters ----------
    new ssm.StringParameter(this.stack, "svcUserTableArn", {
      parameterName: "/tucanto/dynamodb/svcuserTableArn",
      stringValue: this.userTable.tableArn,
      tier: ParameterTier.STANDARD,
    });
  }

  public getUserTable(): dynamodb.Table {
    return this.userTable;
  }

}
