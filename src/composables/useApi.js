// src/composables/useApi.js
import { ref } from 'vue'

// Базовый URL - ваш Vercel домен
const API_BASE_URL = 'https://sales-analytics-1yli.vercel.app'

export function useApi(endpoint) {
  const data = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const fetchData = async (params = {}) => {
    loading.value = true
    error.value = null
    
    try {
      console.log('🔄 Запрос к API...')
      
      const queryParams = new URLSearchParams({
        dateFrom: '',
        dateTo: '',
        page: 1,
        key: '',
        limit: 100,
        ...params
      }).toString()
      
      const fullUrl = `${API_BASE_URL}/api/${endpoint}?${queryParams}`
      
      console.log('📡 API URL:', fullUrl)

      const response = await fetch(fullUrl)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      data.value = result.data // Извлекаем данные из поля data
      console.log('✅ Данные получены:', result.data.length, 'заказов')
      
    } catch (err) {
      error.value = err.message
      console.error('❌ Ошибка:', err)
    } finally {
      loading.value = false
    }
  }

  return {
    data,
    loading,
    error,
    fetchData
  }
}