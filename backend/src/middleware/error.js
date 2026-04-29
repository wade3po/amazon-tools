export function errorHandler(err, req, res, _next) {
  console.error('Error:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ message: messages.join('; ') });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    const fieldName = field === 'email' ? '邮箱' : field === 'username' ? '用户名' : field;
    return res.status(409).json({ message: `该${fieldName}已被注册` });
  }

  res.status(err.status || 500).json({
    message: err.message || '服务器内部错误',
  });
}
