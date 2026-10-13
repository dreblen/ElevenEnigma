import { computed } from 'vue'
import { defineStore } from 'pinia'
import { useLocalStorage } from '@vueuse/core'

import type * as EE from '@/types'
import { EncodingMethod } from '@/types'

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

    function serializeGameStates() {
        return JSON.stringify(gameStates.value)
    }

    function deserializeGameStates(json: string) {
        gameStates.value = JSON.parse(json)
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

    function serializeSpells() {
        return JSON.stringify(spells.value)
    }

    function deserializeSpells(json: string) {
        spells.value = JSON.parse(json)
    }

    ////////////////////////////////////////////////////////////////////////////
    // Fixed Supporting Data
    ////////////////////////////////////////////////////////////////////////////

    const TARGET_BIT_LENGTH = 17 * 6
    const codeCharacters = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわがぎぐげござじずぜぞだぢづでどばびぶべぼ'
    const nameCharacters = '　あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわがぎぐげござじずぜぞだぢづでどばびぶべぼ'

    function getBytesFromSpellCode(code: string, method: EncodingMethod = EncodingMethod.Raw) {
        // No matter what, we need the raw values extracted from the string
        const rawBytes = [] as number[]
        for (const char of code) {
            const index = codeCharacters.indexOf(char)
            if (index !== -1) {
                rawBytes.push(index)
            }
        }

        // Determine our final values based on the specified method
        switch (method) {
            // Pure index values within our sorted character set
            case EncodingMethod.Raw: {
                return rawBytes
            }
            // Original encoding method was based on differences between
            // positions rather than the values at the positions themselves
            // https://qiita.com/yoshi389111/items/29ade2f62483e9c095d9
            // https://github.com/yoshi389111/dq1pswd
            case EncodingMethod.DQ1: {
                if (rawBytes[0] === undefined) {
                    return rawBytes
                }

                const bytes = [] as number[]
                // Calculate the difference from the previous value (or 0) and
                // subtract 4, adjusting for negative values in a way that makes
                // ense for our 6-bit character set
                for (let i = 0; i < rawBytes.length; i++) {
                    const lastByte = rawBytes[i - 1] || 0
                    const thisByte = rawBytes[i] as number
                    const diff = 0x3f & (thisByte - lastByte - 4)

                    bytes.push(diff)
                }

                return bytes
            }
        }
    }

    function getBinaryStringFromSpellCode(code: string, method: EncodingMethod = EncodingMethod.Raw) {
        const strings = [] as string[]
        for (const byte of getBytesFromSpellCode(code, method)) {
            strings.push(byte.toString(2).padStart(6,'0'))
        }

        return strings.join(' ')
    }

    function getBitsFromSpellCode(code: string, method: EncodingMethod = EncodingMethod.Raw) {
        // Get a binary string first, removing spaces
        const stringVersion = getBinaryStringFromSpellCode(code, method).replace(/\s+/g,'')

        // Make our bit array from the numeric version of each character
        const bits = [] as number[]
        for (const char of stringVersion) {
            bits.push(parseInt(char))
        }

        return bits
    }

    function serialize() {
        const parts = {
            gameStates: serializeGameStates(),
            spells: serializeSpells(),
        }

        return JSON.stringify(parts)
    }

    function deserialize(json: string) {
        const parts = JSON.parse(json) as {
            gameStates: string
            spells: string
        }

        deserializeGameStates(parts.gameStates)
        deserializeSpells(parts.spells)
    }

    return {
        gameStates,
        addGameState,
        removeGameState,
        spells,
        addSpell,
        removeSpell,
        TARGET_BIT_LENGTH,
        codeCharacters,
        nameCharacters,
        getBinaryStringFromSpellCode,
        getBitsFromSpellCode,
        serialize,
        deserialize,
    }
})
