export interface BgmCategory {
    key: string
    i18nKey: string
    moods: string[]
}

export const BGM_CATEGORIES: BgmCategory[] = [
    {
        key: 'action',
        i18nKey: 'bgm.category.action',
        moods: ['tense', 'exciting', 'intense'],
    },
    {
        key: 'emotional',
        i18nKey: 'bgm.category.emotional',
        moods: ['warm', 'touching', 'sentimental'],
    },
    {
        key: 'comedy',
        i18nKey: 'bgm.category.comedy',
        moods: ['funny', 'playful', 'lighthearted'],
    },
    {
        key: 'epic',
        i18nKey: 'bgm.category.epic',
        moods: ['grand', 'heroic', 'majestic'],
    },
    {
        key: 'suspense',
        i18nKey: 'bgm.category.suspense',
        moods: ['mysterious', 'creepy', 'dark'],
    },
    {
        key: 'peaceful',
        i18nKey: 'bgm.category.peaceful',
        moods: ['calm', 'relaxing', 'gentle'],
    },
]

export const BGM_CATEGORY_KEYS = BGM_CATEGORIES.map(c => c.key)

export function getCategoryByKey(key: string): BgmCategory | undefined {
    return BGM_CATEGORIES.find(c => c.key === key)
}
