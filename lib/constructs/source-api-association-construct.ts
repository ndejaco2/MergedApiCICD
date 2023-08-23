import {Construct} from "constructs";
import {CfnSourceApiAssociation} from "aws-cdk-lib/aws-appsync";
import * as lambda from "aws-cdk-lib/aws-lambda-nodejs";
import {CustomResource, Duration} from "aws-cdk-lib";
import * as path from "path";
import {Runtime} from "aws-cdk-lib/aws-lambda";
import {Effect, ManagedPolicy, Policy, PolicyStatement, IRole, ServicePrincipal, Role} from "aws-cdk-lib/aws-iam";


export interface SourceApiAssociationProps {
    mergedApiArn: string,
    mergedApiId: string,
    sourceApiArn: string,
    sourceApiId: string,
    description: string
    mergeType: MergeType,
    mergedApiExecutionRole: IRole
}

export enum MergeType {
    MANUAL_MERGE = "MANUAL_MERGE",
    AUTO_MERGE = "AUTO_MERGE"
}

export class SourceApiAssociationConstruct extends Construct {
    constructor(scope: Construct, id: string, props: SourceApiAssociationProps) {
        super(scope, id);

        const sourceApiAssociation = new CfnSourceApiAssociation(this, `SourceApiAssociation`, {
            sourceApiIdentifier: props.sourceApiId,
            mergedApiIdentifier: props.mergedApiArn,
            description: props.description,
            sourceApiAssociationConfig: {
                mergeType: props.mergeType.toString()
            }
        });

        const accessPolicy = new Policy(this, 'SourceApiAccessPolicy', {
            statements: [new PolicyStatement({
                actions: ['appsync:SourceGraphQL'],
                resources: [props.sourceApiArn, props.sourceApiArn.concat("/*")],
                effect: Effect.ALLOW
            }), new PolicyStatement({
                actions: ['appsync:StartSchemaMerge'],
                resources: [sourceApiAssociation.attrAssociationArn],
                effect: Effect.ALLOW
            })]
        });

        props.mergedApiExecutionRole.attachInlinePolicy(accessPolicy);

        // If the source api association is using manual merge mode, we will ensure that any time the source api stack is deployed,
        // we merge the changes and wait for them to succeed.
        if (props.mergeType === MergeType.MANUAL_MERGE) {
            const resourceType = 'Custom::SourceApiMergeOperation'
            const lambdaRole = new Role(this, 'MergeSourceApiSchemaExecutionRole', {
                assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
            });

            lambdaRole.addToPolicy(new PolicyStatement({
                effect: Effect.ALLOW,
                resources: [props.mergedApiArn.concat(`/sourceApiAssociations/${sourceApiAssociation.attrAssociationId}`)],
                actions: ['appsync:StartSchemaMerge', 'appsync:GetSourceApiAssociation']
            }));

            lambdaRole.addManagedPolicy(
                ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'));

            const schemaMergeLambda = new lambda.NodejsFunction(this, `MergeSourceApiSchemaLambda`, {
                runtime: Runtime.NODEJS_18_X,
                entry: path.join(__dirname, 'mergeSourceApiSchemaFunction', 'index.ts'),
                handler: 'handler',
                role: lambdaRole,
                memorySize: 512,
                timeout: Duration.minutes(5),
                bundling: {
                    externalModules: [], // Forces upload of more recent version of aws-sdk/client-appsync to be used in Lambda runtime.
                }
            });

            new CustomResource(this, `StartSchemaMergeCustomResource`, {
                serviceToken: schemaMergeLambda.functionArn,
                resourceType: resourceType,

                properties: {
                    ...props,
                    associationId: sourceApiAssociation.attrAssociationId,
                    alwaysUpdate: Date.now()
                }
            });
        }
    }
}