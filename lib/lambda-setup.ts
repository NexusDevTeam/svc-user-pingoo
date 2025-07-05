import {
  Stack,
  aws_lambda as lambda,
  aws_dynamodb as dynamodb,
  aws_ssm as ssm,
  aws_iam as iam,
  aws_sns as sns,
  aws_logs as logs,
  RemovalPolicy,
  Duration,
} from "aws-cdk-lib";
import * as sns_subscriptions from "aws-cdk-lib/aws-sns-subscriptions";
import { LambdaFunctions, LambdaEntity, LambdaInfo, SnsTopics, SnsSubscribeDetails, ResolverFunctions } from "../types/types";
import { Topic } from "aws-cdk-lib/aws-sns";
import dotenv from 'dotenv'
dotenv.config()
export class LambdaSetup {
  private stack: Stack;
  private lambdaFunctions: LambdaFunctions[] = [];
  private resolverFunctions: ResolverFunctions[] = [];
  private lambdasStructure: LambdaEntity[] = [];
  private snsTopics: SnsTopics[] = [];
  private readonly DEFAULT_TIMEOUT = Duration.seconds(30);
  private readonly LOG_RETENTION = logs.RetentionDays.THREE_DAYS;
  private readonly LOG_LEVEL = "DEBUG";

  constructor(stack: Stack, userTopic: Topic) {
    this.stack = stack;
    this.setupSnsTopics(userTopic)
    this.setupLambdaStructure();
  }

  private setupLambdaStructure(): void {
    this.lambdasStructure = [
      {
        nameEntity: "house",
        lambdas: [
        ],
        resolvers: {
          query: [
          ],
          mutation: []
        }
      },
    ];
  }

  public setupLambdas(userTable: dynamodb.Table): void {

    this.lambdasStructure.forEach((lambdaEntity) => {
      lambdaEntity.lambdas.forEach((lambda) => {
        const lambdaFunction = this.createLambdaFunction(
          `lambda/${lambdaEntity.nameEntity}/`,
          lambda,
          userTable
        );
        this.subscribeToSnsTopics(lambdaFunction, lambda.snsSubscribeDetails || []);
      });

      lambdaEntity.resolvers.query.forEach((resolver) => {
        this.createLambdaFunction(
          `resolvers/${lambdaEntity.nameEntity}/query`,
          resolver,
          userTable,
          true
        );
      });
      lambdaEntity.resolvers.mutation.forEach((resolver) => {
        this.createLambdaFunction(
          `resolvers/${lambdaEntity.nameEntity}/mutation`,
          resolver,
          userTable,
          true
        );
      });
    });
  }

  private setupSnsTopics(userTopic: Topic): void {
    let topicName: string[] = []

    topicName.forEach((name) => {
      this.snsTopics.push(
        {
          name: name,
          topicSns: sns.Topic.fromTopicArn(
            this.stack,
            `ImportedTopic-${name}`,
            ssm.StringParameter.valueForStringParameter(
              this.stack,
              `/tucanto/sns/${name}Arn`
            )
          ) as Topic
        }
      )
    })
    this.snsTopics.push({
      name: "UserTopic",
      topicSns: userTopic
    })
  }

  private createLambdaFunction(
    codePath: string,
    lambdaInfo: LambdaInfo,
    userTable: dynamodb.Table,
    isResolver?: boolean
  ): lambda.Function {
    const lambdaRole = this.createLambdaRole(lambdaInfo.name, userTable);
    const lambdaFunction = new lambda.Function(this.stack, `${lambdaInfo.name}Function`, {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: `${codePath}/${lambdaInfo.name}.handler`,
      code: lambda.Code.fromAsset('app/', { exclude: ["tests", "*.md"] }),
      environment: {
        USER_TABLE: userTable.tableName,
        REGION: this.stack.region,
        LOG_LEVEL: this.LOG_LEVEL,
        SNS_USER_TOPIC: this.snsTopics.find((snsTopic) => snsTopic.name == "UserTopic")?.topicSns.topicArn || '',
      },
      role: lambdaRole,
      timeout: lambdaInfo.timeout || this.DEFAULT_TIMEOUT,
    });

    this.createLogGroup(lambdaFunction.functionName, lambdaInfo.name);
    if (isResolver) this.resolverFunctions.push({ name: lambdaInfo.name, lambda: lambdaFunction })
    this.lambdaFunctions.push({ name: lambdaInfo.name, lambda: lambdaFunction });
    return lambdaFunction;
  }

  private createLambdaRole(
    name: string,
    userTable: dynamodb.Table
  ): iam.Role {
    return new iam.Role(this.stack, `${name}Role`, {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      inlinePolicies: {
        DynamoDBAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: ["dynamodb:*"],
              resources: [userTable.tableArn, `${userTable.tableArn}/index/*`],
            }),
          ],
        }),
        LogAccess: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents",
              ],
              resources: [
                `arn:aws:logs:${this.stack.region}:${this.stack.account}:log-group:/aws/lambda/${name}:*`,
              ],
            }),
          ],
        }),
        SnsPublish: new iam.PolicyDocument(
          {
            statements: [
              new iam.PolicyStatement({
                actions: ["sns:Publish"],
                resources: [this.snsTopics.find((snsTopic) => snsTopic.name == "UserTopic")!.topicSns.topicArn]
              })
            ]
          }
        )
      },
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole"
        ),
      ],
    });
  }

  private createLogGroup(functionName: string, name: string): void {
    const logGroupName = `/aws/lambda/${functionName}`;
    const existingLogGroup = logs.LogGroup.fromLogGroupName(
      this.stack,
      `${name}ExistingLogGroup`,
      logGroupName
    );

    if (!existingLogGroup) {
      new logs.LogGroup(this.stack, `${name}LogGroup`, {
        logGroupName,
        retention: this.LOG_RETENTION,
        removalPolicy: RemovalPolicy.DESTROY,
      });
    }
  }

  private subscribeToSnsTopics(
    lambdaFunction: lambda.Function,
    snsSubscribeDetails: SnsSubscribeDetails[] | undefined
  ): void {
    if (!snsSubscribeDetails) return

    snsSubscribeDetails.forEach((snsSubDetails) => {
      if (!snsSubDetails) return
      const snsTopic = this.snsTopics.find((snsTopic) => snsTopic.name === snsSubDetails.name);


      const filterPolicy: { [key: string]: sns.FilterOrPolicy } = {};

      Object.entries(snsSubDetails.filter).forEach(([field, values]) => {
        filterPolicy[field] = sns.FilterOrPolicy.filter(
          sns.SubscriptionFilter.stringFilter({
            allowlist: values,
          })
        );
      });

      snsTopic!.topicSns?.addSubscription(
        new sns_subscriptions.LambdaSubscription(lambdaFunction, {
          filterPolicyWithMessageBody: filterPolicy,
        })
      );
    });
  }

  public getLambdasFunctions(): LambdaFunctions[] {
    return this.lambdaFunctions;
  }

  public getResolversFunctions(): ResolverFunctions[] {
    return this.resolverFunctions;
  }
}