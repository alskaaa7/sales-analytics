import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from '../views/Dashboard.vue'
import MetricDetail from '../views/MetricDetail.vue'
import Analytics from '../views/Analytics.vue' // Добавьте импорт компонента аналитики

const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: Dashboard
  },
  {
    path: '/analytics', // Добавьте этот маршрут
    name: 'Analytics',
    component: Analytics
  },
  {
    path: '/metric/:metric',
    name: 'MetricDetail',
    component: MetricDetail,
    props: true
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router