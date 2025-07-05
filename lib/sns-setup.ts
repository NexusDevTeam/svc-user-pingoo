import {
  Stack,
  aws_sns as sns,
  aws_iam as iam,
  aws_ssm as ssm,
  CfnOutput,
} from "aws-cdk-lib";
import { ParameterTier } from "aws-cdk-lib/aws-ssm";
import { SnsTopics } from "../types/types";
/**
 * Configures SNS topics and associated parameters for the BookingStack.
 */
export class SNSSetup {
  private stack: Stack;
  private snsTopics: SnsTopics[];

  /**
   * Constructs a new instance of the SNSSetup class.
   * @param {Stack} stack - The stack on which to deploy the SNS topics.
   */
  constructor(stack: Stack) {
    this.stack = stack;
    this.snsTopics = [];
  }

  /**
   * Sets up SNS topics and their associated permissions.
   */
  public setupTopics(): void {
    //Name sns topics
    const snsNames: string[] = [
      "UserTopic",
    ];
    // ---------- SNS Topics ----------
    snsNames.forEach((name: string) => {
      this.snsTopics.push({
        name: name,
        topicSns: new sns.Topic(this.stack, name, {
          displayName: `${name.split("StatusTopic")[0]} status notifications`,
        }),
      });
    });

    // ---------- IAM Policies ----------

    this.snsTopics.forEach((element: SnsTopics) => {
      // ---------- SSM Parameters ----------
      new ssm.StringParameter(this.stack, `${element.name}ArnParameter`, {
        parameterName: `/tucanto/sns/${element.name}Arn`,
        stringValue: element.topicSns.topicArn,
        tier: ParameterTier.STANDARD,
      });
      // ---------- Outputs ----------
      new CfnOutput(this.stack, `${element.name}ArnOutput`, {
        value: element.topicSns.topicArn,
        description: `The ARN of the ${
          element.name.split("StatusTopic")[0]
        } Status SNS Topic`,
        exportName: `Svc${element.name}ArnOutput`,
      });
    });
  }

  public getSnsTopics(): SnsTopics[] {
    return this.snsTopics;
  }
}
