<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'

import StateSelector from '../Elements/StateSelector.vue'
import type { StateSelectorModel } from '../Elements/StateSelector.vue'

import { useDataStore } from '@/stores/data'

const data = useDataStore()

const stateSelection = ref({} as StateSelectorModel)
const targetNumBits = ref(1)

const startingPositions = ref(undefined as number[]|undefined)
const vizNumBits = ref(1)
const vizStartingPositionIndex = ref(undefined as number|undefined)
const vizStartingPosition = computed(() => (startingPositions.value !== undefined && vizStartingPositionIndex.value !== undefined && startingPositions.value.length > vizStartingPositionIndex.value) ? startingPositions.value[vizStartingPositionIndex.value] : undefined)
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
    startingPositions.value = undefined
    vizStartingPositionIndex.value = undefined
    vizNumBits.value = targetNumBits.value
    await nextTick()

    // Store bits for each of our qualifying spells so we don't have to
    // regenerate them repeatedly
    const spellBits = stateSelection.value.spells.map(s => ({
        id: s.id,
        bits: data.getBitsFromSpellCode(s.code),
    }))

    // Determine which starting bits result in unique values of the target size
    const uniqueStartingPositions = [] as number[]
    for (let testPosition = 0; testPosition < 1 + data.TARGET_BIT_LENGTH - targetNumBits.value; testPosition++) {
        // Get all sets of bits from this starting position
        const codeBits = new Set()
        for (const spell of spellBits) {
            codeBits.add(spell.bits.slice(testPosition, testPosition+targetNumBits.value).join(''))
        }

        // If the number of unique bit sets is the same as the number of overall
        // sets, then this position was unique
        if (codeBits.size === spellBits.length) {
            uniqueStartingPositions.push(testPosition)
        }
    }

    startingPositions.value = uniqueStartingPositions
    isAnalyzing.value = false
}
</script>

<template>
    <v-row>
        <v-col>
            <p class="text-body-1">
                Within a constant parameter set, look for the specified number
                of contiguous bits that are never repeated in the same position
                in the set. Intended to help identify where seed/salt value is
                stored to explain why there are multiple codes for the same
                state.
            </p>
        </v-col>
    </v-row>
    <state-selector
        v-model="stateSelection"
    />
    <v-row>
        <v-col>
            <p class="text-body-1">
                Matching Spells: {{ stateSelection.spells.length }}<br />
                Minimum Bits for Count: {{ (stateSelection.spells.length > 0) ? Math.ceil(Math.log2(stateSelection.spells.length)) : 'N/A' }}
            </p>
        </v-col>
        <v-col>
            <v-number-input
                v-model="targetNumBits"
                label="# Bits"
                :min="1"
            />
        </v-col>
    </v-row>
    <v-row>
        <v-col>
            <v-btn
                color="primary"
                :loading="isAnalyzing"
                :disabled="isAnalyzing || !stateSelection.characterName || !stateSelection.gameStateId || !targetNumBits"
                @click="analyze"
            >
                Analyze
            </v-btn>
        </v-col>
    </v-row>
    <template v-if="startingPositions !== undefined">
        <v-row>
            <v-col>
                <p class="text-body-1">
                    Unique Starting Positions:
                </p>
                <v-btn-toggle
                    v-if="startingPositions.length > 0"
                    v-model="vizStartingPositionIndex"
                    mandatory
                    color="secondary"
                    border
                    divided
                >
                    <v-btn
                        v-for="pos of startingPositions"
                    >
                        {{ pos }}
                    </v-btn>
                </v-btn-toggle>
                <p v-else class="text-body-1">
                    None Found
                </p>
            </v-col>
        </v-row>
        <v-row>
            <v-col>
                <v-data-table
                    :items="vizSpells"
                >
                    <template #item.bits="{ item }">
                        <template v-if="vizStartingPosition !== undefined">
                            <span style="font-family: monospace;">
                                {{ item.bits.substring(0,vizStartingPosition) }}
                                <span style="background: yellow">{{ item.bits.substring(vizStartingPosition,vizStartingPosition+vizNumBits) }}</span>
                                {{ item.bits.substring(vizStartingPosition+vizNumBits) }}
                            </span>
                        </template>
                        <template v-else>
                            {{ item.bits }}
                        </template>
                    </template>
                </v-data-table>
            </v-col>
        </v-row>
    </template>
</template>
