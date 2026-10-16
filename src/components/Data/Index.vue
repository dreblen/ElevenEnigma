<script setup lang="ts">
import { computed, ref } from 'vue'
import { useDataStore } from '@/stores/data'

import { createWorker as createTesseractWorker } from 'tesseract.js'

import { SourceEdition, RestrictionFlag } from '@/types'

const data = useDataStore()

const gameStateTableItems = computed(() => data.gameStates.map(gs => ({
    sequence: gs.seq,
    name: gs.name
})))
const editGameStateName = ref('')
const editGameStateSeq = ref(1)

const saveNewGameState = function() {
    data.addGameState(editGameStateName.value, editGameStateSeq.value)
    editGameStateName.value = ''
    editGameStateSeq.value = 1
}

const gameEditions = [
    { value: SourceEdition.DS, title: 'DS' },
    { value: SourceEdition.PS4, title: 'PS4' },
    { value: SourceEdition.PS4_S, title: 'PS4 S' },
]

const restrictionFlags = [
    { value: RestrictionFlag.NoFlee, title: 'No Fleeing Battle' },
    { value: RestrictionFlag.NoBuy, title: 'No Buying from Shops' },
    { value: RestrictionFlag.NoAccessories, title: 'Cannot Equip Everything' },
    { value: RestrictionFlag.NoAction, title: 'Sometimes Cannot Act in Battle' },
]

const spellTableHeaders = [
    { title: 'State', key: 'state' },
    { title: 'Character', key: 'character' },
    { title: 'Code', key: 'code' },
    { title: 'Binary Code', key: 'binaryCode' },
    { title: 'Actions', key: 'actions' },
]
const spellTableItems = computed(() => data.spells.map(s => ({
    id: s.id,
    state: data.gameStates.find(gs => gs.id === s.gameStateId)?.seq || '???',
    character: s.characterName,
    code: s.code,
    binaryCode: data.getBinaryStringFromSpellCode(s.code),
})))
const filteredSpellTableItems = computed(() => {
    if (toggleShowDuplicatesOnly.value === true && duplicateCodes.value.length > 0) {
        return spellTableItems.value.filter(s => duplicateCodes.value.indexOf(s.code) !== -1)
    }

    return spellTableItems.value
})
const editSpellEdition = ref(SourceEdition.DS)
const editSpellCharacterName = ref('')
const editSpellRestrictions = ref([] as number[])
const editSpellGameState = ref(undefined as number|undefined)
const editSpellCodeMethod = ref(1)
const editSpellCodeInput = ref('')
const editSpellCodeUpload = ref([] as File[])

const editSpellCodes = computed(() => {
    switch (editSpellCodeMethod.value) {
        // Direct input
        case 1: {
            return editSpellCodeInput.value.split("\n")
        }
        // Image upload
        case 2: {
            const codes = [] as string[]

            for (const item of imageUploadCarouselItems.value) {
                // Store a version of the code without any whitespace
                const stripped = item.parsedText.replace(/\s+/g, '')

                // If the item isn't 17 characters long, we can't use it
                if (stripped.length !== 17) {
                    continue
                }

                // Apply the standard splits to help visually
                const formatted = `${stripped.substring(0,3)}　${stripped.substring(3,6)}　${stripped.substring(6,10)}　${stripped.substring(10,13)}　${stripped.substring(13,16)}　${stripped.substring(16)}`
                
                codes.push(formatted)
            }

            return codes
        }
        default: {
            return []
        }
    }
})

const saveNewSpell = function() {
    // Make sure we have a selected game state
    if (!editSpellGameState.value) {
        return
    }

    // Normalize our character name to fill the space
    if (editSpellCharacterName.value.length !== 6) {
        editSpellCharacterName.value += ('　'.repeat(6 - editSpellCharacterName.value.length))
    }

    // Turn our selected restrictions into a single value
    let restrictions = 0
    for (const flag of editSpellRestrictions.value) {
        restrictions |= flag
    }

    // Add each spell identified
    for (let code of editSpellCodes.value) {
        code = code.trim()
        if (code.length === 0) {
            continue
        }

        data.addSpell(code, editSpellEdition.value, editSpellCharacterName.value, restrictions, editSpellGameState.value)
    }

    // Reset our input values
    editSpellCharacterName.value = ''
    editSpellRestrictions.value = []
    editSpellGameState.value = undefined
    editSpellCodeMethod.value = 1
    editSpellCodeInput.value = ''
    editSpellCodeUpload.value = []
}

interface ImageUploadCarouselItem {
    dataUrl: string
    parsedText: string
}
const imageUploadCarouselItems = ref([] as ImageUploadCarouselItem[])
const imageUploadCarouselCurrentItemIndex = ref(0)
const imageUploadCarouselCurrentItem = computed(() => (imageUploadCarouselItems.value.length > imageUploadCarouselCurrentItemIndex.value) ? imageUploadCarouselItems.value[imageUploadCarouselCurrentItemIndex.value] : undefined )
const imageUploadCarouselCurrentItemStrippedLen = computed(() => {
    if (imageUploadCarouselCurrentItem.value == undefined) {
        return 0
    } else {
        return imageUploadCarouselCurrentItem.value.parsedText.replace(/\s+/g, '').length
    }
})
const onSpellImagesUpload = async function() {
    imageUploadCarouselItems.value = []
    imageUploadCarouselCurrentItemIndex.value = 0

    const worker = await createTesseractWorker('jpn')
    await worker.setParameters({
        tessedit_char_whitelist: data.codeCharacters + '「',
    })

    for (const f of editSpellCodeUpload.value) {
        const result = await worker.recognize(f)

        const reader = new FileReader()
        reader.onloadend = () => {
            imageUploadCarouselItems.value.push({
                dataUrl: reader.result as string,
                parsedText: result.data.text,
            })
        }
        reader.readAsDataURL(f)
    }

    await worker.terminate()
}

const toggleShowDuplicatesOnly = ref(false)
const codeCountSummary = computed(() => {
    const summary = [] as { code: string; ids: number[] }[]

    for (const spell of data.spells) {
        const match = summary.find(s => s.code === spell.code)
        if (match) {
            match.ids.push(spell.id)
        } else {
            summary.push({ code: spell.code, ids: [spell.id] })
        }
    }

    return summary
})
const duplicateCodes = computed(() => codeCountSummary.value.filter(s => s.ids.length > 1).map(s => s.code))
</script>

<template>
    <v-container fluid>
        <v-row>
            <v-col>
                <v-data-table :items="gameStateTableItems" :sort-by="[{ key: 'sequence' }]">
                    <template #top>
                        <v-toolbar>
                            <v-toolbar-title>
                                Game States
                            </v-toolbar-title>
                            <v-dialog persistent>
                                <template #activator="{ props }">
                                        <v-btn
                                            v-bind="props"
                                            prepend-icon="mdi-plus"
                                            border
                                        >
                                            Add
                                        </v-btn>
                                    </template>
                                    <template #default="{ isActive }">
                                        <v-card title="Add Game State">
                                            <v-card-text>
                                                <v-form>
                                                    <v-container>
                                                        <v-row>
                                                            <v-col>
                                                                <v-text-field
                                                                    v-model="editGameStateName"
                                                                    label="Name"
                                                                />
                                                            </v-col>
                                                            <v-col>
                                                                <v-number-input
                                                                    v-model="editGameStateSeq"
                                                                    label="Sequence"
                                                                    :min="1"
                                                                />
                                                            </v-col>
                                                        </v-row>
                                                    </v-container>
                                                </v-form>
                                            </v-card-text>
                                            <v-card-actions>
                                                <v-spacer />
                                                <v-btn
                                                    @click="isActive.value = false"
                                                    color="error"
                                                >
                                                    Close
                                                </v-btn>
                                                <v-btn
                                                    color="success"
                                                    @click="saveNewGameState(); isActive.value = false"
                                                    :disabled="editGameStateName.length == 0 || !editGameStateSeq"
                                                >
                                                    Save
                                                </v-btn>
                                            </v-card-actions>
                                        </v-card>
                                    </template>
                            </v-dialog>
                        </v-toolbar>
                    </template>
                </v-data-table>
            </v-col>
        </v-row>
        <v-row>
            <v-col>
                <v-data-table :headers="spellTableHeaders" :items="filteredSpellTableItems">
                    <template #top>
                        <v-toolbar>
                            <v-toolbar-title>
                                Restoration Spells
                            </v-toolbar-title>
                            <v-toolbar-items class="pr-3">
                                <v-checkbox-btn
                                    v-if="duplicateCodes.length > 0"
                                    v-model="toggleShowDuplicatesOnly"
                                    :label="`Show duplicates only? (${duplicateCodes.length})`"
                                    class="text-error"
                                >
                                </v-checkbox-btn>
                            </v-toolbar-items>
                            <v-dialog persistent>
                                <template #activator="{ props }">
                                    <v-btn
                                        v-bind="props"
                                        prepend-icon="mdi-plus"
                                        border
                                    >
                                        Add
                                    </v-btn>
                                </template>
                                <template #default="{ isActive }">
                                    <v-card title="Add Restoration Spell(s)">
                                        <v-card-text>
                                            <v-form>
                                                <v-container>
                                                    <v-row>
                                                        <v-col>
                                                            <v-select
                                                                v-model="editSpellEdition"
                                                                label="Edition"
                                                                :items="gameEditions"
                                                            />
                                                        </v-col>
                                                        <v-col>
                                                            <v-text-field
                                                                v-model="editSpellCharacterName"
                                                                label="Character Name"
                                                                maxlength="6"
                                                            />
                                                        </v-col>
                                                        <v-col>
                                                            <v-select
                                                                v-model="editSpellRestrictions"
                                                                label="Restrictions"
                                                                :items="restrictionFlags"
                                                                multiple
                                                            />
                                                        </v-col>
                                                        <v-col>
                                                            <v-select
                                                                v-model="editSpellGameState"
                                                                label="Game State"
                                                                :items="data.gameStates"
                                                                :item-value="'id'"
                                                                :item-title="'name'"
                                                            />
                                                        </v-col>
                                                    </v-row>
                                                    <v-row>
                                                        <v-col>
                                                            <v-tabs v-model="editSpellCodeMethod">
                                                                <v-tab :value="1">Direct Entry</v-tab>
                                                                <v-tab :value="2">From Image(s)</v-tab>
                                                            </v-tabs>
                                                            <v-tabs-window v-model="editSpellCodeMethod">
                                                                <v-tabs-window-item :value="1">
                                                                    <v-textarea
                                                                        v-model="editSpellCodeInput"
                                                                        label="Code(s)"
                                                                        placeholder="Separate multiples by newline"
                                                                    >
                                                                    </v-textarea>
                                                                </v-tabs-window-item>
                                                                <v-tabs-window-item :value="2">
                                                                    <template v-if="editSpellCodeUpload.length > 0">
                                                                        <v-carousel
                                                                            v-model="imageUploadCarouselCurrentItemIndex"
                                                                        >
                                                                            <v-carousel-item
                                                                                v-for="(item, i) of imageUploadCarouselItems"
                                                                                :src="item.dataUrl"
                                                                                :value="i"
                                                                            >
                                                                                <template #placeholder>
                                                                                    <div class="d-flex align-center justify-center fill-height">
                                                                                        <v-progress-circular
                                                                                            color="primary"
                                                                                            indeterminate
                                                                                            size="100"
                                                                                        />
                                                                                    </div>
                                                                                </template>
                                                                            </v-carousel-item>
                                                                        </v-carousel>
                                                                        <v-textarea
                                                                            v-if="imageUploadCarouselCurrentItem"
                                                                            v-model="imageUploadCarouselCurrentItem.parsedText"
                                                                        >
                                                                            <template #append-inner>
                                                                                <v-chip
                                                                                    size="x-large"
                                                                                    :color="imageUploadCarouselCurrentItemStrippedLen === 17 ? 'success' : 'error'"
                                                                                >
                                                                                    {{ imageUploadCarouselCurrentItemStrippedLen }}/17
                                                                                </v-chip>
                                                                            </template>
                                                                        </v-textarea>
                                                                    </template>
                                                                    <v-file-upload
                                                                        v-model="editSpellCodeUpload"
                                                                        multiple
                                                                        @update:model-value="onSpellImagesUpload"
                                                                        density="compact"
                                                                        clearable
                                                                    />
                                                                </v-tabs-window-item>
                                                            </v-tabs-window>
                                                        </v-col>
                                                    </v-row>
                                                </v-container>
                                            </v-form>
                                        </v-card-text>
                                        <v-card-actions>
                                            <v-spacer />
                                            <v-btn
                                                @click="isActive.value = false"
                                                color="error"
                                            >
                                                Close
                                            </v-btn>
                                            <v-btn
                                                color="success"
                                                @click="saveNewSpell(); isActive.value = false"
                                                :disabled="editSpellCharacterName.length == 0 || !editSpellGameState || editSpellCodes.length == 0"
                                            >
                                                Save
                                            </v-btn>
                                        </v-card-actions>
                                    </v-card>
                                </template>
                            </v-dialog>
                        </v-toolbar>
                    </template>
                    <template #item.actions="{ item }">
                        <v-dialog>
                            <template #activator="{ props }">
                                <v-icon v-bind="props">mdi-delete</v-icon>
                            </template>
                            <template #default="{ isActive }">
                                <v-card title="Remove Spell?">
                                    <v-card-text>
                                        Are you sure you want to remove this spell?<br />
                                        {{ item.code }}
                                    </v-card-text>
                                    <v-card-actions>
                                        <v-spacer />
                                        <v-btn @click="isActive.value = false">
                                            Close
                                        </v-btn>
                                        <v-btn
                                            color="error"
                                            @click="data.removeSpell(item.id); isActive.value = false"
                                        >
                                            Remove
                                        </v-btn>
                                    </v-card-actions>
                                </v-card>
                            </template>
                        </v-dialog>
                    </template>
                </v-data-table>
            </v-col>
        </v-row>
    </v-container>
</template>
