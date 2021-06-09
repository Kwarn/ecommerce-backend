const User = require('../models/user');
const Product = require('../models/product');
const errorHandler = require('../util/errorHandler');
const bcrypt = require('bcrypt');
const validator = require('validator').default;
const jwt = require('jsonwebtoken');

// returns an array of error objects or false if all product data validation passes.
const getPostValidationErrors = (title, description, imageUrls) => {
  const errors = [];
  if (validator.isEmpty(title) || !validator.isLength(title, { min: 5 })) {
    errors.push({ message: 'Invalid title.' });
  }
  if (
    validator.isEmpty(description) ||
    !validator.isLength(description, { min: 5 })
  ) {
    errors.push({ message: 'Invalid description.' });
  }
  // ToDo: Validate imageUrls
  if (errors.length > 0) {
    return errors;
  }
  return false;
};

// returns array of error objects or false if all signup validation passes
const getSignupValidationErrors = (email, name, password) => {
  const errors = [];
  if (!validator.isEmail(email)) {
    errors.push({ message: 'Invalid email address.' });
    console.log(`isEmail error`);
  }
  if (
    validator.isEmpty(password) ||
    !validator.isLength(password, { min: 6 })
  ) {
    errors.push({ message: 'Password must be atleast 6 characters.' });
  }
  if (errors.length > 0) {
    return errors;
  }
  return false;
};

// checks user doesn't already exist, hashes password,
// returns saved user doc with userId as a string.
module.exports = {
  createUser: async function ({ userInput }, req) {
    const { name, password } = userInput,
      email = userInput.email.toLowerCase();

    const validationErrors = getSignupValidationErrors(email, name, password);
    if (validationErrors)
      throw errorHandler(
        validationErrors[0].message,
        422,
        null,
        validationErrors
      );

    const existingUser = await User.findOne({ email: email });
    if (existingUser) throw errorHandler('That user already exists', 409);

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new User({
      email: email,
      name: name,
      password: hashedPassword,
    });

    const createdUser = await user.save();
    return { ...createdUser._doc, _id: createdUser._id.toString() };
  },
  login: async function (userInput) {
    const password = userInput.password,
      email = userInput.email.toLowerCase();
    const user = await User.findOne({ email: email });
    if (!user) {
      throw errorHandler('No user found.', 401);
    }
    const isEqual = await bcrypt.compare(password, user.password);
    if (!isEqual) {
      throw errorHandler('Password is incorrect.', 401);
    }
    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
      },
      process.env.JWT_SECRET_PHRASE,
      { expiresIn: '1h' }
    );
    return { token: token, userId: user._id.toString() };
  },
  createProduct: async function (
    { productInput: { title, description, imageUrls } },
    req
  ) {
    if (!req.userId) throw errorHandler('Not authenticated.', 401);

    const validationErrors = getPostValidationErrors(
      title,
      description,
      imageUrls
    );
    if (validationErrors)
      throw errorHandler(
        validationErrors[0].message,
        422,
        null,
        validationErrors
      );

    const user = await User.findById(req.userId);
    if (!user) {
      throw errorHandler('No user found.', 401);
    }
    const product = new Product({
      title: title,
      description: description,
      imageUrls: imageUrls,
      creator: user,
    });
    const createdProduct = await product.save();
    user.products.push(createdProduct);
    await user.save();
    return {
      ...createdProduct._doc,
      _id: createdProduct._id.toString(),
      createdAt: createdProduct.createdAt.toISOString(),
      updatedAt: createdProduct.updatedAt.toISOString(),
    };
  },
  updatedProduct: async function (
    { productId, productInput: { title, description, imageUrls } },
    req
  ) {
    if (!req.userId) throw errorHandler('Not authenticated.', 401);

    const validationErrors = getPostValidationErrors(
      title,
      description,
      imageUrls
    );
    if (validationErrors)
      throw errorHandler('Invalid product data.', 422, null, validationErrors);
    const product = await Product.findById(productId).populate('creator');
    if (product.creator._id.toString() !== req.userId.toString()) {
      throw errorHandler('You are not authorized to modify this product.', 403);
    }

    product.title = title;
    product.description = description;
    if (imageUrls !== 'undefined') {
      product.imageUrls = imageUrls;
    }
    const updatedProduct = await product.save();
    return {
      ...updatedProduct._doc,
      _id: updatedProduct._id.toString(),
      createdAt: updatedProduct.createdAt.toISOString(),
      updatedAt: updatedProduct.updatedAt.toISOString(),
    };
  },
  deleteProduct: async function ({ productId }, req) {
    if (!req.userId) throw errorHandler('Not authenticated.', 401);

    const product = await Product.findById(productId);
    if (!product) {
      throw errorHandler('No product with that ID found.', 404);
    }
    if (product.creator.toString() !== req.userId.toString()) {
      throw errorHandler('You are not authorized to delete this product.', 403);
    }
    const user = await User.findById(req.userId);
    user.products = user.products.filter(
      product => product._id.toString() !== productId.toString()
    );
    await user.save();
    await Product.deleteOne({ _id: productId }, err => {
      if (err) {
        throw errorHandler('Failed to delete product.', 404);
      }
      console.log(`Product: ${productId} deleted successfully.`);
    });

    return {
      productId: productId,
    };
  },
  getPosts: async function ({ page }, req) {
    if (!req.userId) {
      throw errorHandler('Not Authenticated.', 401);
    }
    if (!page) {
      page = 1;
    }
    const perPage = 2;
    const totalProducts = await Product.find().countDocuments();
    const products = await Product.find()
      .sort({ createdAt: -1 })
      .skip((page - 1) * perPage)
      .limit(perPage)
      .populate('creator');

    return {
      products: products.map(p => {
        return {
          ...p._doc,
          _id: p._id.toString(),
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
        };
      }),
      totalProducts: totalProducts,
    };
  },
  getProduct: async function ({ productId }, req) {
    if (!req.userId) {
      throw errorHandler('Not Authenticated.', 401);
    }
    const product = await Product.findById(productId).populate('creator');
    if (!product) {
      throw errorHandler('No product found', 404);
    }
    return {
      ...product._doc,
      _id: product._id.toString(),
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    };
  },
  // getStatus: async function (args, req) {
  //   if (!req.userId) {
  //     throw errorHandler('Not Authenticated.', 401);
  //   }
  //   const user = await User.findById(req.userId);
  //   if (!user) {
  //     throw errorHandler('No user with that ID found.', 404);
  //   }
  //   return {
  //     status: user.status,
  //   };
  // },
  // updateStatus: async function ({ statusInput: { status } }, req) {
  //   if (!req.userId) {
  //     throw errorHandler('Not Authenticated.', 401);
  //   }
  //   const user = await User.findById(req.userId);
  //   if (!user) {
  //     throw errorHandler('No user with that ID found.');
  //   }
  //   user.status = status;
  //   const savedUser = await user.save();
  //   return {
  //     status: savedUser.status,
  //   };
  // },
};
