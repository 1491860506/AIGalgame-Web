<template>
  <div class="image-generator">
    <h2>AI Image Generation Test</h2>

    <div class="controls">
       <button @click="runGetAllPersons" :disabled="isLoading">Generate All Characters (Overwrite)</button>
       <div class="single-char">
          <input type="text" v-model="singleCharacterName" placeholder="Character Name" :disabled="isLoading"/>
          <button @click="runGetSinglePerson" :disabled="isLoading || !singleCharacterName">Generate Single Character (Overwrite)</button>
       </div>
       <button @click="runGetPlacesOverwrite" :disabled="isLoading">Generate Places (Overwrite)</button>
       <button @click="runGetPlacesNoOverwrite" :disabled="isLoading">Generate Places (No Overwrite)</button>
    </div>

    <div class="status" v-if="statusMessage">
      <h3>Status</h3>
      <pre>{{ statusMessage }}</pre>
    </div>

    <div class="results" v-if="finalResult">
      <h3>Results</h3>
      <div v-if="finalResult.success?.length">
        <h4>Successful: ({{ finalResult.success.length }})</h4>
        <ul>
          <li v-for="name in finalResult.success" :key="name">{{ name }}</li>
        </ul>
      </div>
       <div v-if="finalResult.failed?.length">
        <h4>Failed: ({{ finalResult.failed.length }})</h4>
        <ul>
          <li v-for="name in finalResult.failed" :key="name">{{ name }}</li>
        </ul>
      </div>
      <div v-if="finalResult.skipped?.length">
        <h4>Skipped: ({{ finalResult.skipped.length }})</h4>
        <ul>
          <li v-for="name in finalResult.skipped" :key="name">{{ name }}</li>
        </ul>
      </div>
       <div v-if="finalResult.error">
        <h4>Error:</h4>
        <pre>{{ finalResult.error }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
// Import the necessary functions from your service file
import {
  getAllPersonsImagesJS,
  getSinglePersonImageJS,
  getPlacesImagesJS
} from './services/ImageGenerationService.js'; // Adjust path if needed

const isLoading = ref(false);
const statusMessage = ref('');
const finalResult = ref(null);
const singleCharacterName = ref(''); // Input model for single character name

// --- Status Update Function ---
const updateStatus = (message) => {
  console.log("STATUS:", message); // Log to console as well
  statusMessage.value = message;
};

// --- Wrapper to handle loading state and results ---
const runGeneration = async (genFunction, ...args) => {
  if (isLoading.value) return;
  isLoading.value = true;
  statusMessage.value = 'Starting...';
  finalResult.value = null;
  try {
    const result = await genFunction(...args, updateStatus); // Pass updateStatus callback
    finalResult.value = result;
    statusMessage.value = 'Finished. See results below.';
  } catch (error) {
    console.error("Generation Error:", error);
    statusMessage.value = `An unexpected error occurred: ${error.message}`;
    finalResult.value = { error: error.message };
  } finally {
    isLoading.value = false;
  }
};

// --- Button Click Handlers ---
const runGetAllPersons = () => {
  runGeneration(getAllPersonsImagesJS);
};

const runGetSinglePerson = () => {
   if (!singleCharacterName.value) {
       updateStatus("Please enter a character name.");
       return;
   }
  runGeneration(getSinglePersonImageJS, singleCharacterName.value);
};

const runGetPlacesOverwrite = () => {
  runGeneration(getPlacesImagesJS, true); // cover = 1 (true)
};

const runGetPlacesNoOverwrite = () => {
  runGeneration(getPlacesImagesJS, false); // cover = 0 (false)
};

</script>

<style scoped>
.image-generator {
  font-family: sans-serif;
  padding: 20px;
  max-width: 800px;
  margin: auto;
  border: 1px solid #ccc;
  border-radius: 8px;
}

.controls button {
  margin: 5px;
  padding: 8px 15px;
  cursor: pointer;
}
.controls button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.controls .single-char {
    margin: 10px 5px;
    display: flex;
    align-items: center;
}
.controls .single-char input {
    padding: 8px;
    margin-right: 5px;
    flex-grow: 1;
}


.status, .results {
  margin-top: 20px;
  border-top: 1px solid #eee;
  padding-top: 15px;
}

.status pre, .results pre {
  background-color: #f8f8f8;
  padding: 10px;
  border-radius: 4px;
  white-space: pre-wrap; /* Wrap long lines */
  word-wrap: break-word; /* Break long words */
}

.results ul {
  list-style: none;
  padding: 0;
}
.results li {
  background-color: #f0f0f0;
  margin-bottom: 3px;
  padding: 3px 8px;
  border-radius: 3px;
}
.results h4 {
    margin-bottom: 5px;
}
</style>