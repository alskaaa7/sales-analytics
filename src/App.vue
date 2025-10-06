<template>
    <div id="app">
      <router-view />
    </div>
  </template>
  
  <script setup>
  import { onMounted } from 'vue'
  
  onMounted(() => {
    console.log('📊 Analytics App mounted')
  })
  </script>
  
  <style>
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  body {
    font-family: 'Inter', sans-serif;
    background: linear-gradient(135deg, #0f0f23 0%, #1a1b2e 50%, #0f0f23 100%);
    color: #e2e8f0;
    min-height: 100vh;
  }
  
  #app {
    min-height: 100vh;
  }
  
  ::-webkit-scrollbar {
    width: 8px;
  }
  
  ::-webkit-scrollbar-track {
    background: rgba(15, 23, 42, 0.8);
  }
  
  ::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, #ec4899, #db2777);
    border-radius: 4px;
  }
  
  ::-webkit-scrollbar-thumb:hover {
    background: linear-gradient(135deg, #db2777, #be185d);
  }
  </style>