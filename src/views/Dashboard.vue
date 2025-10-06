<template>
    <div class="page dark-theme">
      <h1 class="page-title">📊 Аналитика продаж</h1>
  
      <transition-group name="stagger-fade" tag="div" class="debug-info" v-if="error || (ordersData.length === 0 && !loading)">
        <div v-if="error" key="error" class="error-message slide-in">
          <span class="icon">⚠️</span>
          {{ error }}
        </div>
        <div v-if="!loading && ordersData.length === 0" key="no-data" class="no-data-message slide-in">
          <span class="icon">🔍</span>
          Загрузка данных...
        </div>
      </transition-group>
  
      <!-- 4 графика с кликами -->
      <div class="charts-grid" v-if="ordersData.length > 0">
        <div 
          class="chart-card" 
          v-for="chart in chartsConfig" 
          :key="chart.id"
          @click="navigateToMetric(chart.id)"
        >
          <div class="chart-header">
            <div class="chart-title">
              <span class="chart-icon">{{ chart.icon }}</span>
              <h3>{{ chart.title }}</h3>
            </div>
            <div class="chart-value">{{ getChartTotal(chart.id) }}</div>
          </div>
          
          <div class="chart-container">
            <canvas :ref="el => chartRefs[chart.id] = el" class="chart-canvas"></canvas>
          </div>
  
          <div class="chart-footer">
            <div class="chart-trend" :class="getTrendClass(chart.id)">
              <span class="trend-icon">{{ getTrendIcon(chart.id) }}</span>
              <span class="trend-value">{{ getTrendValue(chart.id) }}</span>
            </div>
            <div class="chart-click-hint">📈 Кликните для детальной аналитики</div>
          </div>
        </div>
      </div>
  
      <!-- Кнопка вверх -->
      <transition name="zoom">
        <button 
          v-if="ordersData.length > 10" 
          @click="scrollToTop" 
          class="fab"
          :class="{ 'fab-visible': showFab }"
        >
          <span class="fab-icon">↑</span>
          <div class="fab-glow"></div>
        </button>
      </transition>
  
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
  import { useApi } from '../composables/useApi.js'
  import { Chart, registerables } from 'chart.js'
  
  Chart.register(...registerables)
  
  const router = useRouter()
  const { 
    data: apiData, 
    loading, 
    error, 
    fetchData 
  } = useApi('/api/orders?limit=100&page=1')
  
  const chartRefs = ref({})
  const showFab = ref(false)
  let chartInstances = {}
  let scrollHandler = null
  
  // Конфигурация графиков
  const chartsConfig = ref([
    {
      id: 'sales',
      title: 'Количество продаж',
      icon: '📦',
      type: 'line',
      color: '#ec4899',
      trend: 'up',
      trendValue: '+12%'
    },
    {
      id: 'revenue',
      title: 'Общая выручка',
      icon: '💰',
      type: 'bar',
      color: '#10b981',
      trend: 'up',
      trendValue: '+8%'
    },
    {
      id: 'cancellations',
      title: 'Количество отмен',
      icon: '❌',
      type: 'line',
      color: '#ef4444',
      trend: 'down',
      trendValue: '-5%'
    },
    {
      id: 'discounts',
      title: 'Сумма скидок',
      icon: '🎁',
      type: 'bar',
      color: '#f59e0b',
      trend: 'up',
      trendValue: '+15%'
    }
  ])
  
  // Получение данных
  const ordersData = computed(() => {
    if (!apiData.value) return []
    
    console.log('📦 Данные от API:', apiData.value)
    
    // Если API возвращает массив - используем как есть
    if (Array.isArray(apiData.value)) {
      return apiData.value
    }
    
    // Если API возвращает объект с данными
    if (apiData.value && typeof apiData.value === 'object') {
      // Пробуем найти массив в разных возможных ключах
      if (Array.isArray(apiData.value.data)) return apiData.value.data
      if (Array.isArray(apiData.value.orders)) return apiData.value.orders
      if (Array.isArray(apiData.value.results)) return apiData.value.results
      if (Array.isArray(apiData.value.items)) return apiData.value.items
      
      // Если это объект с вложенными данными
      return Object.values(apiData.value).filter(item => typeof item === 'object')
    }
    
    return []
  })
  
  // Данные для графиков
  const chartData = computed(() => {
    if (ordersData.value.length === 0) {
      return chartsConfig.value.reduce((acc, chart) => {
        acc[chart.id] = { labels: [], datasets: [] }
        return acc
      }, {})
    }
  
    // Группировка по датам
    const dataByDate = ordersData.value.reduce((acc, item) => {
      if (item.date) {
        const date = item.date.split('T')[0]
        if (!acc[date]) {
          acc[date] = {
            sales: 0,
            revenue: 0,
            cancellations: 0,
            discounts: 0
          }
        }
        
        acc[date].sales += 1
        acc[date].revenue += Number(item.total_price) || 0
        
        if (item.is_cancel) {
          acc[date].cancellations += 1
        }
        
        const totalPrice = Number(item.total_price) || 0
        const priceWithDisc = Number(item.price_with_disc) || 0
        acc[date].discounts += Math.max(0, totalPrice - priceWithDisc)
      }
      return acc
    }, {})
  
    const sortedDates = Object.keys(dataByDate).sort()
  
    return {
      sales: {
        labels: sortedDates,
        datasets: [{
          label: 'Количество продаж',
          data: sortedDates.map(date => dataByDate[date].sales),
          borderColor: '#ec4899',
          backgroundColor: 'rgba(236, 72, 153, 0.1)',
          borderWidth: 3,
          tension: 0.1,
          fill: true
        }]
      },
      revenue: {
        labels: sortedDates,
        datasets: [{
          label: 'Общая выручка',
          data: sortedDates.map(date => dataByDate[date].revenue),
          backgroundColor: 'rgba(16, 185, 129, 0.6)',
          borderColor: '#10b981',
          borderWidth: 2
        }]
      },
      cancellations: {
        labels: sortedDates,
        datasets: [{
          label: 'Отмененные заказы',
          data: sortedDates.map(date => dataByDate[date].cancellations),
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderWidth: 3,
          tension: 0.1,
          fill: true
        }]
      },
      discounts: {
        labels: sortedDates,
        datasets: [{
          label: 'Сумма скидок',
          data: sortedDates.map(date => dataByDate[date].discounts),
          backgroundColor: 'rgba(245, 158, 11, 0.6)',
          borderColor: '#f59e0b',
          borderWidth: 2
        }]
      }
    }
  })
  
  const getChartTotal = (chartId) => {
    const data = chartData.value[chartId]?.datasets?.[0]?.data
    if (!data || data.length === 0) return '0'
    
    const total = data.reduce((sum, val) => sum + val, 0)
    
    switch (chartId) {
      case 'sales':
      case 'cancellations':
        return total.toLocaleString() + ' шт.'
      case 'revenue':
      case 'discounts':
        return Math.round(total).toLocaleString() + ' ₽'
      default:
        return total.toLocaleString()
    }
  }
  
  const getTrendClass = (chartId) => {
    const chart = chartsConfig.value.find(c => c.id === chartId)
    return chart?.trend || 'up'
  }
  
  const getTrendIcon = (chartId) => {
    const chart = chartsConfig.value.find(c => c.id === chartId)
    return chart?.trend === 'down' ? '↘️' : '↗️'
  }
  
  const getTrendValue = (chartId) => {
    const chart = chartsConfig.value.find(c => c.id === chartId)
    return chart?.trendValue || '+0%'
  }
  
  // Инициализация графиков
  const initCharts = async () => {
    for (const chart of chartsConfig.value) {
      await initChart(chart.id)
    }
  }
  
  const initChart = async (chartId) => {
    const canvas = chartRefs.value[chartId]
    if (!canvas || !chartData.value[chartId]?.labels?.length) return
  
    if (chartInstances[chartId]) {
      chartInstances[chartId].destroy()
    }
  
    const chartConfig = chartsConfig.value.find(c => c.id === chartId)
    
    chartInstances[chartId] = new Chart(canvas, {
      type: chartConfig.type,
      data: chartData.value[chartId],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            borderColor: chartConfig.color,
            callbacks: {
              label: (context) => {
                const value = context.parsed.y
                let suffix = ' шт.'
                if (chartId === 'revenue' || chartId === 'discounts') {
                  suffix = ' ₽'
                }
                return `${value.toLocaleString()}${suffix}`
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(100, 116, 139, 0.2)' },
            ticks: { 
              color: '#94a3b8',
              callback: (value) => {
                let suffix = ' шт.'
                if (chartId === 'revenue' || chartId === 'discounts') {
                  suffix = ' ₽'
                }
                return value.toLocaleString() + suffix
              }
            }
          },
          x: {
            grid: { display: false },
            ticks: { color: '#94a3b8' }
          }
        }
      }
    })
  }
  
  // Навигация
  const navigateToMetric = (metric) => {
    router.push({
      name: 'MetricDetail',
      params: { metric }
    })
  }
  
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }
  
  // Загрузка данных
  onMounted(() => {
    fetchData()
  
    scrollHandler = () => {
      showFab.value = window.scrollY > 500
    }
    window.addEventListener('scroll', scrollHandler)
  })
  
  watch([ordersData, chartRefs], () => {
    if (ordersData.value.length > 0) {
      nextTick(() => {
        setTimeout(initCharts, 100)
      })
    }
  }, { immediate: true, deep: true })
  
  onUnmounted(() => {
    Object.values(chartInstances).forEach(instance => {
      if (instance) {
        instance.destroy()
      }
    })
    if (scrollHandler) {
      window.removeEventListener('scroll', scrollHandler)
    }
  })
  </script>
  
  <style scoped>
  /* Стили остаются без изменений */
  .page {
    padding: 1rem;
    max-width: 1400px;
    margin: 0 auto;
    min-height: 100vh;
    position: relative;
    font-family: 'Inter', sans-serif;
  }
  
  .dark-theme {
    background: linear-gradient(135deg, #0f0f23 0%, #1a1b2e 50%, #0f0f23 100%);
    color: #e2e8f0;
  }
  
  .page-title {
    margin-bottom: 2rem;
    color: #f1f5f9;
    font-size: 2.5rem;
    font-weight: 700; 
    text-align: center;
    background: linear-gradient(135deg, #ed80b6 0%, #f76dab 50%, #e72e7b 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: titleGlow 3s ease-in-out infinite alternate;
    font-family: 'Inter', sans-serif;
  }
  
  @keyframes titleGlow {
    from {
      text-shadow: 0 0 20px rgba(242, 127, 190, 0.738);
    }
    to {
      text-shadow: 0 0 30px rgba(245, 97, 171, 0.8), 0 0 40px rgba(167, 22, 82, 0.6);
    }
  }
  
  .charts-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
    gap: 2rem;
    margin: 2rem 0;
  }
  
  .chart-card {
    background: linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%);
    padding: 1.5rem;
    border-radius: 20px;
    border: 1px solid rgba(239, 68, 68, 0.2);
    backdrop-filter: blur(10px);
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }
  
  .chart-card:hover {
    transform: translateY(-5px);
    border-color: rgba(239, 68, 68, 0.5);
    box-shadow: 0 15px 40px rgba(239, 68, 68, 0.3);
  }
  
  .chart-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.5rem;
  }
  
  .chart-title {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  
  .chart-icon {
    font-size: 2rem;
    filter: drop-shadow(0 0 10px rgba(239, 68, 68, 0.5));
  }
  
  .chart-title h3 {
    margin: 0;
    color: #f1f5f9;
    font-size: 1.3rem;
    font-weight: 600;
  }
  
  .chart-value {
    font-weight: 700;
    color: #ec4899;
    font-family: 'JetBrains Mono', monospace;
    font-size: 1.4rem;
    text-shadow: 0 0 10px rgba(239, 68, 68, 0.3);
  }
  
  .chart-container {
    height: 250px;
    position: relative;
    margin-bottom: 1rem;
  }
  
  .chart-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 1rem;
  }
  
  .chart-trend {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-size: 0.9rem;
  }
  
  .chart-trend.up {
    background: rgba(16, 185, 129, 0.2);
    color: #10b981;
    border: 1px solid rgba(16, 185, 129, 0.3);
  }
  
  .chart-trend.down {
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.3);
  }
  
  .trend-icon {
    font-size: 0.8rem;
  }
  
  .chart-click-hint {
    color: #94a3b8;
    font-size: 0.8rem;
    opacity: 0.8;
  }
  
  .fab {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: linear-gradient(135deg, #e86aa9 0%, #f15299 100%);
    border: none;
    color: white;
    cursor: pointer;
    box-shadow: 
      0 8px 25px rgba(239, 68, 68, 0.4),
      0 0 0 1px rgba(255, 255, 255, 0.1);
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    opacity: 0;
    transform: scale(0) rotate(-180deg);
    z-index: 1000;
    font-family: 'Inter', sans-serif;
  }
  
  .fab-visible {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
  
  .fab:hover {
    transform: scale(1.1) rotate(5deg);
    box-shadow: 
      0 12px 35px rgba(239, 68, 68, 0.6),
      0 0 0 1px rgba(255, 255, 255, 0.2);
  }
  
  .fab:active {
    transform: scale(0.95) rotate(0deg);
  }
  
  .fab-icon {
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  }
  
  .fab-glow {
    position: absolute;
    top: -2px;
    left: -2px;
    right: -2px;
    bottom: -2px;
    background: linear-gradient(135deg, #e86aa9, #f15299, #be185d);
    border-radius: 50%;
    z-index: -1;
    opacity: 0;
    animation: fabPulse 2s ease-in-out infinite;
  }
  
  @keyframes fabPulse {
    0%, 100% {
      opacity: 0.5;
      transform: scale(1);
    }
    50% {
      opacity: 0.8;
      transform: scale(1.1);
    }
  }
  
  .bg-elements {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: -1;
  }
  
  .bg-circle {
    position: absolute;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(239, 68, 68, 0.1) 0%, transparent 70%);
    animation: floatBackground 20s ease-in-out infinite;
  }
  
  .circle-1 {
    width: 300px;
    height: 300px;
    top: 10%;
    left: 10%;
    animation-delay: 0s;
  }
  
  .circle-2 {
    width: 200px;
    height: 200px;
    top: 60%;
    right: 10%;
    animation-delay: -5s;
  }
  
  .circle-3 {
    width: 150px;
    height: 150px;
    bottom: 20%;
    left: 20%;
    animation-delay: -10s;
  }
  
  @keyframes floatBackground {
    0%, 100% {
      transform: translateY(0) rotate(0deg);
    }
    33% {
      transform: translateY(-30px) rotate(120deg);
    }
    66% {
      transform: translateY(15px) rotate(240deg);
    }
  }
  
  .debug-info {
    margin: 1rem 0;
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
  
  .stagger-fade-move,
  .stagger-fade-enter-active,
  .stagger-fade-leave-active {
    transition: all 0.5s ease;
  }
  
  .stagger-fade-enter-from {
    opacity: 0;
    transform: translateX(-30px);
  }
  
  .stagger-fade-leave-to {
    opacity: 0;
    transform: translateX(30px);
  }
  
  .stagger-fade-leave-active {
    position: absolute;
  }
  
  .zoom-enter-active,
  .zoom-leave-active {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .zoom-enter-from,
  .zoom-leave-to {
    opacity: 0;
    transform: scale(0) rotate(-180deg);
  }
  
  .slide-in {
    animation: slideIn 0.5s ease-out;
  }
  
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(-100%);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @media (max-width: 768px) {
    .charts-grid {
      grid-template-columns: 1fr;
    }
    
    .chart-header {
      flex-direction: column;
      gap: 1rem;
      align-items: stretch;
    }
    
    .chart-container {
      height: 200px;
    }
    
    .chart-footer {
      flex-direction: column;
      gap: 1rem;
      align-items: stretch;
    }
    
    .fab {
      bottom: 1rem;
      right: 1rem;
      width: 50px;
      height: 50px;
    }
    
    .page-title {
      font-size: 2rem;
    }
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