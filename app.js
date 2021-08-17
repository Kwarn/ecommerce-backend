const dotenv = require("dotenv");
const morgan = require("morgan");
const express = require("express");
const { graphqlHTTP } = require("express-graphql");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const graphqlSchema = require("./graphql/schema");
const graphqlResolver = require("./graphql/resolvers");
const auth = require("./middleware/auth");
const errorHandler = require("./util/errorHandler");
const cors = require("cors");
const s3Functions = require("./aws/s3");
const multerS3 = require("multer-s3");
const fileUploadRoute = require("./aws/s3");

dotenv.config();
const corsOptions = {
  origin: process.env.CORS_ORIGIN,
  credentials: true,
  optionsSuccessStatus: 200,
};

const app = express();

const clearImage = (filePath) => {
  filePath = path.join(__dirname, filePath);
  fs.unlink(filePath, (err) => console.log(err));
};

const accessLogStream = fs.createWriteStream(
  path.join(__dirname, "access.log"),
  { flags: "a" }
);

app.use(morgan("combined", { stream: accessLogStream }));
app.use(express.json());

app.use(cors(corsOptions));

// app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(auth);
app.use(fileUploadRoute);

app.use(
  "/graphql",
  graphqlHTTP({
    schema: graphqlSchema,
    rootValue: graphqlResolver,
    graphiql: true,
    customFormatErrorFn(error) {
      if (!error.originalError) {
        return error;
      }
      const data = error.originalError.data;
      const message = error.message || "An error occurred.";
      const code = error.originalError.statusCode || 500;
      return { message: message, data: data, status: code };
    },
  })
);

app.use((error, req, res, next) => {
  console.log(error);
  const statusCode = error.statusCode || error.status || 500;
  const message = error.message;
  const data = error.data;
  res.status(statusCode).json({ message: message, data: data });
});

mongoose
  .connect(process.env.MONGO_DB_CONNECT_STRING, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
  })
  .then((result) => {
    app.listen(process.env.PORT);
    console.log(`Server Running on PORT: ${process.env.PORT}`);
  })
  .catch((err) => console.log(`Mongoose Connection Error`, err));
