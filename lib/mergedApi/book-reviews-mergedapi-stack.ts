import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {CfnGraphQLApi} from "aws-cdk-lib/aws-appsync";
import {Role, ServicePrincipal} from "aws-cdk-lib/aws-iam";
import {CfnOutput} from "aws-cdk-lib";

export interface BookReviewsMergedApiStackProps  extends cdk.StackProps {
}

export class BookReviewsMergedApiStack extends cdk.Stack {
  private bookReviewsMergedApi: CfnGraphQLApi;

  constructor(scope: Construct, id: string, props: BookReviewsMergedApiStackProps) {
    super(scope, id, props);

    const executionRole = new Role(this, 'MergedApiExecutionRole', {
      assumedBy: new ServicePrincipal('appsync.amazonaws.com')
    });

    this.bookReviewsMergedApi = new CfnGraphQLApi(this, 'BookReviewsMergedApi', {
      authenticationType: "API_KEY",
      name: 'BookReviewsMergedApi',
      apiType: 'MERGED',
      mergedApiExecutionRoleArn: executionRole.roleArn,
    });

    new CfnOutput(this, 'BookReviewsMergedApiArn', {
      exportName: 'BookReviewsMergedApiArn',
      value: this.bookReviewsMergedApi.attrArn
    })

    new CfnOutput(this, 'BookReviewsMergedApiId', {
      exportName: 'BookReviewsMergedApiId',
      value: this.bookReviewsMergedApi.attrApiId
    });
  }
}