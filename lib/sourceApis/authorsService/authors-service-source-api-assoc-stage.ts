import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { AuthorsServiceSourceApiAssociationStack } from "./authors-service-source-api-assoc-stack";

export class AuthorsServiceSourceApiAssociationStage extends cdk.Stage {

    constructor(scope: Construct, id: string, props: cdk.StageProps) {
        super(scope, id)
        const stack = new AuthorsServiceSourceApiAssociationStack(this, 'AuthorsServiceSourceApiMergeStack', props)
    }  
}
