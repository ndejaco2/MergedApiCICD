import * as cdk from "aws-cdk-lib";
import {Construct} from "constructs";
import { BooksServiceApiStack } from "./books-service-api-stack";

export class BooksServiceStage extends cdk.Stage {
    constructor(scope: Construct, id: string, props: cdk.StageProps) {
        super(scope, id, props);
        new BooksServiceApiStack(this, 'BookServiceStack', props);
    }
}