/**
 * @fileoverview
 * Location: lib/event_bridge__setup.ts
 */
import { Stack, aws_ssm as ssm } from "aws-cdk-lib";
import { EventBus, Rule, EventPattern } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import { LambdaFunctions } from "../types/types";
export enum EventTypes {
  CREATE_USER = "ss",
  LOGIN_USER = "s",
  LOGOUT_USER = 'slo'
}

export class EventBridgeSetup {
  private stack: Stack;

  constructor(stack: Stack) {
    this.stack = stack;
  }
  setupEventBridge(lambdas: LambdaFunctions[]) {
    // Create and setup Event Source
    //------ Get eventSource from ssm --------
    const eventSource = ssm.StringParameter.valueForStringParameter(
      this.stack,
      "/user-pingoo/auth0/eventSource"
    );

    //------ Create and configure event bus -------
    const eventBus = new EventBus(this.stack, "Auth0EventBus", {
      eventSourceName: eventSource,
    });
   
    const SUPPORTED_LAMBDA_TYPES = [
      "handleAuth0UserEvent",
    ];

    lambdas.forEach((userLambda) => {
      // ------- Create a role for createUser lambda target --------
      if (SUPPORTED_LAMBDA_TYPES.includes(userLambda.name)) {
        const createdRule = new Rule(
          this.stack,
          `${userLambda.name}RuleEventBridge`,
          {
            eventBus,
            eventPattern: {
              source: [eventSource],
              detailType: ["Auth0 log"],
              detail: {
                data: {
                  type: 
                  [EventTypes.CREATE_USER]
                },
              },
            },
          }
        );
        createdRule.addTarget(new LambdaFunction(userLambda.lambda));
      }
    });
  }
}
