<script setup lang="ts">
import { computed, ref } from 'vue'

import UniqueBitsContiguous from './Packages/UniqueBitsContiguous.vue'

const packageList = [
    { seq: 1, name: 'Unique Bits (Contiguous)', component: UniqueBitsContiguous },
]
const currentPackageSeq = ref(1)
const currentPackage = computed(() => packageList.find(p => p.seq === currentPackageSeq.value ))
</script>

<template>
    <v-container fluid>
        <v-row>
            <v-col>
                <v-select
                    v-model="currentPackageSeq"
                    label="Package"
                    :items="packageList"
                    item-title="name"
                    item-value="seq"
                />
            </v-col>
        </v-row>
        <component v-if="currentPackage" :is="currentPackage.component" />
    </v-container>
</template>
