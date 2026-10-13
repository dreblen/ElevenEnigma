export enum SourceEdition {
    DS = 1,
    PS4 = 2,
    PS4_S = 3,
}

export enum RestrictionFlag {
    NoFlee = 1 << 0,
    NoBuy = 1 << 1,
    NoAccessories = 1 << 2,
    NoAction = 1 << 3,
}

export interface GameState {
    id: number
    name: string
    seq: number
}

export interface RestorationSpell {
    id: number
    code: string
    edition: SourceEdition
    characterName: string
    restrictions: number // field of RestrictionFlag
    gameStateId: number // -> GameState.id
}

export enum EncodingMethod {
    Raw = 0,
    DQ1 = 1,
}
