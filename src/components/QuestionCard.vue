<template>
  <div class="question-card">
    <div class="question-type-tag" :class="question.type">
      {{ question.type || '练习题' }}
    </div>
    
    <div class="question-content">
      <img v-if="question.image_url" :src="question.image_url" alt="题目图片" class="question-image" />
      <div v-if="question.extracted_text" class="question-text">
        {{ question.extracted_text }}
      </div>
    </div>
    
    <div v-if="showActions" class="question-actions">
      <van-button size="small" type="primary" plain @click="$emit('edit')">
        编辑
      </van-button>
      <van-button size="small" type="danger" plain @click="$emit('delete')">
        删除
      </van-button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  question: {
    type: Object,
    required: true
  },
  showActions: {
    type: Boolean,
    default: true
  }
})

defineEmits(['edit', 'delete'])
</script>

<style scoped>
.question-card {
  background: white;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.question-type-tag {
  display: inline-block;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  background: #e6f4ff;
  color: #1989fa;
  margin-bottom: 8px;
}

.question-type-tag.choice {
  background: #fff7e6;
  color: #fa8c16;
}

.question-type-tag.judge {
  background: #f6ffed;
  color: #52c41a;
}

.question-content {
  font-size: 14px;
  line-height: 1.6;
  color: #323233;
}

.question-image {
  width: 100%;
  max-height: 200px;
  object-fit: contain;
  border-radius: 4px;
  margin-bottom: 8px;
}

.question-text {
  white-space: pre-wrap;
}

.question-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  justify-content: flex-end;
}
</style>
