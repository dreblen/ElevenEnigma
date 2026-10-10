import { computed } from 'vue'
import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'

import type * as EE from '@/types'

export const useDataStore = defineStore('data', () => {
    ////////////////////////////////////////////////////////////////////////////
    // Game States
    ////////////////////////////////////////////////////////////////////////////

    const gameStates = useLocalStorage('data-game-states', [] as EE.GameState[])
    const maxGameStateId = computed(() => gameStates.value.reduce((p, c) => (p > c.id) ? p : c.id,0))

    function addGameState(name: string, seq: number) {
        gameStates.value.push({
            id: maxGameStateId.value + 1,
            name,
            seq,
        })
    }

    function removeGameState(id?: number) {
        // Can't remove nothing
        if (id === undefined) {
            return false
        }

        // Can't remove if still used by a spell
        if (spells.value.find(s => s.gameStateId === id)) {
            return false
        }

        gameStates.value = gameStates.value.filter(gs => gs.id !== id)

        return true
    }

    ////////////////////////////////////////////////////////////////////////////
    // Spells of Restoration
    ////////////////////////////////////////////////////////////////////////////
    
    const spells = useLocalStorage('data-spells', [] as EE.RestorationSpell[])
    const maxSpellId = computed(() => spells.value.reduce((p, c) => (p > c.id) ? p : c.id,0))

    function addSpell(code: string, edition: EE.SourceEdition, characterName: string, restrictions: number, gameStateId: number) {
        // Make sure the state is valid
        if (!gameStates.value.find(gs => gs.id === gameStateId)) {
            return false
        }

        spells.value.push({
            id: maxSpellId.value + 1,
            code,
            edition,
            characterName,
            restrictions,
            gameStateId,
        })

        return true
    }

    function removeSpell(id?: number) {
        // Can't remove nothing
        if (id === undefined) {
            return false
        }

        spells.value = spells.value.filter(s => s.id !== id)

        return true
    }

    ////////////////////////////////////////////////////////////////////////////
    // Fixed Supporting Data
    ////////////////////////////////////////////////////////////////////////////

    const codeCharacters = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわがぎぐげござじずぜぞだぢづでどばびぶべぼ'
    const nameCharacters = '　あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわがぎぐげござじずぜぞだぢづでどばびぶべぼ'

    function getBinaryStringFromCode(code: string) {
        const strings = [] as string[]
        for (const char of code) {
            const index = codeCharacters.indexOf(char)
            if (index !== -1) {
                strings.push(index.toString(2).padStart(6,'0'))
            }
        }

        return strings.join(' ')
    }

    return {
        gameStates,
        addGameState,
        removeGameState,
        spells,
        addSpell,
        removeSpell,
        codeCharacters,
        nameCharacters,
        getBinaryStringFromCode,
    }
})
