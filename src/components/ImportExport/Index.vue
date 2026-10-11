<script setup lang="ts">
import { computed, ref } from 'vue'

import { useDataStore } from '@/stores/data'

const data = useDataStore()

const currentState = computed(() => data.serialize())
const currentStateDataUrl = computed(() => `data:text/json;charset=UTF-8,${encodeURIComponent(currentState.value)}`)

const copyCurrentStateToClipboard = function() {
    navigator.clipboard.writeText(currentState.value)
}

const importState = ref('')
const isImportStateValid = computed(() => {
    if (importState.value.trim().length === 0) {
        return false
    }

    try {
        JSON.parse(importState.value)
        return true
    } catch {
        return false
    }
})

const onImportStateUpload = async function(ev: Event) {
    if (!ev.target || !(ev.target as HTMLInputElement).files) {
        return
    }

    const files = (ev.target as HTMLInputElement).files
    if (!files || files.length === 0) {
        return
    }

    importState.value = await (files[0] as File).text()
}
</script>

<template>
    <v-container fluid>
        <v-row>
            <v-col>
                <v-textarea
                    v-model="currentState"
                    label="Current State"
                    readonly
                >
                    <template #append>
                        <v-container>
                            <v-row>
                                <v-col class="px-0">
                                    <v-btn
                                        icon
                                        density="comfortable"
                                        @click="copyCurrentStateToClipboard"
                                    >
                                        <v-icon>mdi-content-copy</v-icon>
                                    </v-btn>
                                </v-col>
                            </v-row>
                            <v-row>
                                <v-col class="px-0">
                                    <v-btn
                                        icon
                                        density="comfortable"
                                        :href="currentStateDataUrl"
                                        target="_blank"
                                        download="ee-state.json"
                                    >
                                        <v-icon>mdi-download</v-icon>
                                    </v-btn>
                                </v-col>
                            </v-row>
                        </v-container>
                    </template>
                </v-textarea>
            </v-col>
        </v-row>
        <v-row>
            <v-col cols="12">
                <v-textarea
                    v-model="importState"
                    label="Configuration to Import"
                >
                    <template #append>
                        <v-container>
                            <v-row>
                                <v-col class="px-0">
                                    <v-btn
                                        icon
                                        density="comfortable"
                                        @click="($refs.uploadInput as HTMLInputElement).click()"
                                    >
                                        <v-icon>mdi-upload</v-icon>
                                        <input
                                            type="file"
                                            class="d-none"
                                            ref="uploadInput"
                                            @change="onImportStateUpload"
                                        />
                                    </v-btn>
                                </v-col>
                            </v-row>
                        </v-container>
                    </template>
                </v-textarea>
            </v-col>
            <v-col>
                <v-btn
                    color="primary"
                    :disabled="!isImportStateValid"
                    @click="data.deserialize(importState)"
                >
                    Apply Configuration
                </v-btn>
            </v-col>
        </v-row>
    </v-container>
</template>
