const dotenv = require('dotenv');
const morgan = require('morgan');
const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const graphqlSchema = require('./graphql/schema');
const graphqlResolver = require('./graphql/resolvers');
const auth = require('./middleware/auth');
const errorHandler = require('./util/errorHandler');
const cors = require('cors');

dotenv.config();
const corsOptions = {
  origin: process.env.CORS_ORIGIN,
  credentials: true,
  optionsSuccessStatus: 200,
};

console.log(corsOptions);
const app = express();

const clearImage = filePath => {
  filePath = path.join(__dirname, filePath);
  fs.unlink(filePath, err => console.log(err));
};

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images');
  },
  filename: (req, file, cb) => {
    cb(null, new Date().toISOString() + '-' + file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype == 'image/png' ||
    file.mimetype == 'image/jpg' ||
    file.mimetype == 'image/jpeg'
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

app.use(
  multer({
    storage: fileStorage,
    fileFilter: fileFilter,
  }).single('image')
);

const accessLogStream = fs.createWriteStream(
  path.join(__dirname, 'access.log'),
  { flags: 'a' }
);

app.use(morgan('combined', { stream: accessLogStream }));
app.use(express.json());

app.use(cors(corsOptions));
app.use((req, res, next) => {
  // res.setHeader('Access-Control-Allow-Origin', '*');
  // res.setHeader(
  //   'Access-Control-Allow-Methods',
  //   'GET, POST, PUT, PATCH, DELETE'
  // );
  // res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  // if (req.method === 'OPTIONS') {
  //   // graphql rejects non POST requests, this skips the 'OPTIONS' request.
  //   return res.sendStatus(200);
  // }
  next();
});

app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(auth);
app.put('/post-image', (req, res, next) => {
  if (!req.isAuth) {
    throw errorHandler('Not authorized', 401);
  }
  if (!req.file) {
    return res.status(200).json({ message: 'No file provided.' });
  }
  if (req.body.oldPath) {
    clearImage(req.body.oldPath);
  }
  return res
    .status(201)
    .json({ message: 'File uploaded', filePath: req.file.path });
});

app.use(
  '/graphql',
  graphqlHTTP({
    schema: graphqlSchema,
    rootValue: graphqlResolver,
    graphiql: true,
    customFormatErrorFn(error) {
      if (!error.originalError) {
        return error;
      }
      const data = error.originalError.data;
      const message = error.message || 'An error occurred.';
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
  .then(result => {
    app.listen(process.env.PORT);
    console.log('Server Running.');
  })
  .catch(err => console.log(`Mongoose Connection Error`, err));
