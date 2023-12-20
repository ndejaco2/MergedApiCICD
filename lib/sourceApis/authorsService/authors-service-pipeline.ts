import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {CodeBuildStep, CodePipeline, CodePipelineSource, ShellStep} from 'aws-cdk-lib/pipelines';
import {SecretValue} from "aws-cdk-lib";
import {AuthorsServiceStage} from "./authors-service-stage";
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

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

        const region = 'us-east-1';

        const sourceApiBetaStage = new AuthorsServiceStage(this, "AuthorsServiceBetaStage", {
            env: {
                region: region
            },
            stageName: 'beta',
        });

        const evaluateCodePolicyStatement = new PolicyStatement({
            actions: ["appsync:EvaluateCode"],
            resources: ["*"],
        })

        const integTestPolicyStatement = new PolicyStatement({
            actions: ["appsync:GraphQL", "cloudformation:ListExports"],
            resources: ["*"],
        })

        pipeline.addStage(sourceApiBetaStage, {
            pre: [
                new CodeBuildStep('Unit-Test', {
                    commands: [
                        "npm ci", 
                        "npm run build", 
                        "npm test unit-tests/sourceApis/authorsService"],
                    rolePolicyStatements: [
                        evaluateCodePolicyStatement,
                    ]
                })
            ],
            post: [
                new CodeBuildStep('Integ-Test-Beta', {
                    env: {
                        Stage: 'beta',
                        AWS_REGION: region
                    },
                    commands: [
                        "npm ci",
                        "npm run build",
                        "npm test integ-tests/sourceApis/authorsService"
                    ],
                    rolePolicyStatements: [
                        integTestPolicyStatement,
                    ]
                })
            ] 
        })

        const sourceApiProdStage = new AuthorsServiceStage(this, "AuthorsServiceProdStage", {
            env: {
                region: region
            },
            stageName: 'prod'
        });

        pipeline.addStage(sourceApiProdStage, {
            post: [ 
                new CodeBuildStep('Integ-Test-Prod-SourceApi', {
                    env: {
                        Stage: 'prod',
                        AWS_REGION: region
                    },
                    commands: [
                        "npm ci",
                        "npm run build",
                        "npm test integ-tests/sourceApis/authorsService",
                    ],
                    rolePolicyStatements: [
                        integTestPolicyStatement,
                    ]
                }),
                new CodeBuildStep('Integ-Test-Prod-MergedApi', {
                    env: {
                        Stage: 'prod',
                        AWS_REGION: region
                    },
                    commands: [
                        "npm ci",
                        "npm run build",
                        "npm test test/integ-tests/mergedApi"
                    ],
                    rolePolicyStatements: [
                        integTestPolicyStatement,
                    ]
                })
            ]
        })
    }
}