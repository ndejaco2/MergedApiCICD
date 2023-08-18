import { Context, CdkCustomResourceEvent, CdkCustomResourceResponse } from 'aws-lambda';
import {
    AppSyncClient, GetSourceApiAssociationCommand,
    GetSourceApiAssociationCommandOutput, StartSchemaMergeCommand,
    StartSchemaMergeCommandOutput
} from "@aws-sdk/client-appsync";

const appSyncClient = new AppSyncClient();

export const handler = async (event: CdkCustomResourceEvent, context: Context): Promise<CdkCustomResourceResponse> => {
    console.log('SourceApiMergeCustomHandler: Handling event:', event);
    console.log('SourceApiMergeCustomHandler: Handling context:', context);

    return {};

    switch (event.RequestType) {
        case "Create":
        case "Update":
            return await performSchemaMerge(event);
        case "Delete":
            console.log("Source api association was deleted, nothing to do here");
            return {};
    }
}

async function pollForMergeCompletion(
    mergedApiIdentifier: string,
    associationId: string
): Promise<CdkCustomResourceResponse> {
    const maxRetries = 9; // 9 retries * 20 seconds = 180 seconds (3 minutes)
    const pollingInterval = 20000; // 20 seconds
    let retries = 0;
    while (retries < maxRetries) {
        try {
            const response: GetSourceApiAssociationCommandOutput  = await getSourceApiAssociation(mergedApiIdentifier, associationId)
            const sourceApiAssociation = response.sourceApiAssociation;
            if (sourceApiAssociation == undefined) {
                throw new Error("Source API association no longer exists");
            }

            switch (sourceApiAssociation?.sourceApiAssociationStatus) {
                case "MERGE_FAILED":
                    throw new Error(`Source api association merge failed with the following error: ${sourceApiAssociation?.sourceApiAssociationStatusDetail}`)
                case "MERGE_SUCCESS":
                    return {};
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

    throw new Error('Timed out while waiting for merge status');
}

async function getSourceApiAssociation(mergedApiIdentifier: string, associationId: string) {
    const params = {
        associationId: associationId,
        mergedApiIdentifier: mergedApiIdentifier
    };
    const command = new GetSourceApiAssociationCommand(params);

    return await appSyncClient.send(command);
}

async function performSchemaMerge(event: CdkCustomResourceEvent) {
    const associationId = event.ResourceProperties.associationId;
    const mergedApiIdentifier = event.ResourceProperties.mergedApiIdentifier;

    const params = {
        associationId: associationId,
        mergedApiIdentifier: mergedApiIdentifier
    };

    const command = new StartSchemaMergeCommand(params);


    try {
        const schemaMergeResponse: StartSchemaMergeCommandOutput = await appSyncClient.send(command);

        switch (schemaMergeResponse.sourceApiAssociationStatus) {
            case "MERGE_SUCCESS":
                return {};
            default:
                return await pollForMergeCompletion(mergedApiIdentifier, associationId);
        }
    } catch (error: any) {
        console.error("An error occurred submitting the schema merge", error)
        throw error;
    }
}
