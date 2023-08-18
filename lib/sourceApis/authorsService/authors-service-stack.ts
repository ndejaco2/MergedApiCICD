import * as cdk from "aws-cdk-lib";
import {Construct} from "constructs";
import {AuthorsServiceApiStack, AuthorsServiceStackProps} from "./authors-service-api-stack";
import {MergeType, SourceApiAssociationConstruct} from "../../constructs/source-api-association-construct";

export class AuthorsServiceStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: AuthorsServiceStackProps) {
        super(scope, id, props);
        const authorsServiceApiStack = new AuthorsServiceApiStack(this, 'AuthorsServiceApiStack', props);

        // Associates this api to the BookReviewsMergedApi
        // This will run a custom resource to merge changes to the Book Reviews Merged API whenever the authors stack is deployed
        new SourceApiAssociationConstruct(this, 'SourceApiAssociation', {
            description: "Authors service API which handles the authors metadata in the system.",
            mergeType: MergeType.MANUAL_MERGE,
            mergedApiArn: cdk.Fn.importValue("BookReviewsMergedApiArn"),
            mergedApiId: cdk.Fn.importValue("BookReviewsMergedApiId"),
            sourceApiArn: authorsServiceApiStack.authorsApi.arn,
            sourceApiId: authorsServiceApiStack.authorsApi.apiId
        });
    }
}
