<script setup lang="ts">
import { useDataStore } from '@/stores/data'
import { computed, defineModel } from 'vue'

import type { RestorationSpell } from '@/types'

const data = useDataStore()

const uniqueCharacterNames = computed(() => {
    const names = new Set()
    for (const spell of data.spells) {
        names.add(spell.characterName)
    }

    return [...names]
})

export interface StateSelectorModel {
    characterName: string|undefined
    gameStateId: number|undefined
    spells: RestorationSpell[]
}
const model = defineModel<StateSelectorModel>()
if (model.value === undefined) {
    model.value = {
        characterName: undefined,
        gameStateId: undefined,
        spells: [],
    }
}
if (model.value.spells === undefined) {
    model.value.spells = []
}

const onSelectionChange = function () {
    if (model.value === undefined) {
        return
    }

    if (model.value.characterName === undefined || model.value.gameStateId === undefined) {
        model.value.spells = []
    } else {
        model.value.spells = data.spells.filter(s => s.characterName === model.value?.characterName && s.gameStateId === model.value.gameStateId)
    }
}
</script>

<template>
    <v-row>
        <v-col>
            <v-select
                v-model="model.characterName"
                label="Character Name"
                :items="uniqueCharacterNames"
                @update:model-value="onSelectionChange"
            />
        </v-col>
        <v-col>
            <v-select
                v-model="model.gameStateId"
                label="Game State"
                :items="data.gameStates"
                item-title="name"
                item-value="id"
                @update:model-value="onSelectionChange"
            />
        </v-col>
    </v-row>
</template>
