import { ref } from 'vue';
import heic2any from 'heic2any';


export const useProfileImage = () => {
  const previewUrl = ref<string | null>(null);
  const selectedFile = ref<File | null>(null);
  const error = ref<string | null>(null);
  const isLoading = ref(false);


  const handleFileChange = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
  
    const file = input.files[0];
    
    // Check if file is HEIC
    if (file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic')) {
      try {
        isLoading.value = true;
        
        // Convert HEIC to JPEG
        const conversionResult = await heic2any({
          blob: file,
          toType: 'image/jpeg',
          quality: 0.8 // Adjust quality as needed
        }) as Blob;
        
        // Create a new File object from the converted blob
        const convertedFile = new File(
          [conversionResult], 
          file.name.replace(/\.heic$/i, '.jpg'),
          { type: 'image/jpeg' }
        );
        
        // Create preview URL from converted file
        previewUrl.value = URL.createObjectURL(convertedFile);
      } catch (err) {
        error.value = 'Failed to convert HEIC image';
        console.error('HEIC conversion error:', err);
      } finally {
        isLoading.value = false;
      }
    } else {
      // Regular image handling for non-HEIC files
      previewUrl.value = URL.createObjectURL(file);
    }
  };

  const uploadImage = async () => {
    if (!selectedFile.value) return;

    isLoading.value = true;
    error.value = null;

    try {
      const formData = new FormData();
      formData.append('profileImage', selectedFile.value);

      const { data, error: uploadError } = await useFetch('http://localhost:3001/api/profile/upload', {
        method: 'POST',
        body: formData
      });

      if (uploadError.value) {
        throw uploadError.value;
      }

      return data.value;
    } catch (err) {
      error.value = err.message || 'Failed to upload image';
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const reset = () => {
    previewUrl.value = null;
    selectedFile.value = null;
    error.value = null;
  };

  return {
    previewUrl,
    selectedFile,
    error,
    isLoading,
    handleFileChange,
    uploadImage,
    reset
  };
};

