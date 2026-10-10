import { createRouter, createWebHistory } from 'vue-router'

import Home from '@/components/Home/Index.vue'
import Data from '@/components/Data/Index.vue'
const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        { path: '/', component: Home },
        { path: '/data', component: Data },
    ],
})

export default router
