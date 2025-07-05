import { aws_sns as sns, aws_lambda as lambda, Duration } from "aws-cdk-lib";
export interface LambdaFunctions {
  name: string;
  lambda: lambda.Function;
}

export interface ResolverFunctions{
  lambda: lambda.Function;
  name: string;
}
export interface SnsTopics {
  name: string;
  topicSns: sns.Topic;
}
export type LambdaEntity ={
  nameEntity:string;
  lambdas: LambdaInfo[];
  resolvers: {
    query:ResolverInfo[];
    mutation:ResolverInfo[];
  }
}

export type LambdaInfo = {
  name:string;
  timeout?:Duration;
  snsSubscribeDetails?:SnsSubscribeDetails[]
  publishSns?:{
    name:string
  }[]
}
export type ResolverInfo = {
  name:string;
  timeout?:Duration;
  publishSns?:{
    name:string
  }[]
}

export type SnsSubscribeDetails = {
  name: string,
  filter:Record<string,string[]>
  
}