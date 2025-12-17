import { nanoid } from 'nanoid';

// 生成随机密码
const generatePassword = () => nanoid(12);

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || generatePassword(),
  subToken: process.env.SUB_TOKEN || nanoid(32),
  dbPath: process.env.DB_PATH || './data/qiankui.db',
};
