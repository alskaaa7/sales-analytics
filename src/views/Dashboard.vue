<template>
  <div class="page dark-theme">
    <h1 class="page-title">📊 Аналитика продаж</h1>
    
    <!-- Фильтры -->
    <div class="filters-section">
      <div class="filter-group">
        <label>Дата с:</label>
        <input 
          type="date" 
          v-model="filters.dateFrom"
          @change="fetchData"
          class="animated-input"
        >
      </div>
      <div class="filter-group">
        <label>Дата по:</label>
        <input 
          type="date" 
          v-model="filters.dateTo"
          @change="fetchData"
          class="animated-input"
        >
      </div>
      <div class="filter-group">
        <label>API ключ:</label>
        <input 
          type="text" 
          v-model="filters.key"
          @input="fetchData"
          placeholder="Введите API ключ"
          class="animated-input"
        >
      </div>
      <div class="filter-group">
        <label>Лимит:</label>
        <select v-model="filters.limit" @change="fetchData" class="animated-input">
          <option value="50">50</option>
          <option value="100">100</option>
          <option value="200">200</option>
          <option value="500">500</option>
        </select>
      </div>
    </div>

    <!-- Информация о загрузке и ошибках -->
    <transition-group name="stagger-fade" tag="div" class="debug-info" v-if="error || (ordersData.length === 0 && !loading)">
      <div v-if="error" key="error" class="error-message slide-in">
        <span class="icon">⚠️</span>
        {{ error }}
      </div>
      <div v-if="!loading && ordersData.length === 0" key="no-data" class="no-data-message slide-in">
        <span class="icon">🔍</span>
        Данные не найдены. Проверьте параметры фильтрации.
      </div>
      <div v-if="loading" key="loading" class="loading-message slide-in">
        <span class="icon">⏳</span>
        Загрузка данных...
      </div>
    </transition-group>

    <!-- Основные метрики -->
    <transition-group name="stats-slide" tag="div" class="stats" v-if="ordersData.length > 0">
      <div class="stat-card" v-for="(stat, index) in computedStats" :key="stat.label" :data-index="index">
        <div class="stat-icon">{{ stat.icon }}</div>
        <div class="stat-value">{{ stat.value }}</div>
        <div class="stat-label">{{ stat.label }}</div>
        <div class="stat-progress"></div>
        <div class="stat-glow"></div>
      </div>
    </transition-group>

    <!-- Сводные графики -->
    <div class="dashboard-section" v-if="ordersData.length > 0">
      <h2 class="dashboard-title">
        <span class="icon">📈</span>
        Ключевые показатели
      </h2>
      
      <div class="charts-grid">
        <div 
          v-for="chart in summaryCharts" 
          :key="chart.id"
          class="chart-card"
          @click="navigateToChart(chart.id)"
        >
          <div class="chart-header">
            <h3>{{ chart.title }}</h3>
            <span class="chart-icon">{{ chart.icon }}</span>
          </div>
          <div class="chart-mini">
            <canvas :ref="el => setChartRef(chart.id, el)" class="chart-canvas-mini"></canvas>
          </div>
          <div class="chart-footer">
            <div class="chart-value">{{ chart.value }}</div>
            <div class="chart-trend" :class="chart.trendClass">
              <span class="trend-icon">{{ chart.trendIcon }}</span>
              <span class="trend-text">{{ chart.trendText }}</span>
            </div>
          </div>
          <div class="chart-overlay">
            <span>Подробнее →</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Кнопка возврата наверх -->
    <transition name="zoom">
      <button 
        v-if="showFab" 
        @click="scrollToTop" 
        class="fab"
      >
        <span class="fab-icon">↑</span>
        <div class="fab-glow"></div>
      </button>
    </transition>

    <!-- Фоновые элементы -->
    <div class="bg-elements">
      <div class="bg-circle circle-1"></div>
      <div class="bg-circle circle-2"></div>
      <div class="bg-circle circle-3"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

const router = useRouter()

// Конфигурация API
const API_BASE = '' // Будет использовать текущий хост
const API_ENDPOINT = '/api/orders'

// Данные и состояние
const ordersData = ref([])
const loading = ref(false)
const error = ref(null)
const showFab = ref(false)
const chartInstances = ref({})

const filters = ref({
  dateFrom: getDefaultDateFrom(),
  dateTo: getDefaultDateTo(),
  key: '',
  limit: 100,
  page: 1
})

// Получение дат по умолчанию
function getDefaultDateFrom() {
  const monthAgo = new Date()
  monthAgo.setDate(monthAgo.getDate() - 30)
  return monthAgo.toISOString().split('T')[0]
}

function getDefaultDateTo() {
  const today = new Date()
  return today.toISOString().split('T')[0]
}

// Основные метрики
const computedStats = computed(() => [
  {
    value: ordersData.value.length.toLocaleString(),
    label: 'Всего заказов',
    icon: '📦'
  },
  {
    value: Math.round(totalOrdersValue.value).toLocaleString() + ' ₽',
    label: 'Общая сумма',
    icon: '💰'
  },
  {
    value: activeOrders.value.toLocaleString(),
    label: 'Активных заказов',
    icon: '✅'
  },
  {
    value: canceledOrders.value.toLocaleString(),
    label: 'Отмененных заказов',
    icon: '❌'
  }
])

const totalOrdersValue = computed(() => {
  return ordersData.value.reduce((sum, item) => sum + (parseFloat(item.total_price) || 0), 0)
})

const activeOrders = computed(() => {
  return ordersData.value.filter(item => !item.is_cancel || item.is_cancel === false).length
})

const canceledOrders = computed(() => {
  return ordersData.value.filter(item => item.is_cancel === true || item.is_cancel === 'true').length
})

// Данные для мини-графиков
const summaryCharts = computed(() => [
  {
    id: 'sales-volume',
    title: 'Объем продаж',
    icon: '📊',
    value: ordersData.value.length.toLocaleString() + ' шт.',
    trendClass: 'trend-up',
    trendIcon: '↗️',
    trendText: getTrendText('sales'),
    data: getSalesVolumeData()
  },
  {
    id: 'revenue',
    title: 'Выручка',
    icon: '💰',
    value: Math.round(totalOrdersValue.value).toLocaleString() + ' ₽',
    trendClass: 'trend-up',
    trendIcon: '↗️',
    trendText: getTrendText('revenue'),
    data: getRevenueData()
  },
  {
    id: 'cancellations',
    title: 'Отмены',
    icon: '❌',
    value: canceledOrders.value.toLocaleString() + ' шт.',
    trendClass: canceledOrders.value > ordersData.value.length * 0.1 ? 'trend-down' : 'trend-up',
    trendIcon: canceledOrders.value > ordersData.value.length * 0.1 ? '↘️' : '↗️',
    trendText: getTrendText('cancellations'),
    data: getCancellationsData()
  },
  {
    id: 'discounts',
    title: 'Скидки',
    icon: '🎁',
    value: getAverageDiscount().toFixed(1) + '%',
    trendClass: 'trend-neutral',
    trendIcon: '➡️',
    trendText: getTrendText('discounts'),
    data: getDiscountsData()
  }
])

// Функции для расчета трендов (заглушки - в реальном приложении нужно сравнивать с предыдущим периодом)
function getTrendText(type) {
  const trends = {
    'sales': ['+12% за период', '+8% за период', '-5% за период'],
    'revenue': ['+15% за период', '+10% за период', '-3% за период'],
    'cancellations': ['+5% за период', '-2% за период', '-8% за период'],
    'discounts': ['+3% за период', '0% за период', '-2% за период']
  }
  return trends[type] ? trends[type][0] : 'Нет данных'
}

// Функции для получения данных графиков
function getSalesVolumeData() {
  const ordersByDate = ordersData.value.reduce((acc, item) => {
    if (item.date) {
      const date = formatDate(item.date)
      acc[date] = (acc[date] || 0) + 1
    }
    return acc
  }, {})

  const sortedDates = Object.keys(ordersByDate).sort()
  
  return {
    labels: sortedDates,
    datasets: [{
      label: 'Количество заказов',
      data: sortedDates.map(date => ordersByDate[date]),
      borderColor: '#10b981',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      borderWidth: 2,
      tension: 0.3,
      fill: true
    }]
  }
}

function getRevenueData() {
  const revenueByDate = ordersData.value.reduce((acc, item) => {
    if (item.date && item.total_price) {
      const date = formatDate(item.date)
      acc[date] = (acc[date] || 0) + (parseFloat(item.total_price) || 0)
    }
    return acc
  }, {})

  const sortedDates = Object.keys(revenueByDate).sort()
  
  return {
    labels: sortedDates,
    datasets: [{
      label: 'Выручка',
      data: sortedDates.map(date => revenueByDate[date]),
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderWidth: 2,
      tension: 0.3,
      fill: true
    }]
  }
}

function getCancellationsData() {
  const cancellationsByDate = ordersData.value.reduce((acc, item) => {
    if (item.date && (item.is_cancel === true || item.is_cancel === 'true')) {
      const date = formatDate(item.date)
      acc[date] = (acc[date] || 0) + 1
    }
    return acc
  }, {})

  const sortedDates = Object.keys(cancellationsByDate).sort()
  
  return {
    labels: sortedDates,
    datasets: [{
      label: 'Отмены',
      data: sortedDates.map(date => cancellationsByDate[date]),
      borderColor: '#ef4444',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderWidth: 2,
      tension: 0.3,
      fill: true
    }]
  }
}

function getDiscountsData() {
  const discountsByDate = ordersData.value.reduce((acc, item) => {
    if (item.date && item.discount_percent) {
      const date = formatDate(item.date)
      if (!acc[date]) acc[date] = { sum: 0, count: 0 }
      acc[date].sum += parseFloat(item.discount_percent) || 0
      acc[date].count += 1
    }
    return acc
  }, {})

  const sortedDates = Object.keys(discountsByDate).sort()
  
  return {
    labels: sortedDates,
    datasets: [{
      label: 'Средняя скидка',
      data: sortedDates.map(date => discountsByDate[date].count > 0 ? 
        (discountsByDate[date].sum / discountsByDate[date].count) : 0),
      borderColor: '#f59e0b',
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      borderWidth: 2,
      tension: 0.3,
      fill: true
    }]
  }
}

function getAverageDiscount() {
  const ordersWithDiscount = ordersData.value.filter(item => item.discount_percent)
  if (ordersWithDiscount.length === 0) return 0
  
  const totalDiscount = ordersWithDiscount.reduce((sum, item) => 
    sum + (parseFloat(item.discount_percent) || 0), 0)
  
  return totalDiscount / ordersWithDiscount.length
}

function formatDate(dateString) {
  // Приводим дату к формату YYYY-MM-DD
  const date = new Date(dateString)
  return date.toISOString().split('T')[0]
}

// Управление ссылками на графики
const setChartRef = (chartId, el) => {
  if (el) {
    chartInstances.value[chartId] = el
  }
}

// Инициализация мини-графиков
const initMiniCharts = async () => {
  if (ordersData.value.length === 0) return

  await nextTick()

  // Уничтожаем старые графики
  Object.values(chartInstances.value).forEach(canvas => {
    if (canvas && canvas._chart) {
      canvas._chart.destroy()
    }
  })

  // Создаем новые графики
  summaryCharts.value.forEach(chart => {
    const canvas = chartInstances.value[chart.id]
    if (!canvas || !chart.data.labels.length) return

    const ctx = canvas.getContext('2d')
    
    const chartInstance = new Chart(ctx, {
      type: 'line',
      data: chart.data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            enabled: false
          }
        },
        scales: {
          x: {
            display: false
          },
          y: {
            display: false
          }
        },
        elements: {
          point: {
            radius: 0
          }
        },
        interaction: {
          intersect: false
        }
      }
    })
    
    // Сохраняем ссылку на экземпляр chart
    canvas._chart = chartInstance
  })
}

// Навигация к детальному графику
const navigateToChart = (chartId) => {
  router.push(`/chart/${chartId}`)
}

// Загрузка данных
const fetchData = async () => {
  loading.value = true
  error.value = null

  try {
    const params = new URLSearchParams()
    params.append('dateFrom', filters.value.dateFrom)
    params.append('dateTo', filters.value.dateTo)
    params.append('page', filters.value.page.toString())
    params.append('limit', filters.value.limit.toString())
    
    if (filters.value.key) {
      params.append('key', filters.value.key)
    }

    const apiUrl = `${API_BASE}${API_ENDPOINT}?${params}`
    console.log('Fetching from:', apiUrl) // Для отладки

    const response = await fetch(apiUrl)
    
    if (!response.ok) {
      throw new Error(`Ошибка загрузки: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log('Received data:', data) // Для отладки
    
    // Обработка различных форматов ответа
    if (Array.isArray(data)) {
      ordersData.value = data
    } else if (data && data.data) {
      ordersData.value = data.data
    } else if (data && data.orders) {
      ordersData.value = data.orders
    } else if (data && data.results) {
      ordersData.value = data.results
    } else if (typeof data === 'object') {
      // Пробуем преобразовать объект в массив
      ordersData.value = Object.values(data)
    } else {
      ordersData.value = []
    }
    
    console.log('Processed orders:', ordersData.value.length) // Для отладки
    
  } catch (err) {
    error.value = err.message
    console.error('Ошибка загрузки данных:', err)
  } finally {
    loading.value = false
  }
}

// Прокрутка к верху
const scrollToTop = () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}

// Обработчик прокрутки
const scrollHandler = () => {
  showFab.value = window.scrollY > 500
}

// Хуки жизненного цикла
onMounted(() => {
  fetchData()
  window.addEventListener('scroll', scrollHandler)
})

onUnmounted(() => {
  // Уничтожаем все графики при размонтировании
  Object.values(chartInstances.value).forEach(canvas => {
    if (canvas && canvas._chart) {
      canvas._chart.destroy()
    }
  })
  window.removeEventListener('scroll', scrollHandler)
})

// Отслеживание изменений данных для перерисовки графиков
watch(ordersData, () => {
  if (ordersData.value.length > 0) {
    nextTick(() => {
      setTimeout(() => {
        initMiniCharts()
      }, 100)
    })
  }
}, { deep: true })

// Отслеживание изменений фильтров (с дебаунсом)
let fetchTimeout = null
watch(filters, () => {
  if (fetchTimeout) clearTimeout(fetchTimeout)
  fetchTimeout = setTimeout(() => {
    fetchData()
  }, 500)
}, { deep: true })
</script>

<style scoped>
/* Стили остаются такими же как в предыдущем коде */
/* Добавим только стиль для сообщения о загрузке */

.loading-message {
  padding: 1.5rem;
  border-radius: 12px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  backdrop-filter: blur(10px);
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(124, 58, 237, 0.2) 100%);
  border: 1px solid rgba(139, 92, 246, 0.3);
  color: #ddd6fe;
}

/* Остальные стили такие же как в предыдущем ответе */
</style>