import * as cdk from "aws-cdk-lib";
import {Construct} from "constructs";
import {AuthorsServiceApiStack} from "./authors-service-api-stack";
import {MergeType, SourceApiAssociationConstruct} from "../../constructs/source-api-association-construct";
import {Effect, Policy, PolicyStatement, Role} from "aws-cdk-lib/aws-iam";

export class AuthorsServiceStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: cdk.StageProps) {
        super(scope, id);

        const authorsServiceApiStack = new AuthorsServiceApiStack(this, 'AuthorsServiceApiStack', props);

        const mergedApiExecutionRole = Role.fromRoleArn(this, 'MergedApiExecutionRole',
            cdk.Fn.importValue(`${props.stageName}-BookReviewsMergedApiExecutionRoleArn`))

        // Associates this api to the BookReviewsMergedApi
        // This will run a custom resource to merge changes to the Book Reviews Merged API whenever the authors stack is deployed
        const sourceApiAssociation = new SourceApiAssociationConstruct(this, 'SourceApiAssociation', {
            description: "Authors service API which handles the authors metadata in the system.",
            mergeType: MergeType.MANUAL_MERGE,
            mergedApiArn: cdk.Fn.importValue(`${props.stageName}-BookReviewsMergedApiArn`),
            mergedApiId: cdk.Fn.importValue(`${props.stageName}-BookReviewsMergedApiId`),
            sourceApiArn: authorsServiceApiStack.authorsApi.arn,
            sourceApiId: authorsServiceApiStack.authorsApi.apiId,
            mergedApiExecutionRole: mergedApiExecutionRole
        });

        sourceApiAssociation.node.addDependency(authorsServiceApiStack);
    }
}
