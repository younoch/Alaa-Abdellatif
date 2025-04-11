// composables/useCustomToast.ts
export const useCustomToast = () => {
    const toast = useToast(); // This now correctly references Nuxt UI's toast
    
    return {
      add: (options: any) => {
        toast.add(options);
      }
    };
  };