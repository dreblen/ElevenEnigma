<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'

import StateSelector from '../Elements/StateSelector.vue'
import type { StateSelectorModel } from '../Elements/StateSelector.vue'

import { useDataStore } from '@/stores/data'

const data = useDataStore()

const stateSelection = ref({} as StateSelectorModel)

const fixedPositions = ref(undefined as number[]|undefined)
const vizSpells = computed(() => stateSelection.value.spells.map(s => ({
    code: s.code,
    bits: data.getBitsFromSpellCode(s.code).join(''),
})))

const isAnalyzing = ref(false)
const analyze = async function() {
    // Can't analyze if we have no codes
    if (stateSelection.value.spells.length === 0) {
        return
    }

    isAnalyzing.value = true
    fixedPositions.value = undefined
    await nextTick()

    // Store bits for each of our qualifying spells so we don't have to
    // regenerate them repeatedly
    const spellBits = stateSelection.value.spells.map(s => ({
        id: s.id,
        bits: data.getBitsFromSpellCode(s.code),
    }))

    // Determine which bit positions never change
    const positions = [] as number[]
    for (let testPosition = 0; testPosition < data.TARGET_BIT_LENGTH; testPosition++) {
        const base = spellBits[0]?.bits[testPosition]
        let hasChanged = false
        for (let i = 1; i < spellBits.length; i++) {
            if (spellBits[i]?.bits[testPosition] !== base) {
                hasChanged = true
                break
            }
        }

        if (hasChanged === false) {
            positions.push(testPosition)
        }
    }

    fixedPositions.value = positions
    isAnalyzing.value = false
}
</script>

<template>
    <v-row>
        <v-col>
            <p class="text-body-1">
                Within a constant parameter set, look for any bit positions that
                are repeated across all codes in the set. Intended to help
                identify any anchors that may be influenced by encoded set data.
            </p>
        </v-col>
    </v-row>
    <state-selector
        v-model="stateSelection"
    />
    <v-row>
        <v-col>
            <v-btn
                color="primary"
                :loading="isAnalyzing"
                :disabled="isAnalyzing || !stateSelection.characterName || !stateSelection.gameStateId"
                @click="analyze"
            >
                Analyze
            </v-btn>
        </v-col>
    </v-row>
    <template v-if="fixedPositions !== undefined">
        <v-row>
            <v-col>
                <v-data-table :items="vizSpells">
                    <template #item.bits="{ item }">
                        <span
                            v-for="(bit, i) in item.bits"
                            :style="(fixedPositions.indexOf(i) === -1) ? '' : 'background: yellow'"
                        >
                            {{ bit }}
                        </span>
                    </template>
                </v-data-table>
            </v-col>
        </v-row>
    </template>
</template>
