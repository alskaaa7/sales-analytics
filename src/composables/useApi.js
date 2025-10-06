// src/composables/useApi.js
import { ref } from 'vue'

export function useApi(endpoint) {
  const data = ref(null)
  const loading = ref(false)
  const error = ref(null)

  const fetchData = async (params = {}) => {
    loading.value = true
    error.value = null
    
    try {
      console.log('🔄 Запрос к реальному API...')
      
      // Убираем дублирование /api/ в endpoint
      let url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
      
      // Убираем дублирование /api/
      if (url.startsWith('/api/api/')) {
        url = url.replace('/api/api/', '/api/')
      }
      
      // Добавляем параметры
      const queryParams = new URLSearchParams(params).toString()
      const fullUrl = queryParams ? `${url}?${queryParams}` : url
      
      console.log('📡 API URL:', fullUrl)

      const response = await fetch(fullUrl)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const result = await response.json()
      data.value = result
      console.log('✅ Данные получены:', result)
      
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