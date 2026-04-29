import Account from './models/Account.js';

// 启动时确保存在一个默认管理员账号
// 如果 accounts 表为空，自动创建 admin / admin123
export async function seedDefaultAccount() {
  const count = await Account.countDocuments();
  if (count === 0) {
    await Account.create({
      username: 'admin',
      password: 'admin123',
      role: 'admin',
    });
    console.log('🔑 已创建默认管理员账号: admin / admin123');
  }
}
