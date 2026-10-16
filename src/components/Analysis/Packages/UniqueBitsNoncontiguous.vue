<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'

import StateSelector from '../Elements/StateSelector.vue'
import type { StateSelectorModel } from '../Elements/StateSelector.vue'

import { useDataStore } from '@/stores/data'

import AnalyzeWorker from '@/components/Analysis/Packages/unique-bits-noncontiguous-worker.ts?worker'
import type * as AnalyzeWorkerTypes from '@/components/Analysis/Packages/unique-bits-noncontiguous-worker.ts'

const data = useDataStore()

const stateSelection = ref({} as StateSelectorModel)
const targetNumBits = ref(1)
const referenceSeedPositions = computed(() => {
    const positions = []
    for (let i = 0; i < data.TARGET_BIT_LENGTH - targetNumBits.value; i++) {
        positions.push(i)
    }

    return positions
})

const bitPositions = ref(undefined as number[][]|undefined)
const vizBitPositionSelectionItems = computed(() => {
    if (bitPositions.value === undefined) {
        return []
    } else {
        return bitPositions.value.map(set => ({
            value: set,
            title: set.join('-'),
        }))
    }
})
const vizSelectedBitPositions = ref(undefined as number[]|undefined)
const vizSpells = computed(() => stateSelection.value.spells.map(s => ({
    code: s.code,
    bits: data.getBitsFromSpellCode(s.code).join(''),
})))

const isAnalyzing = ref(false)
const isCancelling = ref(false)
const threadDisposeMethods = ref<{(): void}[]>([])
const analysisProgress = ref(0.0)
const analyze = async function() {
    // Can't analyze if we have no codes
    if (stateSelection.value.spells.length === 0) {
        return
    }

    // Reset our status indicators
    isAnalyzing.value = true
    isCancelling.value = false
    threadDisposeMethods.value = []
    bitPositions.value = undefined
    await nextTick()

    const spellBits = stateSelection.value.spells.map(s => data.getBitsFromSpellCode(s.code))

    const numThreads = navigator.hardwareConcurrency || 1
    const pendingSeeds = [...referenceSeedPositions.value]
    let numCompletedSeeds = 0.0
    let pendingProgress = 0.0

    const updateProgress = () => {
        analysisProgress.value = (numCompletedSeeds / referenceSeedPositions.value.length) + pendingProgress
    }

    const spawnNewWorker = (seedSize: number) => {
        const seeds = [] as number[]
        for (let i = 0; i < seedSize; i++) {
            const seed = pendingSeeds.pop()
            if (seed === undefined) {
                if (i === 0) {
                    return
                } else {
                    break
                }
            }

            seeds.push(seed)
        }

        const w = new AnalyzeWorker()
        const dispose = function () {
            w.terminate()
        }
        threadDisposeMethods.value.push(dispose)

        const finish = function () {
            if (pendingSeeds.length > 0) {
                if (pendingSeeds.length <= referenceSeedPositions.value.length / 4) {
                    spawnNewWorker(1)
                } else {
                    spawnNewWorker(4)
                }
            } else {
                isAnalyzing.value = false
            }
        }

        let workerProgress = 0.0
        w.onmessage = (m => {
            const message: AnalyzeWorkerTypes.OutboundMessage = m.data
            switch (message.type) {
                case 'progress': {
                    const data = message.data as AnalyzeWorkerTypes.OutboundProgressData

                    const progressValue = data.percentage * seedSize / referenceSeedPositions.value.length
                    pendingProgress += progressValue - workerProgress
                    workerProgress = progressValue

                    updateProgress()
                    break
                }
                case 'result': {
                    const data = message.data as AnalyzeWorkerTypes.OutboundResultData

                    if (bitPositions.value === undefined) {
                        bitPositions.value = []
                    }

                    for (let positionSet of data.positions) {
                        bitPositions.value.push(positionSet)
                    }
                    break
                }
                case 'finish': {
                    pendingProgress -= workerProgress
                    numCompletedSeeds += seedSize
                    finish()
                    setTimeout(dispose, 5000)
                    break
                }
            }
        })

        w.onerror = () => {
            // Add our failed seeds back to the pool
            for (const seed of seeds) {
                pendingSeeds.unshift(seed)
            }

            finish()
            setTimeout(dispose, 5000)
        }

        
        const message: AnalyzeWorkerTypes.InboundMessage = {
            seedStart: seeds[seeds.length - 1] as number,
            seedEnd: Math.min(seeds[0] as number + 1, 1 + data.TARGET_BIT_LENGTH - targetNumBits.value),
            spellBits,
            targetNumBits: targetNumBits.value,
            TARGET_BIT_LENGTH: data.TARGET_BIT_LENGTH,
        }
        w.postMessage(JSON.stringify(message))
    }

    for (let i = 0; i < numThreads; i++) {
        spawnNewWorker(4)
    }
}

function cancel() {
    isCancelling.value = true

    for (const dispose of threadDisposeMethods.value) {
        dispose()
    }

    isAnalyzing.value = false
    isCancelling.value = false
}

onBeforeUnmount(() => {
    if (isAnalyzing.value === true && isCancelling.value === false) {
        cancel()
    }
})
</script>

<template>
    <v-row>
        <v-col>
            <p class="text-body-1">
                Within a constant parameter set, look for the specified number
                of noncontiguous bits that are never repeated in the same
                position in the set. Same purpose as contiguous version, but
                will take much longer to run because of the large number of
                bit arrangements to test.
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
                <template #loader>
                    <v-progress-linear
                        v-model="analysisProgress"
                        :max="1.0"
                    />
                </template>
            </v-btn>
        </v-col>
    </v-row>
    <v-row v-if="isAnalyzing">
        <v-col>
            <v-btn
                color="error"
                :disabled="isCancelling"
                @click="cancel"
            >
                Cancel Analysis
            </v-btn>
        </v-col>
    </v-row>
    <template v-if="bitPositions !== undefined">
        <v-row>
            <v-col>
                <p class="text-body-1">
                    Unique Position Combinations: {{ bitPositions.length }}
                    <template v-if="isAnalyzing">
                        (so far)
                    </template>
                </p>
            </v-col>
            <v-col>
                <v-select
                    v-if="bitPositions.length > 0"
                    v-model="vizSelectedBitPositions"
                    :items="vizBitPositionSelectionItems"
                />
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
                        <span style="font-family: monospace">
                            <span
                                v-for="(bit, i) in item.bits"
                                :style="(vizSelectedBitPositions === undefined || vizSelectedBitPositions.indexOf(i) === -1) ? '' : 'background: yellow'"
                            >
                                {{ bit }}
                            </span>
                        </span>
                    </template>
                </v-data-table>
            </v-col>
        </v-row>
    </template>
</template>
