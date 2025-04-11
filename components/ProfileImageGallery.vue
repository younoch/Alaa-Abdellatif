<template>
    <div class="image-gallery">
      <h2>Uploaded Images</h2>
      
      <div v-if="loading" class="loading">
        Loading images...
      </div>
      
      <div v-else-if="error" class="error">
        {{ error }}
      </div>
      
      <div v-else-if="images.length === 0" class="empty">
        No images uploaded yet
      </div>
      
      <div v-else class="image-grid">
        <div v-for="image in images" :key="image.filename" class="image-card">
          <img :src="image.url" :alt="image.filename" class="thumbnail" />
          <div class="image-actions">
            <button @click="deleteImage(image.filename)" class="delete-button">
              Delete
            </button>
            <span class="image-date">
              {{ formatDate(image.createdAt) }}
            </span>
          </div>
        </div>
      </div>
    </div>
    <ConfirmDialog
        v-if="showConfirm"
        title="Delete Image"
        message="Are you sure you want to delete this image?"
        @confirm="handleDelete"
        @cancel="showConfirm = false"
    />
  </template>
  
  <script setup lang="ts">
  const { images, loading, error, deleteImage, fetchImages } = useProfileImages();

  const props = defineProps({
    galleryKey: {
      type: Number,
      required: true
    }
  });
  
  // Fetch images on component mount
  onMounted(() => {
    fetchImages();
  });

  watch(
    () => props.galleryKey,
    () => {
      fetchImages();
    }
  );
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const showConfirm = ref(false);
const imageToDelete = ref<string | null>(null);

const confirmDelete = (filename: string) => {
  imageToDelete.value = filename;
  showConfirm.value = true;
};

const handleDelete = async () => {
  if (imageToDelete.value) {
    await deleteImage(imageToDelete.value);
    showConfirm.value = false;
    imageToDelete.value = null;
  }
};
  </script>
  
  <style scoped>
  .image-gallery {
    margin-top: 2rem;
    padding: 1rem;
    border-top: 1px solid #eee;
  }
  
  .loading, .error, .empty {
    padding: 1rem;
    text-align: center;
  }
  
  .error {
    color: #f44336;
  }
  
  .image-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem;
    margin-top: 1rem;
  }
  
  .image-card {
    border: 1px solid #ddd;
    border-radius: 8px;
    overflow: hidden;
  }
  
  .thumbnail {
    width: 100%;
    height: 150px;
    object-fit: cover;
  }
  
  .image-actions {
    padding: 0.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .delete-button {
    background: #f44336;
    color: white;
    border: none;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
  }
  
  .delete-button:hover {
    background: #d32f2f;
  }
  
  .image-date {
    font-size: 0.8rem;
    color: #666;
  }
  </style>