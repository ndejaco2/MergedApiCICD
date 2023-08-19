#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import {AuthorsServiceStack} from "../lib/sourceApis/authorsService/authors-service-stack";
import {ReviewsServiceStack} from "../lib/sourceApis/reviewsService/reviews-service-stack";
import {BooksServicePipelineStack} from "../lib/sourceApis/booksService/books-service-pipeline-stack";
import {BookReviewsMergedApiPipeline} from "../lib/mergedApi/book-reviews-mergedapi-pipeline";

const app = new cdk.App();

new BookReviewsMergedApiPipeline(app, 'BookReviewsMergedApiPipeline', {
    env: {
        region: 'us-east-1',
    }
});

new AuthorsServiceStack(app, 'AuthorsServiceStack', {
    env: {
        region: 'us-east-1'
    }
});

new ReviewsServiceStack(app, 'ReviewsServiceStack', {
    env: {
        region: 'us-east-1'
    },
});

new BooksServicePipelineStack(app, 'BooksServicePipeline', {
    env: {
        region: 'us-east-1'
    },
})