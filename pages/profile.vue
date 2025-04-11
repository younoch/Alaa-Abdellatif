<template>
    <div class="profile-page">
      <h1>My Profile</h1>
      
      <ProfileImageUpload 
        :current-image="user.profileImage" 
        @upload-success="handleUploadSuccess"
      />
      
      <ProfileImageGallery :galleryKey="galleryKey" />
    </div>
  </template>
  
  <script setup lang="ts">
  const user = ref({
    profileImage: ''
  });
  
  const gallery = ref();
  const galleryKey = ref(0);
  
  const handleUploadSuccess = (result: any) => {
    user.value.profileImage = result.imageUrl;
    
    galleryKey.value += 1; // Force re-render
    
    useToast().add({
      title: 'Success',
      description: 'Profile image updated successfully',
      icon: 'i-heroicons-check-circle',
      color: 'green'
    });
  };
  </script>