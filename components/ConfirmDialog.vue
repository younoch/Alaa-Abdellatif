<!-- components/ConfirmDialog.vue -->
<template>
    <div v-if="visible" class="confirm-dialog-overlay">
      <div class="confirm-dialog">
        <h3>{{ title }}</h3>
        <p>{{ message }}</p>
        <div class="dialog-actions">
          <button @click="onCancel" class="cancel-button">Cancel</button>
          <button @click="onConfirm" class="confirm-button">Confirm</button>
        </div>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  defineProps({
    visible: Boolean,
    title: {
      type: String,
      default: 'Are you sure?'
    },
    message: {
      type: String,
      default: 'This action cannot be undone'
    }
  });
  
  const emit = defineEmits(['confirm', 'cancel']);
  
  const onConfirm = () => emit('confirm');
  const onCancel = () => emit('cancel');
  </script>
  
  <style scoped>
  .confirm-dialog-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  }
  
  .confirm-dialog {
    background: white;
    padding: 1.5rem;
    border-radius: 8px;
    max-width: 400px;
    width: 100%;
  }
  
  .dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 1.5rem;
  }
  
  .cancel-button {
    background: #f5f5f5;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .confirm-button {
    background: #f44336;
    color: white;
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }
  </style>