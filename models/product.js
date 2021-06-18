const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const productSchemas = new Schema(
  {
    title: { type: String, required: true },
    imageUrls: { type: [String], required: true },
    description: { type: String, required: true },
    productType: { type: String, required: true },
    creator: { type: Schema.Types.ObjectId, ref: 'user', required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('product', productSchemas);
