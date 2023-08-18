#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { BookReviewsMergedApiStack} from '../lib/mergedApi/book-reviews-mergedapi-stack';
import {AuthorsServiceStack} from "../lib/sourceApis/authorsService/authors-service-stack";
import {ReviewsServiceStack} from "../lib/sourceApis/reviewsService/reviews-service-stack";
import {BooksServiceStack} from "../lib/sourceApis/booksService/books-service-stack";

const app = new cdk.App();

const bookReviewsMergedApiStack = new BookReviewsMergedApiStack(app, 'BookReviewsMergedApi', {
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

new BooksServiceStack(app, 'BooksServiceStack', {
    env: {
        region: 'us-east-1'
    },
})