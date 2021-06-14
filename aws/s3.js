const fs = require('fs');
const AWS = require('aws-sdk');
const S3 = require('aws-sdk/clients/s3');
const path = require('path');
const express = require('express');
const router = express.Router();
const multer = require('multer');

require('dotenv').config();
const bucketName = process.env.AWS_BUCKET_NAME;
const region = process.env.AWS_BUCKET_REGION;
const accessKey = process.env.AWS_ACCESS_KEY;
const secretAccessKey = process.env.AWS_SECRET_KEY;

AWS.config.update({
  accessKeyId: accessKey,
  secretAccessKey: secretAccessKey,
  region: region,
});

const s3bucket = new S3({
  region,
  accessKey,
  secretAccessKey,
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

const storage = multer.memoryStorage({
  destination: function (req, file, callback) {
    callback(null, '');
  },
});

const multipleUpload = multer({
  storage: storage,
  fileFilter: fileFilter,
}).array('images');

const upload = multer({ storage: storage, fileFilter: fileFilter }).single(
  'file'
);

const createParams = async files => {};

router.post('/post-images', multipleUpload, async function (req, res, next) {
  const resData = [];

  for (const file of req.files) {
    try {
      const params = {
        Bucket: bucketName,
        Key: file.originalname,
        Body: file.buffer,
      };
      const uploaded = await s3bucket.upload(params).promise();
      resData.push(uploaded.Location);

      if (resData.length === req.files.length) {
        res.status(202).json({
          error: false,
          body: resData,
        });
      }
    } catch (err) {
      console.log(`err`, err);
    }
  }
});

module.exports = router;
