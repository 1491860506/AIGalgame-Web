import {
    readFile,
    // other functions
  } from './IndexedDBFileSystem.js';
  
  const GOOGLE_API_KEY = 'AIzaSyCpYeBopqsnpm0RRzJwlEWpMj_c-Ey9brQ'; // Replace with your actual API key
  
/**
 * Generates images using the Gemini API with a prompt and a list of images.
 *
 * @param {string} prompt The text prompt to guide the image generation.
 * @param {string[]} imagePaths An array of paths to images stored in the IndexedDB file system.
 * @returns {Promise<string[]>} A promise that resolves to an array of base64-encoded image strings.  Returns an empty array if there are no images. Returns a single item array if one image is successfully created. Rejects with an error message on failure.
 * @throws {Error} If there are issues accessing the IndexedDB file system, uploading files or calling the Gemini API.
 */
async function generateImagesWithGemini(prompt, imagePaths) {
    if (!prompt) {
      throw new Error('Prompt cannot be empty.');
    }
  
    if (!imagePaths || !Array.isArray(imagePaths)) {
      throw new Error('imagePaths must be a non-empty array.');
    }
  
    try {
      if (!imagePaths.length) {
          console.warn("No images to use.  Generating an image from the text prompt only."); // Not exceptional, but good to know
      }
  
      const contents = [{ parts: [{ text: prompt }] }];
  
      // Add the uploaded images to the contents array
      for (const imagePath of imagePaths) {
         try {
                const blob = await readFile(imagePath); // Get Blob from readFile
  
                 if (!(blob instanceof Blob)) {
                      throw new Error(`Invalid file data format at path ${imagePath}. Expected Blob.`)
                 }
  
             const mimeType = blob.type || 'image/png';  // Default to png. You should always have a real mimeType from the upload.
  
            // Convert blob to base64 string for Gemini API, if not a buffer already
               const base64Data = await new Promise((resolve, reject) => {
                       const reader = new FileReader();
                       reader.onloadend = () => {
                         const base64String = reader.result.split(",")[1]; // Extract only the base64 part
                         resolve(base64String);
                      };
                      reader.onerror = reject; // Reject the promise if there an error reading the file
                      reader.readAsDataURL(blob);
                   });
  
             contents[0].parts.push({
               inline_data: {
                  mime_type: mimeType,
                  data: base64Data,
               },
            });
         } catch (readError){
              console.error(`Failed to read image data for ${imagePath}:`, readError);
                  throw new Error(`Failed to read image data for ${imagePath}: ${readError.message}`);  //Re-throw.  Image data MUST be readable
         }
      }
  
      // Make the API call
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${GOOGLE_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: contents,
            generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
          }),
        }
      );
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `API Error: ${response.status} - ${JSON.stringify(errorData)}`
        );
      }
  
      const data = await response.json();
        if (
            data.candidates &&
            data.candidates.length > 0 &&
            data.candidates[0].content &&
            data.candidates[0].content.parts &&
            data.candidates[0].content.parts.length > 0
        ) {
            const imageResults = data.candidates[0].content.parts.filter(
                (part) => part.inlineData && part.inlineData.data
            ); // Filter out text parts
  
            if (imageResults.length > 0) {
                const base64Images = imageResults.map(
                    (part) => `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`
                );
                return base64Images;
            } else {
                return []; // API successfully returned but no image data found
            }
        } else {
         throw new Error('Unexpected API response format.');
        }
  
    } catch (error) {
      console.error('Error generating image with Gemini:', error);
      throw error; // Re-throw to be handled by the calling function
    }
  }
  
  export { generateImagesWithGemini };