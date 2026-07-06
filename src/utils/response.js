const success = (res, message, data = null, statusCode = 200) => {
  const payload = { success: true, message };
  if (data !== null) payload.data = data;
  return res.status(statusCode).json(payload);
};

const created = (res, message, data = null) => success(res, message, data, 201);

const error = (res, message, errors = null, statusCode = 400) => {
  const payload = { success: false, message };
  if (errors !== null) payload.errors = errors;
  return res.status(statusCode).json(payload);
};

const notFound = (res, message = 'Resource not found') => error(res, message, null, 404);

const unauthorized = (res, message = 'Unauthorized') => error(res, message, null, 401);

const forbidden = (res, message = 'Forbidden') => error(res, message, null, 403);

const serverError = (res, message = 'Internal server error') => error(res, message, null, 500);

const paginated = (res, message, data, pagination) =>
  res.status(200).json({ success: true, message, data, pagination });

module.exports = { success, created, error, notFound, unauthorized, forbidden, serverError, paginated };
