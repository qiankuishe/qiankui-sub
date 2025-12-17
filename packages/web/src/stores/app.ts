import { defineStore } from 'pinia';
import { ref } from 'vue';
import { sourcesApi, subApi, type Source, type SubFormat } from '../api';

export const useAppStore = defineStore('app', () => {
  // 状态
  const sources = ref<Source[]>([]);
  const subFormats = ref<SubFormat[]>([]);
  const lastSaveTime = ref<string>(''); // 上次保存时间
  const saving = ref(false);
  const refreshing = ref(false); // 刷新节点数中
  const darkMode = ref(localStorage.getItem('darkMode') === 'true');

  // 切换深色模式
  function toggleDarkMode() {
    darkMode.value = !darkMode.value;
    localStorage.setItem('darkMode', String(darkMode.value));
    applyTheme();
  }

  function applyTheme() {
    document.documentElement.classList.toggle('dark', darkMode.value);
  }

  // 加载订阅源（并自动刷新节点数）
  async function loadSources() {
    refreshing.value = true;
    try {
      // 先获取基本数据
      const data = await sourcesApi.getAll();
      sources.value = data.sources;
      lastSaveTime.value = data.lastSaveTime;
      
      // 然后刷新节点数
      if (sources.value.length > 0) {
        const refreshData = await sourcesApi.refresh();
        sources.value = refreshData.sources;
        lastSaveTime.value = refreshData.lastSaveTime;
      }
    } finally {
      refreshing.value = false;
    }
  }

  // 创建订阅源
  async function createSource(name: string, content: string) {
    saving.value = true;
    try {
      const data = await sourcesApi.create(name, content);
      sources.value.push(data.source);
      return data.source;
    } finally {
      saving.value = false;
    }
  }

  // 更新订阅源
  async function updateSource(id: number, data: { name?: string; content?: string }) {
    saving.value = true;
    try {
      const result = await sourcesApi.update(id, data);
      const index = sources.value.findIndex((s) => s.id === id);
      if (index !== -1) {
        sources.value[index] = result.source;
      }
      return result.source;
    } finally {
      saving.value = false;
    }
  }

  // 删除订阅源
  async function deleteSource(id: number) {
    saving.value = true;
    try {
      await sourcesApi.delete(id);
      sources.value = sources.value.filter((s) => s.id !== id);
    } finally {
      saving.value = false;
    }
  }

  // 更新排序
  async function reorderSources(ids: number[]) {
    saving.value = true;
    try {
      await sourcesApi.reorder(ids);
    } finally {
      saving.value = false;
    }
  }

  // 加载订阅链接
  async function loadSubFormats() {
    const data = await subApi.getInfo();
    subFormats.value = data.formats;
  }

  // 初始化主题
  applyTheme();

  return {
    sources,
    subFormats,
    lastSaveTime,
    saving,
    refreshing,
    darkMode,
    toggleDarkMode,
    loadSources,
    createSource,
    updateSource,
    deleteSource,
    reorderSources,
    loadSubFormats,
  };
});
