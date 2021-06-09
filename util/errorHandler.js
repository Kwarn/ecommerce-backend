const errorHandler = (
  errorMessage,
  statusCode,
  next = null,
  errorDataArray = null
) => {
  const error = new Error(errorMessage);
  error.statusCode = statusCode || 500;
  error.status = statusCode || 500;
  if (errorDataArray) {
    error.data = errorDataArray;
  }
  if (next) {
    next(error);
  } else {
    return error;
  }
};

module.exports = errorHandler;
