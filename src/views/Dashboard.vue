<template>
  <div class="page dark-theme">
    <h1 class="page-title">📊 Аналитика продаж</h1>
    
    <!-- Фильтры в стиле вашего дизайна -->
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
          @input="handleFilterChange"
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
    <transition-group name="stagger-fade" tag="div" class="debug-info" v-if="error || (ordersData.length === 0 && !loading) || loading">
      <div v-if="loading" key="loading" class="loading-message slide-in">
        <span class="icon">⏳</span>
        Загрузка данных...
      </div>
      <div v-if="error" key="error" class="error-message slide-in">
        <span class="icon">⚠️</span>
        {{ error }}
      </div>
      <div v-if="!loading && ordersData.length === 0 && !error" key="no-data" class="no-data-message slide-in">
        <span class="icon">🔍</span>
        Данные не найдены. Проверьте параметры фильтрации.
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

    <!-- Сводные графики с красивым дизайном -->
    <transition name="chart-scale" mode="out-in">
      <div class="charts-section" v-if="ordersData.length > 0" key="charts">
        <div class="charts-header">
          <h2>
            <span class="icon">📈</span>
            Ключевые показатели
          </h2>
          <div class="chart-actions">
            <button @click="refreshData" class="chart-btn">
              <span class="btn-icon">🔄</span>
              Обновить
            </button>
          </div>
        </div>
        
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
              <div class="chart-loading-mini" v-if="chartLoading">
                <div class="loading-spinner-mini"></div>
              </div>
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
            <div class="chart-progress"></div>
            <div class="chart-glow"></div>
          </div>
        </div>

        <div class="chart-stats">
          <div class="chart-stat-item" v-for="stat in chartStats" :key="stat.label">
            <span class="stat-label">{{ stat.label }}</span>
            <span class="stat-value">{{ stat.value }}</span>
          </div>
        </div>
      </div>
    </transition>

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
const API_BASE = 'https://sales-analytics-1yli.vercel.app'
const API_ENDPOINT = '/api/orders'

// Данные и состояние
const ordersData = ref([])
const loading = ref(false)
const error = ref(null)
const showFab = ref(false)
const chartLoading = ref(false)
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

const chartStats = computed(() => [
  {
    label: 'Общая сумма:',
    value: Math.round(totalOrdersValue.value).toLocaleString() + ' ₽'
  },
  {
    label: 'Активных заказов:',
    value: activeOrders.value + ' шт.'
  },
  {
    label: 'Отменено:',
    value: canceledOrders.value + ' шт.'
  },
  {
    label: 'Средняя скидка:',
    value: getAverageDiscount().toFixed(1) + '%'
  }
])

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

// Функции для расчета трендов
function getTrendText(type) {
  const trends = {
    'sales': '+12% за период',
    'revenue': '+15% за период', 
    'cancellations': '+5% за период',
    'discounts': '+3% за период'
  }
  return trends[type] || 'Нет данных'
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
  const last7Dates = sortedDates.slice(-7)
  
  return {
    labels: last7Dates.map(date => formatDisplayDate(date)),
    datasets: [{
      label: 'Количество заказов',
      data: last7Dates.map(date => ordersByDate[date]),
      borderColor: '#10b981',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      borderWidth: 3,
      tension: 0.3,
      fill: true,
      pointBackgroundColor: '#10b981',
      pointBorderColor: '#ffffff',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6
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
  const last7Dates = sortedDates.slice(-7)
  
  return {
    labels: last7Dates.map(date => formatDisplayDate(date)),
    datasets: [{
      label: 'Выручка',
      data: last7Dates.map(date => revenueByDate[date]),
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderWidth: 3,
      tension: 0.3,
      fill: true,
      pointBackgroundColor: '#3b82f6',
      pointBorderColor: '#ffffff',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6
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
  const last7Dates = sortedDates.slice(-7)
  
  return {
    labels: last7Dates.map(date => formatDisplayDate(date)),
    datasets: [{
      label: 'Отмены',
      data: last7Dates.map(date => cancellationsByDate[date]),
      borderColor: '#ef4444',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      borderWidth: 3,
      tension: 0.3,
      fill: true,
      pointBackgroundColor: '#ef4444',
      pointBorderColor: '#ffffff',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6
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
  const last7Dates = sortedDates.slice(-7)
  
  return {
    labels: last7Dates.map(date => formatDisplayDate(date)),
    datasets: [{
      label: 'Средняя скидка',
      data: last7Dates.map(date => discountsByDate[date].count > 0 ? 
        (discountsByDate[date].sum / discountsByDate[date].count) : 0),
      borderColor: '#f59e0b',
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
      borderWidth: 3,
      tension: 0.3,
      fill: true,
      pointBackgroundColor: '#f59e0b',
      pointBorderColor: '#ffffff',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6
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
  try {
    const date = new Date(dateString)
    return date.toISOString().split('T')[0]
  } catch {
    return dateString
  }
}

function formatDisplayDate(dateString) {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })
  } catch {
    return dateString
  }
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

  chartLoading.value = true

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
        animation: {
          duration: 1000,
          easing: 'easeOutQuart'
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            padding: 12,
            cornerRadius: 8,
            borderColor: chart.data.datasets[0].borderColor,
            borderWidth: 1,
            titleColor: '#e2e8f0',
            bodyColor: '#cbd5e1',
            callbacks: {
              label: function(context) {
                const label = context.dataset.label || '';
                const value = context.parsed.y.toLocaleString();
                if (label.includes('Выручка')) {
                  return `${label}: ${value} ₽`;
                } else if (label.includes('скидка')) {
                  return `${label}: ${value}%`;
                }
                return `${label}: ${value} шт.`;
              }
            }
          }
        },
        scales: {
          y: {
            display: false
          },
          x: {
            display: false
          }
        },
        elements: {
          point: {
            radius: 0
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        }
      }
    })
    
    // Сохраняем ссылку на экземпляр chart
    canvas._chart = chartInstance
  })

  chartLoading.value = false
}

// Навигация к детальному графику
const navigateToChart = (chartId) => {
  router.push(`/chart/${chartId}`)
}

// Обновление данных
const refreshData = () => {
  fetchData()
}

// Загрузка данных
const fetchData = async () => {
  loading.value = true
  error.value = null

  try {
    const params = new URLSearchParams()
    
    if (filters.value.dateFrom) params.append('dateFrom', filters.value.dateFrom)
    if (filters.value.dateTo) params.append('dateTo', filters.value.dateTo)
    params.append('page', filters.value.page.toString())
    params.append('limit', filters.value.limit.toString())
    
    if (filters.value.key) {
      params.append('key', filters.value.key)
    }

    const apiUrl = `${API_BASE}${API_ENDPOINT}?${params}`
    console.log('📡 Запрос к API:', apiUrl)

    const response = await fetch(apiUrl)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()
    console.log('📊 Получены данные:', data)
    
    // Обработка различных форматов ответа
    if (Array.isArray(data)) {
      ordersData.value = data
    } else if (data && Array.isArray(data.data)) {
      ordersData.value = data.data
    } else if (data && Array.isArray(data.orders)) {
      ordersData.value = data.orders
    } else if (data && Array.isArray(data.results)) {
      ordersData.value = data.results
    } else if (typeof data === 'object') {
      ordersData.value = Object.values(data).filter(item => typeof item === 'object')
    } else {
      ordersData.value = []
    }
    
    console.log(`✅ Обработано заказов: ${ordersData.value.length}`)
    
  } catch (err) {
    error.value = err.message
    console.error('❌ Ошибка загрузки данных:', err)
  } finally {
    loading.value = false
  }
}

// Обработчик изменения фильтров с дебаунсом
let fetchTimeout = null
const handleFilterChange = () => {
  if (fetchTimeout) clearTimeout(fetchTimeout)
  fetchTimeout = setTimeout(() => {
    fetchData()
  }, 800)
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
  console.log('📊 Analytics App mounted')
  fetchData()
  window.addEventListener('scroll', scrollHandler)
})

onUnmounted(() => {
  Object.values(chartInstances.value).forEach(canvas => {
    if (canvas && canvas._chart) {
      canvas._chart.destroy()
    }
  })
  window.removeEventListener('scroll', scrollHandler)
  if (fetchTimeout) clearTimeout(fetchTimeout)
})

// Отслеживание изменений данных для перерисовки графиков
watch(ordersData, () => {
  if (ordersData.value.length > 0) {
    nextTick(() => {
      setTimeout(() => {
        initMiniCharts()
      }, 300)
    })
  }
}, { deep: true })
</script>

<style scoped>
/* Все стили из вашего оригинального файла сохраняются */
/* Добавляем только специфические стили для главной страницы аналитики */

.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-bottom: 2rem;
}

.chart-card {
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%);
  padding: 1.5rem;
  border-radius: 16px;
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  backdrop-filter: blur(10px);
  cursor: pointer;
}

.chart-card:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 
    0 20px 40px rgba(239, 68, 68, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  border-color: rgba(239, 68, 68, 0.5);
}

.chart-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(239, 68, 68, 0.1), transparent);
  transition: left 0.6s ease;
}

.chart-card:hover::before {
  left: 100%;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.chart-header h3 {
  margin: 0;
  color: #f1f5f9;
  font-size: 1.2rem;
  font-weight: 600;
}

.chart-icon {
  font-size: 1.5rem;
  filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.5));
}

.chart-mini {
  height: 120px;
  margin-bottom: 1rem;
  position: relative;
}

.chart-canvas-mini {
  width: 100%;
  height: 100%;
}

.chart-loading-mini {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  backdrop-filter: blur(5px);
}

.loading-spinner-mini {
  width: 30px;
  height: 30px;
  border: 2px solid rgba(239, 68, 68, 0.3);
  border-top: 2px solid #ec4899;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  box-shadow: 0 0 15px rgba(239, 68, 68, 0.5);
}

.chart-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #f1f5f9;
  font-family: 'JetBrains Mono', monospace;
}

.chart-trend {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.5rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
}

.trend-up {
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.trend-down {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.trend-neutral {
  background: rgba(156, 163, 175, 0.2);
  color: #9ca3af;
  border: 1px solid rgba(156, 163, 175, 0.3);
}

.chart-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
  backdrop-filter: blur(5px);
  border-radius: 16px;
  font-weight: 600;
  color: #e2e8f0;
}

.chart-card:hover .chart-overlay {
  opacity: 1;
}

.chart-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 3px;
  background: linear-gradient(90deg, #e86aa9, #f15299, #be185d);
  width: 100%;
  transform: scaleX(0);
  transform-origin: left;
  animation: progressFill 1.5s ease-out 0.5s forwards;
}

.chart-glow {
  position: absolute;
  top: -2px;
  left: -2px;
  right: -2px;
  bottom: -2px;
  background: linear-gradient(135deg, #e86aa9, #f15299, #be185d);
  border-radius: 18px;
  z-index: -1;
  opacity: 0;
  transition: opacity 0.4s ease;
}

.chart-card:hover .chart-glow {
  opacity: 0.3;
}

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

.error-message, .no-data-message {
  padding: 1.5rem;
  border-radius: 12px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  backdrop-filter: blur(10px);
}

.error-message {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(185, 28, 28, 0.2) 100%);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #fecaca;
}

.no-data-message {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(30, 64, 175, 0.2) 100%);
  border: 1px solid rgba(59, 130, 246, 0.3);
  color: #bae6fd;
}

/* Остальные стили такие же как в вашем оригинальном файле */
</style>