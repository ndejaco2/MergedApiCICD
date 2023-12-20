import { CloudFormationClient, ListExportsCommand, Export } from "@aws-sdk/client-cloudformation"
import axios from 'axios'
import * as fs from "fs"
import { SignatureV4 } from '@smithy/signature-v4'
import { Sha256 } from '@aws-crypto/sha256-js'

const cloudformationClient = new CloudFormationClient();
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

let endpoint: string;
let apiUrl: URL

beforeAll(async () => {
   const response = await cloudformationClient.send(new ListExportsCommand({}))
   endpoint = response.Exports?.find(e => e.Name === `${process.env.Stage}-BookReviewsMergedApiUrl`)?.Value ?? "";
   console.log(endpoint)
   apiUrl = new URL(endpoint)
})

test('basic integration test', async () => {

})