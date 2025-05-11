<template>
  <div>
    <button @click="generate">Generate Image</button>
    <img v-if="generatedImage" :src="generatedImage" alt="Generated Image">
    <p v-if="error">{{ error }}</p>
  </div>
</template>

<script>
import { ref } from 'vue';
import { generateImagesWithGemini } from './services/gemini-picture'; // Adjust the import path

export default {
  setup() {
    const generatedImage = ref('');
    const error = ref('');

    const generate = async () => {
       error.value = '';
      try {

        const imagePaths = ['/data/星河彼岸的音律/images/爱丽丝.png', '/data/星河彼岸的音律/images/林晓晨.png']; //Replace with valid paths.

        const images = await generateImagesWithGemini(
          "画出两人深情热吻的图片", // Prompt
          imagePaths // Array of *file paths* in your IndexedDB filesystem
        );

         if(images && images.length > 0){
              generatedImage.value = images[0];  //Show the first image. Adapt to your component
         } else {
             console.warn("Gemini API returned successfully, but no image data.")
             generatedImage.value = '';
         }

       } catch (err) {
        console.error(err)
        error.value = err.message || "An unexpected error occurred.";
       }
    };

    return { generatedImage, error, generate };
  }
};
</script>