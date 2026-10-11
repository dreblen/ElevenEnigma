<script setup lang="ts">
import { computed, ref } from 'vue'

import UniqueBitsContiguous from './Packages/UniqueBitsContiguous.vue'

const packageList = [
    { name: 'Unique Bits (Contiguous)', component: UniqueBitsContiguous },
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
