export const notFoundHandler = (_req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found."
  });
};

export const errorHandler = (error, _req, res, _next) => {
  const statusCode = error.statusCode || 500;

  if (process.env.NODE_ENV !== "production") {
    console.error(error);
  }

  res.status(statusCode).json({
    success: false,
    message: error.message || "Something went wrong."
  });
};
