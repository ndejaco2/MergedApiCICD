import * as cdk from "aws-cdk-lib";
import {Construct} from "constructs";
import { BooksServiceSourceApiAssociationStack } from "./books-service-source-api-assoc-stack";

export class BooksServiceSourceApiAssociationStage extends cdk.Stage {
    constructor(scope: Construct, id: string, props: cdk.StageProps) {
        super(scope, id, props);
        new BooksServiceSourceApiAssociationStack(this, 'BooksServiceSourceApiMergeStack', props);
    }
}