import jwt from 'jsonwebtoken';
import Account from '../models/Account.js';

export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ message: '请先登录' });
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const account = await Account.findById(decoded.id);
    if (!account) {
      return res.status(401).json({ message: '账号不存在' });
    }

    req.user = account;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: '无效的登录凭证' });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: '登录已过期，请重新登录' });
    }
    next(err);
  }
}
