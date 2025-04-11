<template>
    <div class="profile-image-upload">
      <div v-if="previewUrl || currentImage" class="image-preview-container">
        <img 
          :src="previewUrl || currentImage" 
          alt="Profile preview" 
          class="preview-image"
        />
        <button 
          v-if="previewUrl" 
          @click="resetUpload"
          class="cancel-button"
        >
          Cancel
        </button>
      </div>
      
      <div class="upload-controls">
        <label for="profileImage" class="upload-label">
          {{ previewUrl ? 'Change Image' : currentImage ? 'Change Image' : 'Upload Image' }}
        </label>
        <input
          id="profileImage"
          type="file"
          accept=".jpg,.jpeg,.png,.heic"
          @change="handleFileChange"
          class="file-input"
        />
        
        <button 
          v-if="previewUrl" 
          @click="handleUpload" 
          :disabled="isLoading"
          class="upload-button"
        >
          {{ isLoading ? 'Uploading...' : 'Save Image' }}
        </button>
      </div>
      
      <p v-if="error" class="error-message">{{ error }}</p>
    </div>
  </template>
  
  <script setup lang="ts">
  const props = defineProps({
    currentImage: {
      type: String,
      default: ''
    }
  });
  
  const emit = defineEmits(['upload-success']);
  
  const {
    previewUrl,
    error,
    isLoading,
    handleFileChange,
    uploadImage,
    reset
  } = useProfileImage();

  
  const resetUpload = () => {
    reset();
    // Reset file input
    const input = document.getElementById('profileImage') as HTMLInputElement;
    if (input) input.value = '';
  };
  
  const handleUpload = async () => {
    try {
      const result = await uploadImage();
      emit('upload-success', result.imageUrl);
      resetUpload();
    } catch (err) {
      console.error('Upload failed:', err);
    }
  };
  </script>
  
  <style scoped>
  .profile-image-upload {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    max-width: 500px;
  }
  
  .image-preview-container {
    position: relative;
    width: 200px;
    height: 200px;
    border-radius: 50%;
    overflow: hidden;
    border: 2px solid #eee;
  }
  
  .preview-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .cancel-button {
    position: absolute;
    bottom: 10px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.7);
    color: white;
    border: none;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .upload-controls {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .file-input {
    display: none;
  }
  
  .upload-label {
    display: inline-block;
    padding: 8px 16px;
    background: #4CAF50;
    color: white;
    border-radius: 4px;
    cursor: pointer;
    text-align: center;
    max-width: 150px;
  }
  
  .upload-label:hover {
    background: #45a049;
  }
  
  .upload-button {
    padding: 8px 16px;
    background: #2196F3;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    max-width: 150px;
  }
  
  .upload-button:hover {
    background: #0b7dda;
  }
  
  .upload-button:disabled {
    background: #cccccc;
    cursor: not-allowed;
  }
  
  .error-message {
    color: #f44336;
    margin-top: 0.5rem;
  }
  </style>