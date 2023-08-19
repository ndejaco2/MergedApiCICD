# MergedApiCICD
An example pipeline for deploying a Merged API using AWS CDK

# Overview
This project includes 3 source AppSync APIs with resolvers written in Typescript:

1. Reviews Service
2. Books Service
3. Authors Service

Also, it contains a Merged API which is able to integrate these 3 services into a single endpoint. This is known as the Book Reviews Merged API following the same example as the previous blog (https://aws.amazon.com/blogs/mobile/introducing-merged-apis-on-aws-appsync/).


![image](https://github.com/ndejaco2/MergedApiCICD/assets/54116900/a8ff6afa-ed2d-4874-b3d6-f341c9ad2f61)


* While this sample configures the stacks in the same repository for simplicity, each API has its own CodePipeline for deployment as these will be managed by separate teams. Each CodePipline has a beta stage, which is recommended for initial integration tests and staging, as well as a production stage.
* For this sample, all APIs are deployed within the same AWS account. 
* Each source API stack includes a special SourceApiAssociation construct which handles configuring the association to the corresponding Merged API in the corresponding pipeline stage.
* The construct includes a CustomResource backed by a Lambda function which will propagate changes to the corresponding Merged API whenever the source API stack is updated and verify that the merge is successful. If the merge operation fails, the CustomResource notifies Cloudformation of the failure causing a Rollback and the CodePipeline will halt.
