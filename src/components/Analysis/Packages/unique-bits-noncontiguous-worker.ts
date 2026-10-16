export interface InboundMessage {
    seedStart: number
    seedEnd: number
    spellBits: number[][]
    targetNumBits: number
    TARGET_BIT_LENGTH: number
}

export interface OutboundProgressData {
    percentage: number
}

export interface OutboundResultData {
    positions: number[][]
}

export interface OutboundFinishData {}

export interface OutboundMessage {
    type: 'progress'|'result'|'finish'
    data: OutboundProgressData|OutboundResultData|OutboundFinishData
}

function sendProgress(percentage: number) {
    postMessage({
        type: 'progress',
        data: {
            percentage,
        },
    } as OutboundMessage)
}

function analyze(message: InboundMessage) {
    // Determine which bit positions result in unique values of the target size
    const uniqueBitPositions = [] as number[][]

    // Our evaluation logic emulates for loops of dynamic depth, since we need a
    // separate layer for each bit being considered
    interface ForLayer {
        iterator: number
        testValue: number
    }
    const forLayers = [] as ForLayer[]
    forLayers.push({
        iterator: message.seedStart,
        testValue: message.seedEnd,
    })
    while (forLayers[0] !== undefined && forLayers[0].iterator < forLayers[0].testValue) {
        // Populate downstream layers for this cycle
        for (let i = forLayers.length; i < message.targetNumBits; i++) {
            forLayers.push({
                iterator: (forLayers[i - 1] as ForLayer).iterator + 1,
                testValue: 1 + message.TARGET_BIT_LENGTH - (message.targetNumBits - i),
            })
        }

        // Capture our expected progress level at the completion of this cycle
        const nextProgress = (1.0 + forLayers[0].iterator - message.seedStart) / (message.seedEnd - message.seedStart)

        // Process each layer depth first
        for (let i = 1; i < forLayers.length; i++) {
            const layer = forLayers[i] as ForLayer

            // If we've passed our test threshold, remove this layer and any
            // below it from the list, and increase the parent layer's iterator
            if (layer.iterator >= layer.testValue) {
                while (forLayers.length > i) {
                    forLayers.pop()
                }

                const parentLayer = forLayers[i - 1]
                if (parentLayer !== undefined) {
                    // console.log('Increasing parent iterator:', i, parentLayer.iterator, parentLayer.testValue)
                    parentLayer.iterator++
                }

                // If this is the second-highest layer, send progress here since
                // the highest level will almost always jump immediately to 100%
                // and nothing else. Because the worker can handle more than one
                // seed though, we have to multiply this inner value by the
                // outer value to get an accurate number.
                if (i === 1) {
                    const innerProgress = (1.0 + layer.iterator - (forLayers[0].iterator + 1)) / (1 + message.TARGET_BIT_LENGTH - (message.targetNumBits - 1) - (forLayers[0].iterator + 1))
                    sendProgress(innerProgress * nextProgress)
                }

                // Stop processing so downstream layers can be regenerated
                break
            }

            // At the innermost layer, handle our actual analysis logic
            if (i === forLayers.length - 1) {
                const positions = forLayers.map(l => l.iterator)

                // Skip this iteration if the positions are all contiguous
                let isContiguous = true
                for (let index = 1; index < positions.length; index++) {
                    const prevPosition = positions[index - 1] as number
                    const thisPosition = positions[index] as number
                    if (thisPosition - prevPosition !== 1) {
                        isContiguous = false
                        break
                    }
                }
                if (isContiguous) {
                    layer.iterator++
                    break
                }

                // Get all sets of bits from the current positions                            
                const codeBits = new Set()
                for (const bits of message.spellBits) {
                    const buffer = [] as number[]
                    for (let index of positions) {
                        buffer.push(bits[index] as number)
                    }
                    codeBits.add(buffer.join(''))
                }

                // If the number of unique bit sets is the same as
                // the number of overall sets, then this set of
                // positions was unique
                if (codeBits.size === message.spellBits.length) {
                    uniqueBitPositions.push(positions)
                }

                layer.iterator++
            }
        }
    }

    return uniqueBitPositions
}

onmessage = async function (ev) {
    const message: InboundMessage = JSON.parse(ev.data)

    // Process the message
    const positions = analyze(message)

    // Send the final results back to the caller
    this.postMessage({
        type: 'result',
        data: {
            positions,
        }
    } as OutboundMessage)

    // With a slight delay to give time for the results to be processed, send a
    // final message indicating the thread's work is complete
    this.setTimeout(() => {
        this.postMessage({
            type: 'finish',
            data: {}
        } as OutboundMessage)
    }, 500)
}
