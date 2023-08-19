import * as cdk from "aws-cdk-lib";
import * as path from "path";
import {Construct} from "constructs";
import {
    BaseDataSource, CfnGraphQLApi,
    Code,
    DynamoDbDataSource,
    FunctionRuntime,
    GraphqlApi, IGraphqlApi,
    Resolver,
    SchemaFile
} from "aws-cdk-lib/aws-appsync";
import {AttributeType, Table} from "aws-cdk-lib/aws-dynamodb";

export class ReviewsServiceApiStack extends cdk.NestedStack {
    public readonly bookReviewsApi: IGraphqlApi;
    private bookReviewsDatasource: BaseDataSource;

    constructor(scope: Construct, id: string) {
        super(scope, id);

        const schema = SchemaFile.fromAsset(path.join(__dirname, 'reviews.graphql'));

        this.bookReviewsApi = new GraphqlApi(this, 'ReviewsServiceApi', {
            name: 'Reviews Service',
            schema: schema
        });

        const bookReviewsTable = new Table(this, 'ReviewsDDBTable', {
            partitionKey: {
                name: 'id',
                type: AttributeType.STRING
            },
            tableName: 'BookReviewsTable',
        });

        bookReviewsTable.addGlobalSecondaryIndex({
            partitionKey: {
                name: 'bookId',
                type: AttributeType.STRING
            },
            indexName: 'review-book-index'
        });

        bookReviewsTable.addGlobalSecondaryIndex({
            partitionKey: {
                name: 'reviewerId',
                type: AttributeType.STRING
            },
            indexName: 'review-reviewer-index'
        });

        bookReviewsTable.addGlobalSecondaryIndex({
            partitionKey: {
                name: 'authorId',
                type: AttributeType.STRING
            },
            indexName: 'review-author-index'
        });


        this.bookReviewsDatasource = new DynamoDbDataSource(this, 'BookReviewsDatasource', {
            api: this.bookReviewsApi,
            table: bookReviewsTable
        });

        // Mutation to add a review in the datasource
        this.addJSUnitResolver('CreateReviewResolver', "Mutation", "createReview", "createReview")

        // Mutation to delete a review from the datasource
        this.addJSUnitResolver('DeleteReviewResolver', "Mutation", "deleteReview", "deleteReview")

        // Mutation to update a review in the datasource
        // this.addJSUnitResolver('UpdateReviewResolver', "Mutation", "updateReview", "updateReview")

        // Query to get review by id
        this.addJSUnitResolver('GetReviewResolver', "Query", "getReview", "getReview")

        // Query to list all reviews in the datasource
        this.addJSUnitResolver('ListBooksResolver', "Query", "listReviews", "listReviews")

        // Query to join review data with the author data to return data for all reviews of books written by an individual author.
        this.addJSUnitResolver('GetReviewsForAuthorResolver', "Author", "reviews", "getReviewsForAuthor")

        // Query to join review data with the book data to return data for all reviews of an individual book.
        this.addJSUnitResolver('GetReviewsForBookResolver', "Book", "reviews", "getReviewsForBook")
    }

    addJSUnitResolver(id: string,
                      typeName: string,
                      fieldName: string,
                      fileName: string) {
        new Resolver(this, id, {
            api: this.bookReviewsApi,
            fieldName: fieldName,
            typeName: typeName,
            dataSource: this.bookReviewsDatasource,
            code: Code.fromAsset(path.join(__dirname, `resolverCode/${fileName}.js`)),
            runtime: FunctionRuntime.JS_1_0_0
        });
    }
}