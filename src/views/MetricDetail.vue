<template>
    <div class="page dark-theme">
      <div class="page-header">
        <button @click="goBack" class="back-btn">
          ← Назад к дашборду
        </button>
        <h1 class="page-title">
          <span class="icon">{{ currentMetric.icon }}</span>
          {{ currentMetric.title }}
        </h1>
      </div>
  
      <div class="loading-message" v-if="loading">
        <span class="loading-icon">⏳</span>
        Загрузка данных...
      </div>
  
      <div class="error-message" v-else-if="error">
        <span class="error-icon">⚠️</span>
        {{ error }}
      </div>
  
      <div class="metric-detail" v-else-if="ordersData.length > 0">
        <div class="metric-stats">
          <div class="stat-card">
            <div class="stat-label">Всего</div>
            <div class="stat-value">{{ getTotalValue }}</div>
            <div class="stat-change positive">
              <span class="trend-icon">↗️</span>
              <span class="trend-value">+12%</span>
            </div>
          </div>
        </div>
  
        <div class="fullscreen-chart">
          <div class="chart-container-full">
            <canvas ref="chartCanvas" class="chart-canvas"></canvas>
          </div>
        </div>
      </div>
  
      <div class="no-data-message" v-else>
        <span class="no-data-icon">📊</span>
        Нет данных для отображения
      </div>
  
      <div class="bg-elements">
        <div class="bg-circle circle-1"></div>
        <div class="bg-circle circle-2"></div>
        <div class="bg-circle circle-3"></div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, computed, onMounted, watch, nextTick } from 'vue'
  import { useRoute, useRouter } from 'vue-router'
  import { useApi } from '../composables/useApi.js'
  import { Chart, registerables } from 'chart.js'
  
  Chart.register(...registerables)
  
  const route = useRoute()
  const router = useRouter()
  
  // Исправленный вызов API - добавьте полный путь
  const { 
    data: apiData, 
    loading, 
    error, 
    fetchData 
  } = useApi('/api/orders')
  
  const chartCanvas = ref(null)
  let chartInstance = null
  
  const metricsConfig = {
    sales: { 
      id: 'sales', 
      title: 'Количество продаж', 
      icon: '📦', 
      color: '#ec4899',
      type: 'шт.'
    },
    revenue: { 
      id: 'revenue', 
      title: 'Общая выручка', 
      icon: '💰', 
      color: '#10b981',
      type: '₽'
    },
    cancellations: { 
      id: 'cancellations', 
      title: 'Количество отмен', 
      icon: '❌', 
      color: '#ef4444',
      type: 'шт.'
    },
    discounts: { 
      id: 'discounts', 
      title: 'Сумма скидок', 
      icon: '🎁', 
      color: '#f59e0b',
      type: '₽'
    }
  }
  
  const currentMetric = computed(() => 
    metricsConfig[route.params.metric] || metricsConfig.sales
  )
  
  const ordersData = computed(() => {
    if (!apiData.value) return []
    
    console.log('📊 MetricDetail данные:', apiData.value)
    
    // Обработка разных форматов ответа API
    if (Array.isArray(apiData.value)) {
      return apiData.value
    }
    
    if (apiData.value && typeof apiData.value === 'object') {
      if (Array.isArray(apiData.value.data)) return apiData.value.data
      if (Array.isArray(apiData.value.orders)) return apiData.value.orders
      if (Array.isArray(apiData.value.results)) return apiData.value.results
      if (Array.isArray(apiData.value.items)) return apiData.value.items
    }
    
    return []
  })
  
  // Общее значение для выбранной метрики
  const getTotalValue = computed(() => {
    if (ordersData.value.length === 0) return `0 ${currentMetric.value.type}`
    
    const total = ordersData.value.reduce((sum, item) => {
      switch (currentMetric.value.id) {
        case 'sales':
          return sum + 1
        case 'revenue':
          return sum + (Number(item.total_price) || 0)
        case 'cancellations':
          return sum + (item.is_cancel ? 1 : 0)
        case 'discounts':
          const totalPrice = Number(item.total_price) || 0
          const priceWithDisc = Number(item.price_with_disc) || 0
          return sum + Math.max(0, totalPrice - priceWithDisc)
        default:
          return sum
      }
    }, 0)
    
    return `${Math.round(total).toLocaleString()} ${currentMetric.value.type}`
  })
  
  const chartData = computed(() => {
    if (ordersData.value.length === 0) return { labels: [], datasets: [] }
  
    const dataByDate = ordersData.value.reduce((acc, item) => {
      if (item.date) {
        const date = item.date.split('T')[0]
        if (!acc[date]) {
          acc[date] = 0
        }
        
        switch (currentMetric.value.id) {
          case 'sales':
            acc[date] += 1
            break
          case 'revenue':
            acc[date] += Number(item.total_price) || 0
            break
          case 'cancellations':
            if (item.is_cancel) acc[date] += 1
            break
          case 'discounts':
            const totalPrice = Number(item.total_price) || 0
            const priceWithDisc = Number(item.price_with_disc) || 0
            acc[date] += Math.max(0, totalPrice - priceWithDisc)
            break
        }
      }
      return acc
    }, {})
  
    const sortedDates = Object.keys(dataByDate).sort()
  
    return {
      labels: sortedDates,
      datasets: [{
        label: currentMetric.value.title,
        data: sortedDates.map(date => dataByDate[date]),
        borderColor: currentMetric.value.color,
        backgroundColor: `${currentMetric.value.color}20`,
        borderWidth: 4,
        tension: 0.1,
        fill: true,
        pointBackgroundColor: currentMetric.value.color,
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 6,
        pointHoverRadius: 10
      }]
    }
  })
  
  const initChart = async () => {
    if (!chartCanvas.value || chartData.value.labels.length === 0) return
  
    if (chartInstance) {
      chartInstance.destroy()
    }
  
    chartInstance = new Chart(chartCanvas.value, {
      type: 'line',
      data: chartData.value,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 2000,
          easing: 'easeOutQuart'
        },
        plugins: {
          legend: { 
            display: true,
            position: 'top',
            labels: {
              color: '#e2e8f0',
              font: {
                size: 14,
                weight: 'bold'
              }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            borderColor: currentMetric.value.color,
            borderWidth: 2,
            titleColor: '#f1f5f9',
            bodyColor: '#cbd5e1',
            callbacks: {
              label: (context) => {
                const value = context.parsed.y
                return `${currentMetric.value.title}: ${value.toLocaleString()} ${currentMetric.value.type}`
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { 
              color: 'rgba(100, 116, 139, 0.3)',
              lineWidth: 1
            },
            ticks: { 
              color: '#94a3b8',
              font: {
                size: 12,
                weight: '500'
              },
              callback: (value) => {
                return value.toLocaleString() + ' ' + currentMetric.value.type
              }
            },
            title: {
              display: true,
              text: currentMetric.value.title,
              color: '#e2e8f0',
              font: {
                size: 14,
                weight: 'bold'
              }
            }
          },
          x: {
            grid: { 
              color: 'rgba(100, 116, 139, 0.2)',
              lineWidth: 1
            },
            ticks: { 
              color: '#94a3b8',
              font: {
                size: 11,
                weight: '500'
              }
            },
            title: {
              display: true,
              text: 'Дата',
              color: '#e2e8f0',
              font: {
                size: 14,
                weight: 'bold'
              }
            }
          }
        },
        interaction: {
          intersect: false,
          mode: 'index'
        }
      }
    })
  }
  
  const goBack = () => {
    router.push('/')
  }
  
  onMounted(() => {
    fetchData()
  })
  
  watch([ordersData, chartCanvas, currentMetric], () => {
    if (ordersData.value.length > 0 && chartCanvas.value) {
      nextTick(() => {
        setTimeout(initChart, 100)
      })
    }
  }, { immediate: true })
  </script>
  
  <style scoped>
  .page-header {
    display: flex;
    align-items: center;
    gap: 2rem;
    margin-bottom: 2rem;
    padding: 0 1rem;
  }
  
  .back-btn {
    padding: 1rem 2rem;
    border: 1px solid rgba(239, 68, 68, 0.3);
    background: rgba(15, 23, 42, 0.8);
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s ease;
    font-weight: 600;
    color: #e2e8f0;
    backdrop-filter: blur(10px);
    font-size: 1rem;
    white-space: nowrap;
  }
  
  .back-btn:hover {
    border-color: #ec4899;
    background: rgba(239, 68, 68, 0.2);
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(239, 68, 68, 0.3);
  }
  
  .metric-stats {
    margin-bottom: 2rem;
    padding: 0 1rem;
  }
  
  .stat-card {
    background: linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%);
    padding: 2rem;
    border-radius: 16px;
    border: 1px solid rgba(239, 68, 68, 0.2);
    backdrop-filter: blur(10px);
    text-align: center;
  }
  
  .stat-label {
    color: #94a3b8;
    font-size: 1rem;
    margin-bottom: 0.5rem;
  }
  
  .stat-value {
    color: #f1f5f9;
    font-size: 2.5rem;
    font-weight: 700;
    margin-bottom: 1rem;
    font-family: 'JetBrains Mono', monospace;
  }
  
  .stat-change {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-weight: 600;
    font-size: 0.9rem;
  }
  
  .stat-change.positive {
    background: rgba(16, 185, 129, 0.2);
    color: #10b981;
    border: 1px solid rgba(16, 185, 129, 0.3);
  }
  
  .fullscreen-chart {
    background: linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%);
    padding: 2rem;
    border-radius: 20px;
    border: 1px solid rgba(239, 68, 68, 0.2);
    backdrop-filter: blur(10px);
    margin: 0 1rem;
  }
  
  .chart-container-full {
    height: 60vh;
    min-height: 400px;
    position: relative;
  }
  
  /* Сообщения о состоянии */
  .loading-message, .error-message, .no-data-message {
    padding: 3rem 2rem;
    text-align: center;
    border-radius: 16px;
    margin: 2rem 1rem;
    font-size: 1.2rem;
    font-weight: 500;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    backdrop-filter: blur(10px);
  }
  
  .loading-message {
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(30, 64, 175, 0.2) 100%);
    border: 1px solid rgba(59, 130, 246, 0.3);
    color: #bae6fd;
  }
  
  .error-message {
    background: linear-gradient(135deg, rgba(239, 68, 68, 0.2) 0%, rgba(185, 28, 28, 0.2) 100%);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #fecaca;
  }
  
  .no-data-message {
    background: linear-gradient(135deg, rgba(100, 116, 139, 0.2) 0%, rgba(51, 65, 85, 0.2) 100%);
    border: 1px solid rgba(100, 116, 139, 0.3);
    color: #cbd5e1;
  }
  
  .loading-icon, .error-icon, .no-data-icon {
    font-size: 1.5rem;
  }
  
  @media (max-width: 768px) {
    .page-header {
      flex-direction: column;
      align-items: stretch;
      gap: 1rem;
    }
    
    .back-btn {
      text-align: center;
    }
    
    .metric-stats {
      margin-bottom: 1rem;
    }
    
    .stat-card {
      padding: 1.5rem;
    }
    
    .stat-value {
      font-size: 2rem;
    }
    
    .fullscreen-chart {
      padding: 1rem;
      margin: 0 0.5rem;
    }
    
    .chart-container-full {
      height: 50vh;
    }
    
    .page-title {
      font-size: 2rem;
      justify-content: center;
    }
  }
  
  /* Общие стили */
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
    margin: 0;
    color: #f1f5f9;
    font-size: 2.5rem;
    font-weight: 700;
    background: linear-gradient(135deg, #ed80b6 0%, #f76dab 50%, #e72e7b 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: titleGlow 3s ease-in-out infinite alternate;
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  @keyframes titleGlow {
    from {
      text-shadow: 0 0 20px rgba(242, 127, 190, 0.738);
    }
    to {
      text-shadow: 0 0 30px rgba(245, 97, 171, 0.8), 0 0 40px rgba(167, 22, 82, 0.6);
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