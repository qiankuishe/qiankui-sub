<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAppStore } from '../stores/app';
import { storeToRefs } from 'pinia';
import { sourcesApi, authApi, type Source } from '../api';
import { ElMessage, ElMessageBox } from 'element-plus';
import draggable from 'vuedraggable';
import QRCode from 'qrcode';
import { useDebounceFn } from '@vueuse/core';

const router = useRouter();
const store = useAppStore();
const { sources, subFormats, lastSaveTime, saving, refreshing, darkMode } = storeToRefs(store);

// 二维码弹窗
const qrDialogVisible = ref(false);
const qrTitle = ref('');
const qrDataUrl = ref('');

// 订阅源弹窗状态
const dialogVisible = ref(false);
const editingSource = ref<Source | null>(null);
const formName = ref('');
const formContent = ref('');
const validating = ref(false);
const validation = ref<{ valid: boolean; urlCount: number; nodeCount: number; totalCount: number; duplicateCount: number } | null>(null);

// 计算属性
const dialogTitle = computed(() => (editingSource.value ? '编辑订阅源' : '添加订阅源'));
const saveTimeText = computed(() => {
  if (refreshing.value) return '刷新中...';
  if (saving.value) return '保存中...';
  if (!lastSaveTime.value) return '尚未保存';
  const date = new Date(lastSaveTime.value);
  return `上次保存: ${date.toLocaleString('zh-CN')}`;
});

// 加载数据
onMounted(() => {
  store.loadSources();
  store.loadSubFormats();
});

// 复制链接
const copyLink = async (url: string) => {
  try {
    await navigator.clipboard.writeText(url);
    ElMessage.success('复制成功');
  } catch {
    ElMessage.error('复制失败');
  }
};

// 显示二维码
const showQRCode = async (name: string, url: string) => {
  try {
    qrTitle.value = name;
    qrDataUrl.value = await QRCode.toDataURL(url, { width: 256, margin: 2 });
    qrDialogVisible.value = true;
  } catch {
    ElMessage.error('生成二维码失败');
  }
};

// 打开添加弹窗
const openAddDialog = () => {
  editingSource.value = null;
  formName.value = '';
  formContent.value = '';
  validation.value = null;
  dialogVisible.value = true;
};

// 打开编辑弹窗
const openEditDialog = (source: Source) => {
  editingSource.value = source;
  formName.value = source.name;
  formContent.value = source.content;
  validation.value = { valid: true, urlCount: 0, nodeCount: source.nodeCount, totalCount: source.nodeCount };
  dialogVisible.value = true;
};

// 验证内容（带防抖）
const doValidate = async () => {
  if (!formContent.value.trim()) {
    validation.value = null;
    return;
  }
  validating.value = true;
  try {
    validation.value = await sourcesApi.validate(formContent.value);
  } catch {
    validation.value = null;
  } finally {
    validating.value = false;
  }
};

// 防抖验证，输入后 300ms 自动验证
const validateContent = useDebounceFn(doValidate, 300);

// 监听内容变化，自动验证
watch(formContent, () => {
  validateContent();
});

// 保存
const handleSave = async () => {
  if (!formName.value.trim()) {
    ElMessage.warning('请输入备注名称');
    return;
  }
  if (!formContent.value.trim()) {
    ElMessage.warning('请输入订阅链接或节点');
    return;
  }

  try {
    if (editingSource.value) {
      await store.updateSource(editingSource.value.id, {
        name: formName.value,
        content: formContent.value,
      });
      ElMessage.success('更新成功');
    } else {
      await store.createSource(formName.value, formContent.value);
      ElMessage.success('添加成功');
    }
    dialogVisible.value = false;
    // 刷新数据
    await store.loadSources();
    await store.loadSubFormats();
  } catch (e: unknown) {
    ElMessage.error((e as Error).message || '保存失败');
  }
};

// 删除
const handleDelete = async (source: Source) => {
  try {
    await ElMessageBox.confirm(`确定删除「${source.name}」吗？`, '确认删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    });
    await store.deleteSource(source.id);
    ElMessage.success('删除成功');
  } catch {
    // 取消删除
  }
};

// 拖拽排序
const handleDragEnd = async () => {
  const ids = sources.value.map((s) => s.id);
  await store.reorderSources(ids);
};

// 退出登录
const handleLogout = async () => {
  try {
    await authApi.logout();
  } catch {
    // 忽略错误
  }
  router.push('/login');
};
</script>

<template>
  <div class="home-page">
    <!-- 头部 -->
    <header class="app-header-wrapper">
      <div class="app-header">
        <div class="header-left">
          <img src="/logo.png" alt="Logo" class="app-logo" />
          <h1 class="app-title">QianKui 聚合</h1>
        </div>
        <div class="header-right">
          <button class="theme-btn" @click="store.toggleDarkMode">
            <svg v-if="darkMode" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/>
              <line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
            <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          </button>
          <button class="logout-btn" @click="handleLogout">退出登录</button>
        </div>
      </div>
    </header>

    <main class="app-main">
      <!-- 订阅链接区域 -->
      <section class="section">
        <div class="section-header">
          <h2 class="section-title">订阅链接</h2>
          <span class="aggregate-time">{{ saveTimeText }}</span>
        </div>
        <div class="links-list">
          <div v-for="format in subFormats" :key="format.key" class="link-item">
            <span class="link-name">{{ format.name }}</span>
            <span class="link-url">{{ format.url }}</span>
            <button class="btn-action" @click="showQRCode(format.name, format.url)">二维码</button>
            <button class="btn-action" @click="copyLink(format.url)">复制</button>
          </div>
          <div v-if="subFormats.length === 0" class="empty-tip">加载中...</div>
        </div>

      </section>

      <!-- 订阅源管理区域 -->
      <section class="section">
        <h2 class="section-title">订阅源管理</h2>
        <div class="source-list">
          <draggable
            v-model="sources"
            item-key="id"
            handle=".drag-handle"
            @end="handleDragEnd"
            :scroll-sensitivity="100"
            :force-fallback="true"
          >
            <template #item="{ element }">
              <div class="source-item">
                <span class="drag-handle">☰</span>
                <span class="source-name">{{ element.name }}</span>
                <span class="source-count">{{ element.nodeCount }} 条</span>
                <button class="btn-edit" @click="openEditDialog(element)">编辑</button>
                <button class="btn-delete" @click="handleDelete(element)">删除</button>
              </div>
            </template>
          </draggable>
          <div v-if="sources.length === 0" class="empty-tip">暂无订阅源，点击下方按钮添加</div>
        </div>
        <button class="btn-add" @click="openAddDialog">+ 添加订阅源</button>
      </section>
    </main>

    <!-- 底部 -->
    <footer class="app-footer">
      <span>Made by </span>
      <a href="https://github.com/qiankuishe" target="_blank" rel="noopener">qiankuishe</a>
      <span> · </span>
      <a href="https://github.com/qiankuishe/qiankui-sub" target="_blank" rel="noopener" class="github-link">
        <svg height="16" width="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
        </svg>
      </a>
    </footer>

    <!-- 二维码弹窗 -->
    <el-dialog v-model="qrDialogVisible" :title="qrTitle + ' 订阅二维码'" width="320px" center>
      <div class="qr-container">
        <img :src="qrDataUrl" alt="QR Code" />
      </div>
    </el-dialog>

    <!-- 添加/编辑订阅源弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="600px">
      <el-form label-position="top">
        <el-form-item label="备注名称">
          <el-input v-model="formName" placeholder="例如：香港节点、美国节点" />
        </el-form-item>
        <el-form-item label="订阅链接或节点">
          <el-input
            v-model="formContent"
            type="textarea"
            :rows="8"
            placeholder="每行一条链接，支持订阅链接(http/https)和节点URI混合输入"
          />
          <div class="form-tip">
            <span v-if="validating">验证中...</span>
            <span v-else-if="validation">
              共 {{ validation.nodeCount }} 条节点
              <template v-if="validation.duplicateCount > 0">（{{ validation.duplicateCount }} 条重复）</template>
            </span>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.home-page {
  min-height: 100vh;
  background: var(--bg-color);
}

.app-header-wrapper {
  border-bottom: 1px solid var(--border-color);
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 860px;
  margin: 0 auto;
  padding: 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 14px;
}

.app-logo {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  box-shadow: 0 2px 8px var(--shadow-color);
}

.app-title {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
  color: var(--primary-color);
  letter-spacing: 0.5px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.theme-btn {
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-card);
  cursor: pointer;
  color: var(--text-color);
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px var(--shadow-color);
  display: flex;
  align-items: center;
  justify-content: center;
}

.logout-btn {
  padding: 8px 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-card);
  cursor: pointer;
  color: var(--text-color);
  font-size: 14px;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px var(--shadow-color);
}

.theme-btn:hover,
.logout-btn:hover {
  background: var(--hover-bg);
  border-color: var(--primary-color);
  transform: translateY(-1px);
}

.app-main {
  max-width: 860px;
  margin: 0 auto;
  padding: 32px 24px;
}

.section {
  margin-bottom: 36px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-title {
  font-size: 17px;
  font-weight: 600;
  margin: 0;
  color: var(--text-color);
  position: relative;
  padding-left: 12px;
}

.section-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 4px;
  height: 18px;
  background: var(--primary-color);
  border-radius: 2px;
}

.aggregate-time {
  color: var(--text-secondary);
  font-size: 13px;
  background: var(--hover-bg);
  padding: 4px 10px;
  border-radius: 12px;
}

.links-list,
.source-list {
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  margin-bottom: 16px;
  overflow: hidden;
  box-shadow: 0 2px 8px var(--shadow-color);
}

.link-item,
.source-item {
  display: flex;
  align-items: center;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-color);
  gap: 14px;
  transition: background 0.2s ease;
}

.link-item:hover,
.source-item:hover {
  background: var(--hover-bg);
}

.link-item:last-child,
.source-item:last-child {
  border-bottom: none;
}

.link-name {
  width: 100px;
  font-weight: 600;
  flex-shrink: 0;
  color: var(--primary-color);
  white-space: nowrap;
}

.link-url {
  flex: 1;
  color: var(--text-secondary);
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: 'SF Mono', Monaco, monospace;
}

.drag-handle {
  cursor: grab;
  color: var(--accent-color);
  user-select: none;
  font-size: 16px;
  opacity: 0.6;
  transition: opacity 0.2s;
}

.drag-handle:hover {
  opacity: 1;
}

.source-name {
  flex: 1;
  font-weight: 500;
}

.source-count {
  color: var(--text-secondary);
  font-size: 13px;
  background: var(--hover-bg);
  padding: 2px 8px;
  border-radius: 10px;
}

.btn-action,
.btn-edit,
.btn-delete {
  padding: 6px 14px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-card);
  cursor: pointer;
  color: var(--text-color);
  flex-shrink: 0;
  font-size: 13px;
  transition: all 0.2s ease;
}

.btn-action:hover,
.btn-edit:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
  background: var(--hover-bg);
}

.btn-delete:hover {
  border-color: #c45c5c;
  color: #c45c5c;
  background: rgba(196, 92, 92, 0.1);
}

.empty-tip {
  padding: 48px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 14px;
}

.btn-add {
  width: 100%;
  padding: 14px;
  border: 2px dashed var(--border-color);
  border-radius: 12px;
  background: transparent;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-add:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
  background: var(--hover-bg);
}

.qr-container {
  display: flex;
  justify-content: center;
  padding: 20px;
}

.qr-container img {
  border-radius: 12px;
  box-shadow: 0 4px 12px var(--shadow-color);
}

.form-tip {
  margin-top: 10px;
  font-size: 13px;
  color: var(--text-secondary);
}

.app-footer {
  text-align: center;
  padding: 32px 24px;
  color: var(--text-secondary);
  font-size: 13px;
  border-top: 1px solid var(--border-color);
  margin-top: 20px;
}

.app-footer a {
  color: var(--text-secondary);
  text-decoration: none;
  transition: color 0.2s ease;
}

.app-footer a:hover {
  color: var(--primary-color);
}

.github-link {
  display: inline-flex;
  align-items: center;
  vertical-align: middle;
}

.github-link svg {
  vertical-align: middle;
}
</style>
