import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { LambdaSetup } from './lambda-setup';
import { DynamoDBSetup } from './dynamodb-setup';
import { SNSSetup } from './sns-setup';
import { AppsyncSetup } from './appsync-setup';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class SvcUserPingooStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    //-----------Setup DynamoDB--------------------
    const dynamoDbSetup = new DynamoDBSetup(this);
    dynamoDbSetup.setupTables();
    //-----------Setup Sns-------------------------
    const snsSetup = new SNSSetup(this)
    snsSetup.setupTopics()
    //-----------Setup Lambda Functions------------
    const lambdaSetup = new LambdaSetup(this,snsSetup.getSnsTopics()[0].topicSns) ;
    lambdaSetup.setupLambdas(dynamoDbSetup.getUserTable());
    //-----------Setup Appsync Api/Resolvers-------
    const appsyncSetup = new AppsyncSetup(this);
    appsyncSetup.setupAppsync();
    appsyncSetup.setupResolvers(lambdaSetup.getResolversFunctions()); 
  }
}
