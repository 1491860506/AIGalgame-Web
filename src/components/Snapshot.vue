<template>
<div></div>
</template>



<style scoped>
.music-generator-test {
  padding: 20px;
  font-family: sans-serif;
}

.config-section, .generator-section, .status-section, .file-list-section {
  margin-bottom: 20px;
  padding: 15px;
  border: 1px solid #eee;
  border-radius: 5px;
}

label {
  display: inline-block;
  width: 150px;
  margin-bottom: 5px;
}

input[type="text"], input[type="number"] {
  width: 300px;
  padding: 5px;
  margin-bottom: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

button {
  padding: 8px 15px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 10px;
}

button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.status-section p {
  font-weight: bold;
}

.error-message {
    color: red;
    font-weight: bold;
    margin-top: 10px;
}

.file-list-section ul {
    list-style: none;
    padding: 0;
    margin-top: 10px;
    max-height: 200px;
    overflow-y: auto;
    border: 1px solid #eee;
    border-radius: 4px;
    padding: 10px;
    background-color: #f9f9f9;
}

.file-list-section li {
    padding: 5px 0;
    border-bottom: 1px dashed #ddd;
}

.file-list-section li:last-child {
    border-bottom: none;
}
</style>