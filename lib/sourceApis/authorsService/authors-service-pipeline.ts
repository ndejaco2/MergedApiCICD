import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {CodePipeline, CodePipelineSource, ShellStep} from 'aws-cdk-lib/pipelines';
import {SecretValue} from "aws-cdk-lib";
import {AuthorsServiceStage} from "./authors-service-stage";

export class AuthorsServicePipelineStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);
        const githubAccessToken = SecretValue.secretsManager('github-token')
        const pipeline = new CodePipeline(this, 'AuthorsServicePipeline', {
            synth: new ShellStep('Synth', {
                input: CodePipelineSource.gitHub('ndejaco2/MergedApiCICD', "main",  {
                    authentication: githubAccessToken
                }),
                commands: ["npm ci", "npm run build", "npx cdk synth"]
            }),
            pipelineName: 'AuthorsServicePipeline',
        });

        pipeline.addStage(new AuthorsServiceStage(this, "AuthorsServiceBetaStage", {
            env: {
                region: "us-east-1"
            },
            stageName: 'beta'
        }));

        pipeline.addStage(new AuthorsServiceStage(this, "AuthorsServiceProdStage", {
            env: {
                region: "us-east-1"
            },
            stageName: 'prod'
        }));
    }
}