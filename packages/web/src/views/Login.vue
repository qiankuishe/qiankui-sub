<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { authApi } from '../api';

const router = useRouter();
const username = ref('');
const password = ref('');
const loading = ref(false);
const showPassword = ref(false);

const handleLogin = async () => {
  if (!username.value || !password.value) {
    ElMessage.warning('请输入用户名和密码');
    return;
  }
  
  loading.value = true;
  try {
    const data = await authApi.login(username.value, password.value);
    if (data.success) {
      router.push('/');
    }
  } catch (e: unknown) {
    ElMessage.error((e as Error).message || '登录失败');
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <img src="/logo.png" alt="Logo" class="logo" />
        <div class="brand">
          <h1 class="title">QianKui 聚合</h1>
          <p class="subtitle">节点订阅转换聚合服务</p>
        </div>
      </div>
      <div class="login-form">
        <div class="form-group">
          <label class="form-label">用户名</label>
          <input
            v-model="username"
            type="text"
            class="form-input"
            placeholder="请输入用户名"
          />
        </div>
        <div class="form-group">
          <label class="form-label">密码</label>
          <div class="password-wrapper">
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              class="form-input"
              placeholder="请输入密码"
              @keyup.enter="handleLogin"
            />
            <button type="button" class="toggle-pwd" @click="showPassword = !showPassword">
              <svg v-if="showPassword" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
              <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
          </div>
        </div>
        <button
          class="login-btn"
          :class="{ loading }"
          :disabled="loading"
          @click="handleLogin"
        >
          {{ loading ? '登录中...' : '登 录' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--bg-color) 0%, var(--hover-bg) 100%);
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 420px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 24px;
  box-shadow: 0 12px 40px var(--shadow-color);
  overflow: hidden;
}

.login-header {
  display: flex;
  align-items: center;
  gap: 18px;
  padding: 32px 36px 24px;
  background: linear-gradient(135deg, var(--hover-bg) 0%, var(--bg-card) 100%);
}

.logo {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  box-shadow: 0 4px 12px var(--shadow-color);
  flex-shrink: 0;
}

.brand {
  flex: 1;
}

.title {
  margin: 0 0 4px 0;
  font-size: 22px;
  font-weight: 600;
  color: var(--primary-color);
  letter-spacing: 0.5px;
}

.subtitle {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.login-form {
  padding: 32px 36px 40px;
}

.form-group {
  margin-bottom: 24px;
}

.form-label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color);
}

.form-input {
  width: 100%;
  padding: 14px 16px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--bg-color);
  color: var(--text-color);
  font-size: 15px;
  outline: none;
  transition: all 0.2s ease;
}

.form-input::placeholder {
  color: var(--text-secondary);
  opacity: 0.6;
}

.form-input:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(166, 124, 82, 0.15);
}

.password-wrapper {
  position: relative;
}

.password-wrapper .form-input {
  padding-right: 48px;
}

.toggle-pwd {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  color: var(--text-secondary);
  opacity: 0.6;
  transition: opacity 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.toggle-pwd:hover {
  opacity: 1;
  color: var(--primary-color);
}

.login-btn {
  width: 100%;
  padding: 14px 24px;
  margin-top: 8px;
  border: none;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--accent-color) 100%);
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(166, 124, 82, 0.3);
}

.login-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(166, 124, 82, 0.4);
}

.login-btn:active:not(:disabled) {
  transform: translateY(0);
}

.login-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.login-btn.loading {
  background: var(--text-secondary);
}
</style>
