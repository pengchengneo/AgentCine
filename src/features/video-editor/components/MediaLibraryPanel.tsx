'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'

interface BgmItem {
    id: string
    name: string
    category: string
    mood: string
    duration: number
    audioUrl: string
}

interface MediaLibraryPanelProps {
    onAddBgm: (bgm: { src: string; startFrame: number; durationInFrames: number; volume: number; fadeIn: number; fadeOut: number }) => void
    fps: number
    totalFrames: number
}

export function MediaLibraryPanel({ onAddBgm, fps, totalFrames }: MediaLibraryPanelProps) {
    const t = useTranslations('video')
    const [leftTab, setLeftTab] = useState<'clips' | 'bgm'>('clips')
    const [bgmList, setBgmList] = useState<BgmItem[]>([])
    const [bgmLoading, setBgmLoading] = useState(false)
    const [bgmCategory, setBgmCategory] = useState<string>('')
    const bgmAudioRef = useRef<HTMLAudioElement | null>(null)
    const [playingBgmId, setPlayingBgmId] = useState<string | null>(null)

    const fetchBgm = useCallback(async (category?: string) => {
        setBgmLoading(true)
        try {
            const params = new URLSearchParams()
            if (category) params.set('category', category)
            const res = await fetch(`/api/bgm?${params}`)
            const data = await res.json()
            setBgmList(data.bgmAssets || [])
        } catch {
            setBgmList([])
        } finally {
            setBgmLoading(false)
        }
    }, [])

    useEffect(() => {
        if (leftTab === 'bgm') {
            fetchBgm(bgmCategory || undefined)
        }
    }, [leftTab, bgmCategory, fetchBgm])

    const handleBgmPreview = (bgm: BgmItem) => {
        if (playingBgmId === bgm.id) {
            bgmAudioRef.current?.pause()
            setPlayingBgmId(null)
            return
        }
        if (bgmAudioRef.current) {
            bgmAudioRef.current.pause()
        }
        const audio = new Audio(bgm.audioUrl)
        audio.onended = () => setPlayingBgmId(null)
        audio.play()
        bgmAudioRef.current = audio
        setPlayingBgmId(bgm.id)
    }

    const handleAddBgmToTrack = (bgm: BgmItem) => {
        onAddBgm({
            src: bgm.audioUrl,
            startFrame: 0,
            durationInFrames: Math.min(bgm.duration * fps, totalFrames || bgm.duration * fps),
            volume: 0.5,
            fadeIn: 30,
            fadeOut: 30,
        })
    }

    const bgmCategories = [
        { key: '', label: t('editor.left.bgmAll') },
        { key: 'action', label: 'Action' },
        { key: 'emotional', label: 'Emotional' },
        { key: 'comedy', label: 'Comedy' },
        { key: 'epic', label: 'Epic' },
        { key: 'suspense', label: 'Suspense' },
        { key: 'peaceful', label: 'Peaceful' },
    ]

    return (
        <div style={{
            width: '220px',
            borderRight: '1px solid var(--glass-stroke-base)',
            background: 'var(--glass-bg-surface-strong)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
        }}>
            {/* Tabs */}
            <div style={{
                display: 'flex',
                borderBottom: '1px solid var(--glass-stroke-base)',
            }}>
                {(['clips', 'bgm'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setLeftTab(tab)}
                        style={{
                            flex: 1,
                            padding: '10px 8px',
                            fontSize: '12px',
                            fontWeight: leftTab === tab ? 600 : 400,
                            color: leftTab === tab ? 'var(--glass-accent-from)' : 'var(--glass-text-secondary)',
                            background: 'transparent',
                            border: 'none',
                            borderBottom: leftTab === tab ? '2px solid var(--glass-accent-from)' : '2px solid transparent',
                            cursor: 'pointer',
                        }}
                    >
                        {tab === 'clips' ? t('editor.left.tabClips') : t('editor.left.tabBgm')}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                {leftTab === 'clips' ? (
                    <p style={{ fontSize: '12px', color: 'var(--glass-text-tertiary)' }}>
                        {t('editor.left.description')}
                    </p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {/* Category filter */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                            {bgmCategories.map(cat => (
                                <button
                                    key={cat.key}
                                    onClick={() => setBgmCategory(cat.key)}
                                    style={{
                                        padding: '3px 8px',
                                        fontSize: '10px',
                                        borderRadius: '10px',
                                        border: '1px solid var(--glass-stroke-base)',
                                        background: bgmCategory === cat.key ? 'var(--glass-accent-from)' : 'transparent',
                                        color: bgmCategory === cat.key ? 'var(--glass-text-on-accent)' : 'var(--glass-text-secondary)',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>

                        {bgmLoading ? (
                            <p style={{ fontSize: '12px', color: 'var(--glass-text-tertiary)' }}>
                                {t('editor.left.bgmLoading')}
                            </p>
                        ) : bgmList.length === 0 ? (
                            <p style={{ fontSize: '12px', color: 'var(--glass-text-tertiary)' }}>
                                {t('editor.left.bgmEmpty')}
                            </p>
                        ) : (
                            bgmList.map(bgm => (
                                <div
                                    key={bgm.id}
                                    style={{
                                        padding: '8px',
                                        background: 'var(--glass-bg-surface)',
                                        borderRadius: '6px',
                                        border: '1px solid var(--glass-stroke-base)',
                                        fontSize: '11px',
                                    }}
                                >
                                    <div style={{ fontWeight: 500, marginBottom: '4px', color: 'var(--glass-text-primary)' }}>
                                        {bgm.name}
                                    </div>
                                    <div style={{ color: 'var(--glass-text-tertiary)', marginBottom: '6px' }}>
                                        {bgm.category} · {bgm.mood} · {bgm.duration}s
                                    </div>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <button
                                            onClick={() => handleBgmPreview(bgm)}
                                            className="glass-btn-base glass-btn-ghost px-2 py-1"
                                            style={{ fontSize: '10px' }}
                                        >
                                            <AppIcon name={playingBgmId === bgm.id ? 'pause' : 'play'} className="w-3 h-3" />
                                            <span style={{ marginLeft: '2px' }}>{t('editor.left.bgmPreview')}</span>
                                        </button>
                                        <button
                                            onClick={() => handleAddBgmToTrack(bgm)}
                                            className="glass-btn-base glass-btn-primary px-2 py-1 text-white"
                                            style={{ fontSize: '10px' }}
                                        >
                                            {t('editor.left.bgmAddToTrack')}
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
