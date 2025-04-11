import { ref } from 'vue';

export const useProfileImages = () => {
  const images = ref<any[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const fetchImages = async () => {
    try {
      loading.value = true;
      const { data } = await useFetch('http://localhost:3001/api/profile');
      images.value = data.value || [];
    } catch (err) {
      error.value = err.message || 'Failed to fetch images';
    } finally {
      loading.value = false;
    }
  };

  const deleteImage = async (filename: string) => {
    try {
      await useFetch(`http://localhost:3001/api/profile/${filename}`, {
        method: 'DELETE'
      });
      await fetchImages(); // Refresh the list
      return true;
    } catch (err) {
      error.value = err.message || 'Failed to delete image';
      return false;
    }
  };

  return {
    images,
    loading,
    error,
    fetchImages,
    deleteImage
  };
};