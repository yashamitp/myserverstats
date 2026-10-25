/**
 * Standard API Response utilities
 */

function success(res, data = null, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
}

function error(res, message = 'An error occurred', statusCode = 500, details = null) {
  const payload = {
    success: false,
    error: {
      message
    }
  };

  if (details) {
    payload.error.details = details;
  }

  return res.status(statusCode).json(payload);
}

function paginated(res, items, page, limit, total, message = 'Success') {
  return res.status(200).json({
    success: true,
    message,
    data: items,
    pagination: {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      total,
      pages: Math.ceil(total / limit) || 1
    }
  });
}

module.exports = {
  success,
  error,
  paginated
};
