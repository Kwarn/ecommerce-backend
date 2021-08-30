const { buildSchema } = require("graphql");

module.exports = buildSchema(`
  type Product {
    _id: ID!
    title: String!
    imageUrls: [String!]
    description: String!
    productType: String!
    creator: User!
    createdAt: String!
    updatedAt: String!
  }
  type User {
    _id: ID!
    name: String!
    email: String!
    password: String
    products: [Product!]!
  }
  type ProductData {
    products: [Product!]!
    totalProducts: Int!
  }
  type AuthData {
    token: String!
    userId: String!
  }
  type DeleteProductId {
    productId: ID!
  }
  input ProductInputData {
    title: String!
    imageUrls: [String!]!
    description: String!
    productType: String!
  }
  input UpdateProductInputData {
    _id: ID!
    title: String!
    imageUrls: [String!]!
    description: String!
    productType: String!
  }
  input UserInputData {
    email: String!
    name: String!
    password: String!
  }
  type RootQuery {
    login(email: String!, password: String!): AuthData!
    getProducts(productType: String!): ProductData!
    getProduct(productId: ID!): Product!
  }
  type RootMutation {
    createUser(userInput: UserInputData): User!
    createProduct(productInput: ProductInputData): Product!
    deleteProduct(productId: ID!): DeleteProductId!
    updateProduct(productInput: UpdateProductInputData): Product!
    cleanupHelper(productIdArray: [ID!]): [ID!]!
  }
  schema {
    query: RootQuery
    mutation: RootMutation
  }
`);
