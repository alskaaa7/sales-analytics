<template>
    <div class="filters-container">
      <div class="filters-card">
        <div class="filters-header">
          <h3>🔍 Фильтры</h3>
        </div>
        
        <div class="filters-content">
          <div class="filter-row">
            <div class="filter-group">
              <label>Дата с:</label>
              <input
                type="date"
                v-model="localFilters.dateFrom"
                @change="emitFilters"
                class="animated-input"
              >
            </div>
            
            <div class="filter-group">
              <label>Дата по:</label>
              <input
                type="date"
                v-model="localFilters.dateTo"
                @change="emitFilters"
                class="animated-input"
              >
            </div>
            
            <div class="filter-group">
              <label>Записей на странице:</label>
              <select
                v-model="localFilters.limit"
                @change="emitFilters"
                class="animated-input"
              >
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="200">200</option>
                <option value="500">500</option>
              </select>
            </div>
          </div>
          
          <div class="additional-filters">
            <slot name="additional-filters"></slot>
          </div>
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref } from 'vue'
  
  const emit = defineEmits(['filters-change'])
  
  const localFilters = ref({
    dateFrom: '',
    dateTo: '',
    limit: 100,
    page: 1
  })
  
  const emitFilters = () => {
    emit('filters-change', { ...localFilters.value })
  }
  
  // Инициализация дат по умолчанию
  const initializeDates = () => {
    const monthAgo = new Date()
    monthAgo.setDate(monthAgo.getDate() - 30)
    localFilters.value.dateFrom = monthAgo.toISOString().split('T')[0]
    
    const today = new Date()
    localFilters.value.dateTo = today.toISOString().split('T')[0]
  }
  
  initializeDates()
  // Не эмитим сразу, чтобы главный компонент сам управлял первым запросом
  </script>
  
  <style scoped>
  .filters-container {
    margin-bottom: 2rem;
  }
  
  .filters-card {
    background: linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%);
    padding: 1.5rem;
    border-radius: 16px;
    box-shadow: 
      0 8px 32px rgba(0, 0, 0, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
    backdrop-filter: blur(10px);
  }
  
  .filters-header {
    margin-bottom: 1.5rem;
  }
  
  .filters-header h3 {
    margin: 0;
    color: #f1f5f9;
    font-size: 1.2rem;
    font-weight: 600;
  }
  
  .filter-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1rem;
  }
  
  .additional-filters {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
  }
  
  .filter-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .filter-group label {
    font-weight: 600;
    color: #e2e8f0;
    font-size: 0.9rem;
  }
  
  .animated-input {
    padding: 0.75rem 1rem;
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 12px;
    font-size: 0.9rem;
    transition: all 0.3s ease;
    background: rgba(15, 23, 42, 0.8);
    color: #e2e8f0;
    font-family: 'Inter', sans-serif;
    backdrop-filter: blur(10px);
  }
  
  .animated-input:focus {
    outline: none;
    border-color: #ec4899;
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);
    transform: scale(1.02);
  }
  
  select.animated-input {
    cursor: pointer;
  }
  
  @media (max-width: 768px) {
    .filter-row {
      grid-template-columns: 1fr;
    }
    
    .additional-filters {
      grid-template-columns: 1fr;
    }
  }
  </style>