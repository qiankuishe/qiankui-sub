import { nanoid } from 'nanoid';

// 生成随机密码
const generatePassword = () => nanoid(12);

// 生成随机 token
const generateToken = () => nanoid(32);

// 配置值（初始化后填充）
let _adminPassword: string = '';
let _subToken: string = '';
let _initialized = false;

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  
  get adminPassword(): string {
    return _adminPassword;
  },
  
  get subToken(): string {
    return _subToken;
  },
  
  dbPath: process.env.DB_PATH || './data/qiankui.db',
};

// 初始化配置（数据库初始化后调用）
export function initConfig(configDb: { get: (key: string) => string | undefined }, getOrCreateConfig: (key: string, generator: () => string) => string) {
  if (_initialized) return;
  _initialized = true;
  
  // 获取或生成密码
  if (process.env.ADMIN_PASSWORD) {
    _adminPassword = process.env.ADMIN_PASSWORD;
  } else {
    const isNew = !configDb.get('adminPassword');
    _adminPassword = getOrCreateConfig('adminPassword', generatePassword);
    
    if (isNew) {
      console.log('========================================');
      console.log('🔐 初始登录信息（首次生成，已持久化）');
      console.log(`   用户名: ${config.adminUsername}`);
      console.log(`   密码: ${_adminPassword}`);
      console.log('========================================');
    }
  }
  
  // 获取或生成 token
  if (process.env.SUB_TOKEN) {
    _subToken = process.env.SUB_TOKEN;
  } else {
    const isNew = !configDb.get('subToken');
    _subToken = getOrCreateConfig('subToken', generateToken);
    
    if (isNew) {
      console.log('========================================');
      console.log('🔑 订阅 Token（首次生成，已持久化）');
      console.log(`   Token: ${_subToken}`);
      console.log('========================================');
    }
  }
}
