import {CdkCustomResourceEvent, Context} from 'aws-lambda';
import {
    AppSyncClient,
    GetSourceApiAssociationCommand,
    GetSourceApiAssociationCommandOutput,
    StartSchemaMergeCommand,
} from "@aws-sdk/client-appsync";
import * as cfnresponse from 'cfn-response';
import {FAILED, SUCCESS} from 'cfn-response';

const appSyncClient = new AppSyncClient();

type SchemaMergeResponse = {
    status: cfnresponse.ResponseStatus,
    message?: string
}

export const handler = (event: CdkCustomResourceEvent, context: Context): void => {
    console.log('SourceApiMergeCustomHandler: Handling event:', event);
    console.log('SourceApiMergeCustomHandler: Handling context:', context);

    switch (event.RequestType) {
        case "Create":
            console.log("Source api association was created, nothing to do here");
            cfnresponse.send(event, context, cfnresponse.SUCCESS);
            break;
        case "Update":
            performSchemaMerge(event).then((response) => {
                cfnresponse.send(event, context, response.status, {
                    message: response.message
                });
            });

            break;
        case "Delete":
            console.log("Source api association was deleted, nothing to do here");
            cfnresponse.send(event, context, cfnresponse.SUCCESS);
            break;
        default:
            console.error("Invalid request type");
            cfnresponse.send(event, context, cfnresponse.FAILED, {
                errorMessage: "Invalid request type"
            });

            break;
    }
}

async function getSourceApiAssociation(mergedApiIdentifier: string, associationId: string) {
    const params = {
        associationId: associationId,
        mergedApiIdentifier: mergedApiIdentifier
    };

    const command = new GetSourceApiAssociationCommand(params);
    return await appSyncClient.send(command);
}

async function performSchemaMerge(event: CdkCustomResourceEvent): Promise<SchemaMergeResponse> {
    const associationId = event.ResourceProperties.associationId;
    const mergedApiIdentifier = event.ResourceProperties.mergedApiArn;

    const params = {
        associationId: associationId,
        mergedApiIdentifier: mergedApiIdentifier
    };

    const command = new StartSchemaMergeCommand(params);

    try {
        await appSyncClient.send(command);
        return await pollForMergeCompletion(mergedApiIdentifier, associationId);
    } catch (error: any) {
        console.error("An error occurred submitting the schema merge", error)
        throw error;
    }
}

async function pollForMergeCompletion(
    mergedApiIdentifier: string,
    associationId: string
): Promise<SchemaMergeResponse> {
    const maxRetries = 9; // 9 retries * 20 seconds = 180 seconds (3 minutes)
    const pollingInterval = 20000; // 20 seconds
    let retries = 0;
    while (retries < maxRetries) {
        try {
            const response: GetSourceApiAssociationCommandOutput = await getSourceApiAssociation(mergedApiIdentifier, associationId)
            const sourceApiAssociation = response.sourceApiAssociation;
            if (sourceApiAssociation == undefined) {
                return {
                    status: FAILED,
                    message: "Source API association no longer exists"
                }
            }

            switch (sourceApiAssociation?.sourceApiAssociationStatus) {
                case "MERGE_FAILED":
                    return {
                        status: FAILED,
                        message: sourceApiAssociation.sourceApiAssociationStatusDetail
                    }
                case "MERGE_SUCCESS":
                    return {
                        status: SUCCESS,
                        message: sourceApiAssociation.sourceApiAssociationStatusDetail
                    };
                case "MERGE_SCHEDULED":
                case "MERGE_IN_PROGRESS":
                default:
                    console.log("Merge in progress, waiting for 20s")
            }
        } catch (error) {
            console.error('Error while polling for merge status:', error);
            throw error;
        }

        retries++;
        await new Promise(resolve => setTimeout(resolve, pollingInterval));
    }

    return {
        status: FAILED,
        message: 'Timed out while waiting for merge status'
    };
}
