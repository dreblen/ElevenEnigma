import { createRouter, createWebHistory } from 'vue-router'

import Home from '@/components/Home/Index.vue'
import Data from '@/components/Data/Index.vue'
import Analysis from '@/components/Analysis/Index.vue'

const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes: [
        { path: '/', component: Home },
        { path: '/data', component: Data },
        { path: '/analysis', component: Analysis },
    ],
})

export default router
