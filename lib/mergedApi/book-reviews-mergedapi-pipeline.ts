import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {CodePipeline, CodePipelineSource, ShellStep} from 'aws-cdk-lib/pipelines';
import {SecretValue} from "aws-cdk-lib";
import {BookReviewsMergedApiStage} from "./book-reviews-mergedapi-stage";

export class BookReviewsMergedApiPipeline extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);
        const githubAccessToken = SecretValue.secretsManager('github-token')
        const pipeline = new CodePipeline(this, 'BookReviewsMergedApiPipeline', {
            synth: new ShellStep('Synth', {
                input: CodePipelineSource.gitHub('ndejaco2/MergedApiCICD', "main",  {
                    authentication: githubAccessToken
                }),
                commands: ["npm ci", "npm run build", "npx cdk synth"]
            }),
            pipelineName: 'BookReviewsMergedApiPipeline',
        });

        pipeline.addStage(new BookReviewsMergedApiStage(this, "BookReviewsMergedApiBetaStage", {
            env: {
                region: "us-east-1"
            },
            stageName: 'beta'
        }));

        pipeline.addStage(new BookReviewsMergedApiStage(this, "BookReviewsMergedApiProdStage", {
            env: {
                region: "us-east-1"
            },
            stageName: 'prod'
        }));
    }
}