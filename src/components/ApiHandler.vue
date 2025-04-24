<template>
    <div>
      <h1>API Call Handler</h1>
      <p>Processing request...</p>
      <pre v-if="result">{{ JSON.stringify(result, null, 2) }}</pre>
      <p v-if="error">Error: {{ error }}</p>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue';
  import { useRoute } from 'vue-router';
  import { useApiEndpoints } from './services/useApiEndpoints'; // Adjust path if needed
  
  const route = useRoute();
  const { callTextGeneration, callJoinTasks, callNoJoinTasks, callEndGeneration } = useApiEndpoints();
  
  const result = ref(null);
  const error = ref(null);
  
  onMounted(async () => {
    const query = route.query;
    const functionName = query.function;
    // Log received query for debugging
    console.log('ApiHandler received query:', query);
  
    try {
      let response;
      switch (functionName) {
        case 'callTextGeneration':
          // Corresponds to Python's story_continue text generation
          if (!query.story_id || !query.answer) throw new Error("Missing params for callTextGeneration: story_id, answer");
          response = await callTextGeneration(query.story_id, query.answer);
          break;
  
        case 'callJoinTasks':
           // Corresponds to joined background tasks from story_continue or end
          if (!query.story_id || !query.type) throw new Error("Missing params for callJoinTasks: story_id, type ('continue' or 'end')");
          response = await callJoinTasks(query.story_id, query.type);
          break;
  
        case 'callNoJoinTasks':
           // Corresponds to non-joined background tasks (like voice in end)
          if (!query.story_id || !query.type) throw new Error("Missing params for callNoJoinTasks: story_id, type ('end' recommended)");
          response = await callNoJoinTasks(query.story_id, query.type); // Returns immediately
          break;
  
        case 'callEndGeneration':
           // Corresponds to Python's end story text generation
           if (!query.story_id) throw new Error("Missing params for callEndGeneration: story_id");
           response = await callEndGeneration(query.story_id);
           break;
  
        default:
          throw new Error(`Unknown function name: ${functionName}`);
      }
  
      result.value = response;
      console.log('ApiHandler finished processing, result:', response);
  
      // ***** IMPORTANT FOR SERVICE WORKER INTERACTION *****
      // If a Service Worker initiated this via fetch(), it needs the result.
      // Use postMessage to send the result back to the SW.
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
              type: 'API_RESULT',
              payload: response,
              // Optionally include an identifier if the SW needs to match request/response
               // requestId: query.requestId // Assuming the SW added a requestId query param
          });
           console.log('ApiHandler posted result back to Service Worker.');
      } else {
           console.warn('ApiHandler: No active service worker controller found to post result back to.');
      }
  
    } catch (err) {
      console.error('ApiHandler error:', err);
      error.value = err.message;
      result.value = { status: 'error', message: err.message }; // Ensure result reflects error
  
       // Also post error back to SW
       if (navigator.serviceWorker && navigator.serviceWorker.controller) {
           navigator.serviceWorker.controller.postMessage({
               type: 'API_RESULT',
               payload: result.value,
               // requestId: query.requestId
           });
           console.log('ApiHandler posted error result back to Service Worker.');
       }
    }
  });
  </script>
  
  <style scoped>
  pre {
    background-color: #eee;
    padding: 10px;
    border-radius: 5px;
    white-space: pre-wrap;
    word-wrap: break-word;
  }
  </style>