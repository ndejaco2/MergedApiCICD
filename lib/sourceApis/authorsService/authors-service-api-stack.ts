import * as cdk from "aws-cdk-lib";
import * as path from "path";
import {Construct} from "constructs";
import {
    BaseDataSource,
    Code,
    DynamoDbDataSource,
    FunctionRuntime,
    GraphqlApi,
    IGraphqlApi,
    Resolver,
    SchemaFile
} from "aws-cdk-lib/aws-appsync";
import {AttributeType, Table} from "aws-cdk-lib/aws-dynamodb";;

export class AuthorsServiceApiStack extends cdk.NestedStack {
    private authorsDatasource: BaseDataSource;
    public readonly authorsApi: IGraphqlApi;

    constructor(scope: Construct, id: string, props: cdk.StageProps) {
        super(scope, id);
        const schema = SchemaFile.fromAsset(path.join(__dirname, 'authors.graphql'));
        this.authorsApi = new GraphqlApi(this, 'AuthorsServiceApi', {
            name: `${props.stageName}-Authors-Service`,
            schema: schema
        });

        const authorsTable = new Table(this, 'AuthorsDDBTable', {
            partitionKey: {
                name: 'id',
                type: AttributeType.STRING
            },
            tableName: `${props.stageName}-AuthorsTable`,
        });

        this.authorsDatasource = new DynamoDbDataSource(this, 'AuthorsDatasource', {
            api: this.authorsApi,
            table: authorsTable
        });

        // Mutation to add an author in the datasource
        this.addJSUnitResolver('CreateAuthorResolver', "Mutation", "createAuthor", "createAuthor")

        // Mutation to delete an author from the datasource
        this.addJSUnitResolver('DeleteAuthorResolver', "Mutation", "deleteAuthor", "deleteAuthor")

        // Mutation to update an author in the datasource
        // this.addJSUnitResolver('UpdateAuthorResolver', "Mutation", "updateAuthor", "updateAuthor")

        // Query to get author by id
        this.addJSUnitResolver('GetAuthorResolver', "Query", "getAuthor", "getAuthor")

        // Query to list all authors in the datasource
        this.addJSUnitResolver('ListAuthorsResolver', "Query", "listAuthors", "listAuthors")

        // Resolver that is used to join data for authors of Books.
        this.addJSUnitResolver('BookAuthorResolver', "Book", "author", "authorByParentAuthorId")

        // Resolver that is used to join data for authors of Reviews.
        this.addJSUnitResolver('ReviewAuthorResolver', "Review", "author", "authorByParentAuthorId")
    }

    addJSUnitResolver(id: string,
                      typeName: string,
                      fieldName: string,
                      fileName: string) {
        new Resolver(this, id, {
            api: this.authorsApi,
            fieldName: fieldName,
            typeName: typeName,
            dataSource: this.authorsDatasource,
            code: Code.fromAsset(path.join(__dirname, `resolverCode/${fileName}.js`)),
            runtime: FunctionRuntime.JS_1_0_0
        });
    }
}