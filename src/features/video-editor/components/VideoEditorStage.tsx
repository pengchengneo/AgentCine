'use client'
import { logError as _ulogError } from '@/lib/logging/core'
import { useTranslations } from 'next-intl'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { AppIcon } from '@/components/ui/icons'
import { useEditorState } from '../hooks/useEditorState'
import { useEditorActions } from '../hooks/useEditorActions'
import { VideoEditorProject, BgmClip } from '../types/editor.types'
import { calculateTimelineDuration, framesToTime } from '../utils/time-utils'
import { RemotionPreview } from './Preview'
import { Timeline } from './Timeline'
import { TransitionPicker, TransitionType } from './TransitionPicker'

interface VideoEditorStageProps {
    projectId: string
    episodeId: string
    initialProject?: VideoEditorProject
    onBack?: () => void
}

/**
 * 视频编辑器主页面
 * 
 * 布局:
 * ┌──────────────────────────────────────────────────────────┐
 * │ Toolbar (返回 | 保存 | 导出)                              │
 * ├──────────────┬───────────────────────────────────────────┤
 * │  素材库       │       Preview (Remotion Player)           │
 * │              │                                           │
 * │              ├───────────────────────────────────────────┤
 * │              │       Properties Panel                    │
 * ├──────────────┴───────────────────────────────────────────┤
 * │                      Timeline                            │
 * └──────────────────────────────────────────────────────────┘
 */
export function VideoEditorStage({
    projectId,
    episodeId,
    initialProject,
    onBack
}: VideoEditorStageProps) {
    const t = useTranslations('video')
    const {
        project,
        timelineState,
        isDirty,
        removeClip,
        updateClip,
        reorderClips,
        addBgm,
        removeBgm,
        play,
        pause,
        seek,
        selectClip,
        setZoom,
        markSaved
    } = useEditorState({ episodeId, initialProject })

    const { saveProject, startRender, getRenderStatus } = useEditorActions({ projectId, episodeId })

    // Render status tracking
    const [renderStatus, setRenderStatus] = useState<'idle' | 'pending' | 'rendering' | 'completed' | 'failed'>('idle')
    const [renderOutputUrl, setRenderOutputUrl] = useState<string | null>(null)
    const renderPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const pollRenderStatus = useCallback(async () => {
        try {
            const data = await getRenderStatus()
            setRenderStatus(data.status || 'idle')
            if (data.outputUrl) {
                setRenderOutputUrl(data.outputUrl)
            }
            if (data.status === 'completed' || data.status === 'failed') {
                if (renderPollRef.current) {
                    clearInterval(renderPollRef.current)
                    renderPollRef.current = null
                }
            }
        } catch {
            // Ignore poll errors
        }
    }, [getRenderStatus])

    useEffect(() => {
        return () => {
            if (renderPollRef.current) {
                clearInterval(renderPollRef.current)
            }
        }
    }, [])

    const totalDuration = calculateTimelineDuration(project.timeline)
    const totalTime = framesToTime(totalDuration, project.config.fps)
    const currentTime = framesToTime(timelineState.currentFrame, project.config.fps)

    const handleSave = async () => {
        try {
            await saveProject(project)
            markSaved()
            alert(t('editor.alert.saveSuccess'))
        } catch (error) {
            _ulogError('Save failed:', error)
            alert(t('editor.alert.saveFailed'))
        }
    }

    const handleExport = async () => {
        try {
            // Save first before rendering
            await saveProject(project)
            markSaved()
            await startRender()
            setRenderStatus('pending')
            // Start polling for status
            if (renderPollRef.current) clearInterval(renderPollRef.current)
            renderPollRef.current = setInterval(pollRenderStatus, 3000)
        } catch (error) {
            _ulogError('Export failed:', error)
            alert(t('editor.alert.exportFailed'))
        }
    }

    const selectedClip = project.timeline.find(c => c.id === timelineState.selectedClipId)

    // BGM Library state
    const [leftTab, setLeftTab] = useState<'clips' | 'bgm'>('clips')
    const [bgmList, setBgmList] = useState<Array<{ id: string; name: string; category: string; mood: string; duration: number; audioUrl: string }>>([])
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

    const handleBgmPreview = (bgm: { id: string; audioUrl: string }) => {
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

    const handleAddBgmToTrack = (bgm: { id: string; audioUrl: string; duration: number }) => {
        const totalFrames = calculateTimelineDuration(project.timeline)
        addBgm({
            src: bgm.audioUrl,
            startFrame: 0,
            durationInFrames: Math.min(bgm.duration * project.config.fps, totalFrames || bgm.duration * project.config.fps),
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
        <div className="video-editor-stage" style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100vh',
            background: 'var(--glass-bg-canvas)',
            color: 'var(--glass-text-primary)'
        }}>
            {/* Toolbar */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                borderBottom: '1px solid var(--glass-stroke-base)',
                background: 'var(--glass-bg-surface)'
            }}>
                <button
                    onClick={onBack}
                    className="glass-btn-base glass-btn-secondary px-4 py-2"
                >
                    {t('editor.toolbar.back')}
                </button>

                <div style={{ flex: 1 }} />

                <span style={{ color: 'var(--glass-text-secondary)', fontSize: '14px' }}>
                    {currentTime} / {totalTime}
                </span>

                <button
                    onClick={handleSave}
                    className={`glass-btn-base px-4 py-2 ${isDirty ? 'glass-btn-primary text-white' : 'glass-btn-secondary'}`}
                >
                    {isDirty ? t('editor.toolbar.saveDirty') : t('editor.toolbar.saved')}
                </button>

                <button
                    onClick={handleExport}
                    disabled={renderStatus === 'pending' || renderStatus === 'rendering'}
                    className="glass-btn-base glass-btn-tone-success px-4 py-2 disabled:opacity-50"
                >
                    {renderStatus === 'pending' || renderStatus === 'rendering'
                        ? t('editor.toolbar.rendering')
                        : t('editor.toolbar.export')}
                </button>

                {renderStatus === 'completed' && renderOutputUrl && (
                    <a
                        href={renderOutputUrl}
                        download
                        className="glass-btn-base px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700"
                    >
                        {t('editor.toolbar.download')}
                    </a>
                )}

                {renderStatus === 'failed' && (
                    <span className="text-xs text-red-400">{t('editor.toolbar.renderFailed')}</span>
                )}
            </div>

            {/* Main Content */}
            <div style={{
                display: 'flex',
                flex: 1,
                overflow: 'hidden'
            }}>
                {/* Left Panel - Media Library */}
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

                {/* Center - Preview + Properties */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    {/* Preview */}
                    <div style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--glass-bg-muted)',
                        padding: '20px'
                    }}>
                        <RemotionPreview
                            project={project}
                            currentFrame={timelineState.currentFrame}
                            playing={timelineState.playing}
                            onFrameChange={seek}
                            onPlayingChange={(playing) => playing ? play() : pause()}
                        />
                    </div>

                    {/* Playback Controls */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '16px',
                        padding: '12px',
                        background: 'var(--glass-bg-surface-strong)',
                        borderTop: '1px solid var(--glass-stroke-base)'
                    }}>
                        <button
                            onClick={() => seek(0)}
                            className="glass-btn-base glass-btn-ghost px-3 py-1.5"
                        >
                            <AppIcon name="chevronLeft" className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => timelineState.playing ? pause() : play()}
                            style={{
                                background: 'var(--glass-accent-from)',
                                border: 'none',
                                color: 'var(--glass-text-on-accent)',
                                cursor: 'pointer',
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                fontSize: '18px'
                            }}
                        >
                            {timelineState.playing
                                ? <AppIcon name="pause" className="w-4 h-4" />
                                : <AppIcon name="play" className="w-4 h-4" />}
                        </button>
                        <button
                            onClick={() => seek(totalDuration)}
                            className="glass-btn-base glass-btn-ghost px-3 py-1.5"
                        >
                            <AppIcon name="chevronRight" className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Right Panel - Properties */}
                <div style={{
                    width: '280px',
                    borderLeft: '1px solid var(--glass-stroke-base)',
                    padding: '12px',
                    background: 'var(--glass-bg-surface-strong)',
                    overflowY: 'auto'
                }}>
                    <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--glass-text-secondary)' }}>
                        {t('editor.right.title')}
                    </h3>
                    {selectedClip ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {/* 基础信息 */}
                            <div style={{ fontSize: '12px' }}>
                                <p style={{ margin: '0 0 8px 0' }}>
                                    <span style={{ color: 'var(--glass-text-secondary)' }}>{t('editor.right.clipLabel')}</span> {selectedClip.metadata?.description || t('editor.right.clipFallback', { index: project.timeline.findIndex(c => c.id === selectedClip.id) + 1 })}
                                </p>
                                <p style={{ margin: '0 0 8px 0' }}>
                                    <span style={{ color: 'var(--glass-text-secondary)' }}>{t('editor.right.durationLabel')}</span> {framesToTime(selectedClip.durationInFrames, project.config.fps)}
                                </p>
                            </div>

                            {/* 转场设置 */}
                            <div>
                                <h4 style={{ margin: '0 0 8px 0', fontSize: '13px', color: 'var(--glass-text-secondary)' }}>
                                    {t('editor.right.transitionLabel')}
                                </h4>
                                <TransitionPicker
                                    value={(selectedClip.transition?.type as TransitionType) || 'none'}
                                    duration={selectedClip.transition?.durationInFrames || 15}
                                    onChange={(type, duration) => {
                                        updateClip(selectedClip.id, {
                                            transition: type === 'none' ? undefined : { type, durationInFrames: duration }
                                        })
                                    }}
                                />
                            </div>

                            {/* 删除按钮 */}
                            <button
                                onClick={() => {
                                    if (confirm(t('editor.right.deleteConfirm'))) {
                                        removeClip(selectedClip.id)
                                        selectClip(null)
                                    }
                                }}
                                className="glass-btn-base glass-btn-tone-danger mt-2 px-3 py-2 text-xs"
                            >
                                {t('editor.right.deleteClip')}
                            </button>
                        </div>
                    ) : (
                        <p style={{ fontSize: '12px', color: 'var(--glass-text-tertiary)' }}>
                            {t('editor.right.selectClipHint')}
                        </p>
                    )}
                </div>
            </div>

            {/* Timeline */}
            <div style={{
                height: '220px',
                borderTop: '1px solid var(--glass-stroke-base)'
            }}>
                <Timeline
                    clips={project.timeline}
                    bgmTrack={project.bgmTrack}
                    timelineState={timelineState}
                    config={project.config}
                    onReorder={reorderClips}
                    onSelectClip={selectClip}
                    onZoomChange={setZoom}
                    onSeek={seek}
                    onRemoveBgm={removeBgm}
                />
            </div>
        </div>
    )
}

export default VideoEditorStage
