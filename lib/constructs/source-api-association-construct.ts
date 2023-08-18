import {Construct} from "constructs";
import {CfnSourceApiAssociation} from "aws-cdk-lib/aws-appsync";
import {CustomResource, CustomResourceProvider, CustomResourceProviderRuntime} from "aws-cdk-lib";
import * as cdk from "aws-cdk-lib";
import * as path from "path";


export interface SourceApiAssociationProps {
    mergedApiArn: string,
    mergedApiId: string,
    sourceApiArn: string,
    sourceApiId: string,
    description: string
    mergeType: MergeType,
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


        // If the source api association is using manual merge mode, we will ensure that any time the source api stack is deployed,
        // we merge the changes and wait for them to succeed.
        if (props.mergeType == MergeType.MANUAL_MERGE) {
            const resourceType = 'Custom::SourceApiMergeOperation'
            const startMergeOperationHandler = CustomResourceProvider.getOrCreate(this, resourceType, {
                codeDirectory: path.join(__dirname, 'mergeSourceApiSchemaFunction'),
                runtime: CustomResourceProviderRuntime.NODEJS_18_X,
                timeout: cdk.Duration.minutes(10),
                description: "Lambda function for submitting and validating a merge operation to import the latest changes from a source API",
                policyStatements:  [{
                    Effect: 'Allow',
                    Resource: props.mergedApiArn.concat(`/${sourceApiAssociation.attrAssociationId}`),
                    Action: ['appsync:StartSchemaMerge', 'appsync:GetSourceApiAssociation'],
                }]
            });

            const mergeSourceApiToMergedApiFunction = new CustomResource(this, `StartMergeCustomResource`, {
                serviceToken: startMergeOperationHandler,
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