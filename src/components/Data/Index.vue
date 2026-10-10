<script setup lang="ts">
import { computed, ref } from 'vue'
import { useDataStore } from '@/stores/data'

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

const spellTableItems = computed(() => data.spells.map(s => ({
    state: data.gameStates.find(gs => gs.id === s.gameStateId)?.seq || '???',
    character: s.characterName,
    code: s.code,
    binaryCode: data.getBinaryStringFromCode(s.code),
})))
const editSpellEdition = ref(SourceEdition.DS)
const editSpellCharacterName = ref('')
const editSpellRestrictions = ref([] as number[])
const editSpellGameState = ref(undefined as number|undefined)
const editSpellCodes = ref('')

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
    const codes = editSpellCodes.value.split("\n")
    for (let code of codes) {
        code = code.trim()
        if (code.length === 0) {
            continue
        }

        data.addSpell(code, editSpellEdition.value, editSpellCharacterName.value, restrictions, editSpellGameState.value)
    }
}
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
                <v-data-table :items="spellTableItems">
                    <template #top>
                        <v-toolbar>
                            <v-toolbar-title>
                                Restoration Spells
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
                                                            <v-textarea
                                                                v-model="editSpellCodes"
                                                                label="Code(s)"
                                                                placeholder="Separate multiples by newline"
                                                            >
                                                            </v-textarea>
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
                </v-data-table>
            </v-col>
        </v-row>
    </v-container>
</template>
