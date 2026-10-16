<script setup lang="ts">
import { computed, ref } from 'vue'

import FixedBits from './Packages/FixedBits.vue'
import UniqueBitsContiguous from './Packages/UniqueBitsContiguous.vue'
import UniqueBitsNoncontiguous from './Packages/UniqueBitsNoncontiguous.vue'

const packageList = [
    { name: 'Fixed Bits', component: FixedBits },
    { name: 'Unique Bits (Contiguous)', component: UniqueBitsContiguous },
    { name: 'Unique Bits (Noncontiguous)', component: UniqueBitsNoncontiguous },
]
const currentPackageName = ref(packageList[0]?.name)
const currentPackage = computed(() => packageList.find(p => p.name === currentPackageName.value ))
</script>

<template>
    <v-container fluid>
        <v-row>
            <v-col>
                <v-select
                    v-model="currentPackageName"
                    label="Package"
                    :items="packageList"
                    item-title="name"
                    item-value="name"
                />
            </v-col>
        </v-row>
        <component v-if="currentPackage" :is="currentPackage.component" />
    </v-container>
</template>
