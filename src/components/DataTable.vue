<template>
    <div class="data-table-container">
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th v-for="column in columns" :key="column.key">
                {{ column.title }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td :colspan="columns.length" class="loading-cell">
                <div class="loading-spinner"></div>
                Загрузка данных...
              </td>
            </tr>
            <tr v-else-if="error">
              <td :colspan="columns.length" class="error-cell">
                {{ error }}
              </td>
            </tr>
            <tr v-else-if="data.length === 0">
              <td :colspan="columns.length" class="no-data-cell">
                Нет данных для отображения
              </td>
            </tr>
            <tr v-else v-for="(row, index) in data" :key="index">
              <td v-for="column in columns" :key="column.key">
                <span v-if="column.type === 'currency'">
                  {{ formatCurrency(row[column.key]) }}
                </span>
                <span v-else-if="column.type === 'datetime'">
                  {{ formatDateTime(row[column.key]) }}
                </span>
                <span v-else-if="column.type === 'boolean'">
                  {{ row[column.key] ? 'Да' : 'Нет' }}
                </span>
                <span v-else>
                  {{ row[column.key] }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </template>
  
  <script setup>
  import { defineProps } from 'vue'
  
  const props = defineProps({
    data: {
      type: Array,
      default: () => []
    },
    columns: {
      type: Array,
      default: () => []
    },
    loading: {
      type: Boolean,
      default: false
    },
    error: {
      type: String,
      default: null
    }
  })
  
  const formatCurrency = (value) => {
    const num = Number(value)
    return isNaN(num) ? value : num.toLocaleString('ru-RU') + ' ₽'
  }
  
  const formatDateTime = (value) => {
    if (!value) return ''
    const date = new Date(value)
    return date.toLocaleDateString('ru-RU')
  }
  </script>
  
  <style scoped>
  .data-table-container {
    margin: 2rem 0;
  }
  
  .table-wrapper {
    overflow-x: auto;
    border-radius: 12px;
    background: linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%);
    border: 1px solid rgba(239, 68, 68, 0.2);
    backdrop-filter: blur(10px);
  }
  
  .data-table {
    width: 100%;
    border-collapse: collapse;
    color: #e2e8f0;
  }
  
  .data-table th {
    background: rgba(15, 23, 42, 0.9);
    padding: 1rem;
    text-align: left;
    font-weight: 600;
    color: #f1f5f9;
    border-bottom: 1px solid rgba(239, 68, 68, 0.3);
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .data-table td {
    padding: 1rem;
    border-bottom: 1px solid rgba(100, 116, 139, 0.2);
    font-size: 0.9rem;
  }
  
  .data-table tr:hover td {
    background: rgba(239, 68, 68, 0.1);
  }
  
  .loading-cell,
  .error-cell,
  .no-data-cell {
    text-align: center;
    padding: 3rem !important;
    color: #94a3b8;
  }
  
  .loading-cell {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }
  
  .loading-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid rgba(239, 68, 68, 0.3);
    border-top: 2px solid #ec4899;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  .error-cell {
    color: #fecaca;
    background: rgba(239, 68, 68, 0.1);
  }
  
  @media (max-width: 768px) {
    .data-table th,
    .data-table td {
      padding: 0.75rem 0.5rem;
      font-size: 0.8rem;
    }
  }
  </style>