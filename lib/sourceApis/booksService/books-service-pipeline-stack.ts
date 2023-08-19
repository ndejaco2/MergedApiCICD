import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {CodePipeline, CodePipelineSource, ShellStep} from 'aws-cdk-lib/pipelines';
import {BooksServiceStage} from "./books-service-stage";
import {SecretValue} from "aws-cdk-lib";

export class BooksServicePipelineStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);
        const githubAccessToken = SecretValue.secretsManager('github-token')
        const pipeline = new CodePipeline(this, 'BooksServicePipeline', {
            synth: new ShellStep('Synth', {
                input: CodePipelineSource.gitHub('ndejaco2/MergedApiCICD', "main",  {
                    authentication: githubAccessToken
                }),
                commands: ["npm ci", "npm run build", "npx cdk synth"]
            }),
            pipelineName: 'BooksServicePipeline',
        });

        pipeline.addStage(new BooksServiceStage(this, "BooksServiceBetaStage", {
            env: {
                region: "us-east-1"
            },
            stageName: 'beta'
        }));

        pipeline.addStage(new BooksServiceStage(this, "BooksServiceProdStage", {
            env: {
                region: "us-east-1"
            },
            stageName: 'prod'
        }));
    }
}