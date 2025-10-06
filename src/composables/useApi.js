import { ref } from 'vue'

export function useApi(endpoint) {
  const data = ref(null)
  const loading = ref(false)
  const error = ref(null)
  const pagination = ref(null)

  const fetchData = async (filters = {}) => {
    loading.value = true
    error.value = null
    data.value = null
    
    try {
      console.log('🔄 Запрос к реальному API...')
      
      // Параметры как в вашем эндпоинте
      const baseParams = {
        dateFrom: '',
        dateTo: '',
        page: 1,
        key: '',
        limit: 100,
        ...filters
      }

      // Строим URL
      const queryParams = new URLSearchParams()
      Object.keys(baseParams).forEach(key => {
        if (baseParams[key] !== undefined && baseParams[key] !== null && baseParams[key] !== '') {
          queryParams.append(key, baseParams[key])
        }
      })

      const apiUrl = `/api/${endpoint}?${queryParams}`
      console.log('📡 API URL:', apiUrl)

      const response = await fetch(apiUrl)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      console.log('✅ Ответ от API:', result)

      // Сохраняем данные как есть
      data.value = result
      
      pagination.value = {
        current_page: baseParams.page || 1,
        last_page: 1,
        total: Array.isArray(result) ? result.length : 0,
        per_page: baseParams.limit || 100
      }
      
    } catch (err) {
      error.value = `Ошибка API: ${err.message}`
      console.error('❌ Ошибка:', err)
      // НИКАКИХ ДЕМО-ДАННЫХ - только ошибка
    } finally {
      loading.value = false
    }
  }

  return { data, loading, error, pagination, fetchData }
}