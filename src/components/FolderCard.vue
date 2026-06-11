<template>
  <div class="folder-card" @click="$emit('click')">
    <div class="folder-icon">
      <van-icon name="folder-o" size="32" color="#1989fa" />
    </div>
    <div class="folder-info">
      <div class="folder-name">{{ folder.name }}</div>
      <div class="folder-meta">
        <span>{{ folder.questionCount || 0 }} 道题目</span>
        <span class="dot">·</span>
        <span>{{ formatDate(folder.created_at) }}</span>
      </div>
    </div>
    <div class="folder-arrow">
      <van-icon name="arrow" color="#c8c9cc" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  folder: {
    type: Object,
    required: true
  }
})

defineEmits(['click'])

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now - date
  
  // 一天内
  if (diff < 24 * 60 * 60 * 1000) {
    return '今天'
  }
  
  // 一周内
  if (diff < 7 * 24 * 60 * 60 * 1000) {
    return Math.floor(diff / (24 * 60 * 60 * 1000)) + '天前'
  }
  
  // 显示日期
  return date.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit'
  })
}
</script>

<style scoped>
.folder-card {
  display: flex;
  align-items: center;
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin: 0 12px 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.folder-card:active {
  transform: scale(0.98);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
}

.folder-icon {
  width: 48px;
  height: 48px;
  background: #e6f4ff;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
}

.folder-info {
  flex: 1;
  min-width: 0;
}

.folder-name {
  font-size: 16px;
  font-weight: 500;
  color: #323233;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.folder-meta {
  font-size: 12px;
  color: #969799;
  display: flex;
  align-items: center;
}

.dot {
  margin: 0 6px;
}

.folder-arrow {
  flex-shrink: 0;
}
</style>
