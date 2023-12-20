import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {CodeBuildStep, CodePipeline, CodePipelineSource, ShellStep} from 'aws-cdk-lib/pipelines';
import {SecretValue} from "aws-cdk-lib";
import {AuthorsServiceStage} from "./authors-service-stage";
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { AuthorsServiceSourceApiAssociationStage } from './authors-service-source-api-assoc-stage';

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

        const mergedApiBetaPromotionStage = new AuthorsServiceSourceApiAssociationStage(this, 'AuthorsServiceBetaMergeStage', {
            env: {
                region: region
            },
            stageName: 'beta-merged-api'
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

        pipeline.addStage(mergedApiBetaPromotionStage, {
            post: [
                new CodeBuildStep('Integ-Test-Beta-MergedApi', {
                    env: {
                        Stage: 'beta',
                        AWS_REGION: region
                    },
                    commands: [
                        "npm ci",
                        "npm run build",
                        "npm test integ-tests/mergedApi"
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

        const mergedApiProdPromotionStage = new AuthorsServiceSourceApiAssociationStage(this, "AuthorsServiceProdMergeStage", {
            env: {
                region: region
            },
            stageName: 'prod-merged-api'
        });

        pipeline.addStage(sourceApiProdStage, {
            post: [ 
                new CodeBuildStep('Integ-Test-Prod-Source-Api', {
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
                })
            ]
        })

        pipeline.addStage(mergedApiProdPromotionStage, {
            post: [ 
                new CodeBuildStep('Integ-Test-Prod-Merged-Api', {
                    env: {
                        Stage: 'prod',
                        AWS_REGION: region
                    },
                    commands: [
                        "npm ci",
                        "npm run build",
                        "npm test integ-tests/mergedApi"
                    ],
                    rolePolicyStatements: [
                        integTestPolicyStatement,
                    ]
                })
            ]
        })
    }
}