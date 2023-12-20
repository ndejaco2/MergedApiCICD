import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {CodeBuildStep, CodePipeline, CodePipelineSource, ShellStep} from 'aws-cdk-lib/pipelines';
import {SecretValue} from "aws-cdk-lib";
import {ReviewsServiceStage} from "./reviews-service-stage";
import { ReviewsServiceSourceApiAssociationStage } from './reviews-service-source-api-assoc-stage';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';

export class ReviewsServicePipelineStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);
        const githubAccessToken = SecretValue.secretsManager('github-token')
        const pipeline = new CodePipeline(this, 'ReviewsServicePipeline', {
            synth: new ShellStep('Synth', {
                input: CodePipelineSource.gitHub('ndejaco2/MergedApiCICD', "main",  {
                    authentication: githubAccessToken
                }),
                commands: ["npm ci", "npm run build", "npx cdk synth"]
            }),
            pipelineName: 'ReviewsServicePipeline',
        });

        const region = 'us-east-1';

        const sourceApiBetaStage = new ReviewsServiceStage(this, "ReviewsServiceBetaStage", {
            env: {
                region: region
            },
            stageName: 'beta',
        });

        const mergedApiBetaPromotionStage = new ReviewsServiceSourceApiAssociationStage(this, 'ReviewsServiceBetaMergeStage', {
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
                        "npm test unit-tests/sourceApis/reviewsService"],
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
                        "npm test integ-tests/sourceApis/reviewsService"
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

        const sourceApiProdStage = new ReviewsServiceStage(this, "ReviewsServiceProdStage", {
            env: {
                region: region
            },
            stageName: 'prod'
        });

        const mergedApiProdPromotionStage = new ReviewsServiceSourceApiAssociationStage(this, "ReviewsServiceProdMergeStage", {
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
                        "npm test integ-tests/sourceApis/reviewsService",
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