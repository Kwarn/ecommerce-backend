const fs = require('fs');
const AWS = require('aws-sdk');
const S3 = require('aws-sdk/clients/s3');
const path = require('path');
require('dotenv').config();
const express = require('express');
const router = express.Router();
const multer = require('multer');

const bucketName = process.env.AWS_BUCKET_NAME;
const region = process.env.AWS_BUCKET_REGION;
const accessKey = process.env.AWS_ACCESS_KEY;
const secretAccessKey = process.env.AWS_SECRET_KEY;

AWS.config.update({
  accessKeyId: accessKey,
  secretAccessKey: secretAccessKey,
  region: region,
});

console.log(`process.env.bucketName`, process.env);

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
}).array('images', 10);
const upload = multer({ storage: storage, fileFilter: fileFilter }).single(
  'file'
);

router.post('/post-images', multipleUpload, function (req, res) {
  const files = req.files;
  var ResponseData = [];

  files.map(item => {
    var params = {
      Bucket: bucketName,
      Key: item.originalname,
      Body: item.buffer,
    };
    console.log(params);
    s3bucket.upload(params, function (err, data) {
      if (err) {
        res.json({ error: true, Message: err });
      } else {
        ResponseData.push(data);
        console.log(ResponseData);
      }
    });
  });
  if (ResponseData.length == files.length) {
    res.json({
      error: false,
      Message: 'File/s Uploaded',
      Data: ResponseData,
    });
  }
});

module.exports = router;
