import {
  aws_ssm as ssm,
  aws_appsync as appsync,
  Stack,
  aws_iam as iam,
  aws_sqs as sqs,
  CfnOutput,
  aws_logs as logs,
  RemovalPolicy,
  Duration
} from "aws-cdk-lib";
import path from "path";
import * as fs from "fs";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { LambdaFunctions, ResolverFunctions } from "../types/types";

export class AppsyncSetup {
  private stack: Stack;
  private userApi: appsync.CfnGraphQLApi;
  constructor(stack: Stack) {
    this.stack = stack;
  }
  setupAppsync() {
    //-------Define roles to access Logs---------
    const roleApi = new iam.Role(this.stack, "UserApiRole", {
      assumedBy: new iam.ServicePrincipal("appsync.amazonaws.com"),
      description: "Role to link to user api",
      roleName: "userApi-Role",
      inlinePolicies: {
        CloudWatchLogsPolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              effect: iam.Effect.ALLOW,
              actions: [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents",
              ],
              resources: ["arn:aws:logs:*:*:*"],
            })
          ],
        }),
      },
    });
    //-------Define user API---------
    this.userApi = new appsync.CfnGraphQLApi(this.stack, "UserApi", {
      authenticationType: appsync.AuthorizationType.API_KEY,
      name: "UserApi",
      logConfig: {
        fieldLogLevel: "ALL",
        cloudWatchLogsRoleArn: roleApi.roleArn,
      },
    });

    new appsync.CfnApiKey(this.stack, "userApiKey", {
      apiId: this.userApi.attrApiId,
      description: "userApiKey"
    })

    new logs.LogGroup(this.stack, "userApiLogsGroup", {
      logGroupName: `/aws/appsync/apis/${this.userApi.attrApiId}`,
      removalPolicy: RemovalPolicy.DESTROY,
      retention: RetentionDays.THREE_DAYS
    });

    //-------Define schema and link to user api---------
    const graphqlSchema = fs.readFileSync(
      path.join(__dirname, "../graphql/schema.graphql"),
      { encoding: "utf-8" }
    );
    new appsync.CfnGraphQLSchema(this.stack, "userApiSchema", {
      apiId: this.userApi.attrApiId,
      definition: graphqlSchema,
    });

    new ssm.StringParameter(
      this.stack,
      "userApiUrlParameter",
      {
        parameterName: "/tucanto/appsync/SvcUserApiUrl",
        stringValue: this.userApi.attrGraphQlUrl,
      }
    );
  }
  /**
   * Sets up resolvers for the AppSync API, linking Lambda functions and SQS services with appropriate roles and permissions.
   *
   * @param lambdaFunctions - An array of LambdaFunctions to be used as data sources.
   */
  setupResolvers(
    resolverFunctions: ResolverFunctions[]
  ) {

    const ignoreLambdas = [''];

    resolverFunctions.forEach(({ name, lambda }) => {
      if (ignoreLambdas.includes(name)) {
        return;
      }
      const dataSourceRole = new iam.Role(this.stack, `${name}DataSourceRole`, {
        assumedBy: new iam.ServicePrincipal("appsync.amazonaws.com"),
        inlinePolicies: {
          LambdaInvokePolicy: new iam.PolicyDocument({
            statements: [
              new iam.PolicyStatement({
                actions: ["lambda:InvokeFunction"],
                resources: [lambda.functionArn],
              })
            ],
          }),
        },
      });
      const dataSourceLambda = new appsync.CfnDataSource(
        this.stack,
        `${name}DataSource`,
        {
          apiId: this.userApi.attrApiId,
          name: `${name}DataSource`,
          type: "AWS_LAMBDA",
          lambdaConfig: {
            lambdaFunctionArn: lambda.functionArn,
          },
          serviceRoleArn: dataSourceRole.roleArn, // Attach the role to the data source
        }
      );
      new appsync.CfnResolver(this.stack, `${name}Resolver`, {
        apiId: this.userApi.attrApiId,
        typeName:
          name.startsWith("get") || name.startsWith("list")
            ? "Query"
            : "Mutation",
        fieldName: name,
        dataSourceName: dataSourceLambda.name,
        requestMappingTemplate:
          `{
              "version": "2018-05-29",
              "operation": "Invoke",
              "payload": {
                "arguments": $util.toJson($context.arguments),
                "identity": $util.toJson($context.identity),
                "source": $util.toJson($context.source),
                "request": $util.toJson($context.request),
                "prev": $util.toJson($context.prev),
                "info":$util.toJson($context.info),
                "selectionSetList": $util.toJson($context.info.selectionSetList)
              }
            }`,
        responseMappingTemplate: `
              #if($context.error)
                #set($errorMessage = "An unknown error occurred.")
                #set($errorType = "500")

                #if($context.error.message)
                  #set($parsedError = {})
                  
                  #if($util.toJson($context.error.message))
                    #set($parsedError = $util.parseJson($context.error.message))
                  #else
                    #set($errorMessage = "$context.error.message")
                  #end

                  #if($parsedError.errorMessage)
                    #set($errorMessage = "$parsedError.errorMessage")
                  #end
                  #if($parsedError.errorType)
                    #set($errorType = "$parsedError.errorType")
                  #end
                #end

                $util.error($errorMessage, $errorType)
              #end

              $util.toJson($context.result)
          `,
      }).addDependency(dataSourceLambda);
    });
  }
  /**
   * Retrieves the configured AppSync GraphQL API instance.
   *
   * @returns The configured CfnGraphQLApi instance representing the user API.
   */
  getUserApi(): appsync.CfnGraphQLApi {
    return this.userApi;
  }
}
