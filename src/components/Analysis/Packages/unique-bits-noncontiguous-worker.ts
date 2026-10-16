export interface InboundMessage {
    seedStart: number
    seedEnd: number
    spellBits: number[][]
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

    // WIP: Fixed logic for 6 bits
    for (let i = message.seedStart; i < message.seedEnd; i++) {
        // Capture our expected progress level at the completion of this cycle
        const nextProgress = (1.0 + i - message.seedStart) / (message.seedEnd - message.seedStart)

        for (let j = i + 1; j < 1 + message.TARGET_BIT_LENGTH - (6 - 1); j++) {
            for (let k = j + 1; k < 1 + message.TARGET_BIT_LENGTH - (6 - 2); k++) {
                for (let l = k + 1; l < 1 + message.TARGET_BIT_LENGTH - (6 - 3); l++) {
                    for (let m = l + 1; m < 1 + message.TARGET_BIT_LENGTH - (6 - 4); m++) {
                        for (let n = m + 1; n < 1 + message.TARGET_BIT_LENGTH - (6 - 5); n++) {
                            const positions = [i,j,k,l,m,n]

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
                                continue
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
                        }
                    }
                }
            }

            // We send progress from this level since most/all of the parent
            // level will immediately jump to 100% and nothing else. Because the
            // worker can handle more than one seed though, we have to multiply
            // this inner value by the outer value to get an accurate number.
            const innerProgress = (1.0 + j - (i + 1)) / (1 + message.TARGET_BIT_LENGTH - (6 - 1) - (i + 1))
            sendProgress(innerProgress * nextProgress)
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
