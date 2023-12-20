import { SignatureV4 } from "@smithy/signature-v4";
import axios from "axios";
import { Sha256 } from '@aws-crypto/sha256-js'

const {
    AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY,
    AWS_SESSION_TOKEN,
    AWS_REGION
  } = process.env;

const sigv4 = new SignatureV4({
    service: 'appsync',
    region: AWS_REGION ?? "",
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID ?? "",
      secretAccessKey: AWS_SECRET_ACCESS_KEY ?? "",
      sessionToken: AWS_SESSION_TOKEN,
    },
    sha256: Sha256,
});


export async function executeRequest(apiUrl: URL, query: string, variables?: any, operationName?: string) {
    const signedRequest = await sigv4.sign({
        method: 'POST',
        hostname: apiUrl.hostname,
        path: '/graphql',
        protocol: 'https',
        headers: {
            'Content-Type': 'application/json',
            host: apiUrl.hostname
        },
        body: JSON.stringify({
            query,
            operationName,
            variables
        })
    });

    try {
        const { data } = await axios.post(
            `https://${apiUrl.hostname}/graphql`,
            signedRequest.body,
            {
                headers: signedRequest.headers,
            }
        );

        if (data.errors) {
            throw new Error(`Errors occurred during the request ${data.errors}`)
        }

        console.log('Successfully received data: ', data);
        return data;
  } catch (error) {
        console.log('An error occurred', error);

        throw error;
  }
}