'use client'

import { useState, useCallback } from 'react'
import ProgressToast from '@/components/ProgressToast'
import ConfirmDialog from '@/components/ConfirmDialog'
import { AnimatedBackground } from '@/components/ui/SharedComponents'
import { AppIcon } from '@/components/ui/icons'
import { useTranslations } from 'next-intl'
import { WorkspaceProvider } from './WorkspaceProvider'
import WorkspaceRunStreamConsoles from './components/WorkspaceRunStreamConsoles'
import WorkspaceStageContent from './components/WorkspaceStageContent'
import WorkspaceAssetLibraryModal from './components/WorkspaceAssetLibraryModal'
import WorkspaceHeaderShell from './components/WorkspaceHeaderShell'
import { AgentPipelineDashboard } from './components/agent-pipeline/AgentPipelineDashboard'
import { AgentModeToggle } from './components/agent-pipeline/AgentModeToggle'
import { WorkflowCanvas } from './components/agent-pipeline/WorkflowCanvas'
import { NodeDetailPanel } from './components/agent-pipeline/NodeDetailPanel'
import { CanvasViewNav, type CanvasView } from './components/agent-pipeline/views/CanvasViewNav'
import { CharacterAssetsView } from './components/agent-pipeline/views/CharacterAssetsView'
import { ScriptOutputView } from './components/agent-pipeline/views/ScriptOutputView'
import { StoryboardOutputView } from './components/agent-pipeline/views/StoryboardOutputView'
import { AssemblyOutputView } from './components/agent-pipeline/views/AssemblyOutputView'
import { usePipelineStatus } from './hooks/usePipelineStatus'
import { getAgentByStepKey } from '@/lib/agent-pipeline/agent-identities'
import { WorkspaceStageRuntimeProvider } from './WorkspaceStageRuntimeContext'
import { useNovelPromotionWorkspaceController } from './hooks/useNovelPromotionWorkspaceController'
import { VideoEditorStage } from '@/features/video-editor'
import type { VideoEditorProject } from '@/features/video-editor'
import type { NovelPromotionWorkspaceProps } from './types'
import '@/styles/animations.css'

function NovelPromotionWorkspaceContent(props: NovelPromotionWorkspaceProps) {
  const vm = useNovelPromotionWorkspaceController(props)
  const tProgress = useTranslations('progress')
  const [isAgentMode, setIsAgentMode] = useState(true)
  const [pipelineRunId, setPipelineRunId] = useState<string | null>(null)
  const [editorProject, setEditorProject] = useState<VideoEditorProject | null>(null)
  const [isPipelineCollapsed, setIsPipelineCollapsed] = useState(false)

  const [selectedNodeKey, setSelectedNodeKey] = useState<string | null>(null)
  const [canvasView, setCanvasView] = useState<CanvasView>('overview')

  const handleCanvasViewChange = useCallback((view: CanvasView) => {
    setCanvasView(view)
    if (view !== 'overview') {
      setSelectedNodeKey(null)
    }
  }, [])

  const { data: pipelineData } = usePipelineStatus(props.projectId, isAgentMode)
  const pipelineActive = pipelineData?.exists === true &&
    (pipelineData.status === 'running' || pipelineData.status === 'paused' || pipelineData.status === 'review')
  const hasCompletedOnce = pipelineData?.status === 'completed' || pipelineData?.status === 'failed'

  const {
    project,
    projectId,
    episodeId,
    episodes = [],
    onEpisodeSelect,
    onEpisodeCreate,
    onEpisodeRename,
    onEpisodeDelete,
  } = props

  const handleToggleMode = useCallback(() => {
    setIsAgentMode((v) => !v)
  }, [])

  const storyToScriptStream = vm.execution.storyToScriptStream
  const scriptToStoryboardStream = vm.execution.scriptToStoryboardStream
  const storyToScriptActive =
    storyToScriptStream.isRunning ||
    storyToScriptStream.isRecoveredRunning ||
    storyToScriptStream.status === 'running'
  const scriptToStoryboardActive =
    scriptToStoryboardStream.isRunning ||
    scriptToStoryboardStream.isRecoveredRunning ||
    scriptToStoryboardStream.status === 'running'

  const showStoryToScriptMinBadge =
    storyToScriptStream.isVisible &&
    storyToScriptStream.stages.length > 0 &&
    storyToScriptActive &&
    vm.execution.storyToScriptConsoleMinimized

  const showScriptToStoryboardMinBadge =
    scriptToStoryboardStream.isVisible &&
    scriptToStoryboardStream.stages.length > 0 &&
    scriptToStoryboardActive &&
    vm.execution.scriptToStoryboardConsoleMinimized

  const runBadges: { id: string; label: string; onClick: () => void }[] = []

  if (showStoryToScriptMinBadge) {
    runBadges.push({
      id: 'story-to-script',
      label: tProgress('runConsole.storyToScriptRunning'),
      onClick: () => vm.execution.setStoryToScriptConsoleMinimized(false),
    })
  }

  if (showScriptToStoryboardMinBadge) {
    runBadges.push({
      id: 'script-to-storyboard',
      label: tProgress('runConsole.scriptToStoryboardRunning'),
      onClick: () => vm.execution.setScriptToStoryboardConsoleMinimized(false),
    })
  }

  if (!vm.project.projectData) {
    return <div className="text-center text-(--glass-text-secondary)">{vm.i18n.tc('loading')}</div>
  }

  // Editor view - full screen
  if (editorProject) {
    return (
      <div>
        <AnimatedBackground />
        <VideoEditorStage
          projectId={projectId}
          episodeId={episodeId ?? ''}
          initialProject={editorProject}
          onBack={() => setEditorProject(null)}
        />
      </div>
    )
  }

  return (
    <div>
      <AnimatedBackground />

      <WorkspaceHeaderShell
        isSettingsModalOpen={vm.ui.isSettingsModalOpen}
        isWorldContextModalOpen={vm.ui.isWorldContextModalOpen}
        onCloseSettingsModal={() => vm.ui.setIsSettingsModalOpen(false)}
        onCloseWorldContextModal={() => vm.ui.setIsWorldContextModalOpen(false)}
        availableModels={vm.ui.userModelsForSettings || undefined}
        modelsLoaded={vm.ui.userModelsLoaded}
        artStyle={vm.project.artStyle}
        analysisModel={vm.project.analysisModel}
        characterModel={vm.project.characterModel}
        locationModel={vm.project.locationModel}
        storyboardModel={vm.project.storyboardModel}
        editModel={vm.project.editModel}
        videoModel={vm.project.videoModel}
        audioModel={vm.project.audioModel}
        capabilityOverrides={vm.project.capabilityOverrides}
        videoRatio={vm.project.videoRatio}
        ttsRate={vm.project.ttsRate !== undefined && vm.project.ttsRate !== null ? String(vm.project.ttsRate) : undefined}
        onUpdateConfig={vm.actions.handleUpdateConfig}
        globalAssetText={vm.project.globalAssetText}
        projectName={project.name}
        episodes={episodes}
        currentEpisodeId={episodeId}
        onEpisodeSelect={onEpisodeSelect}
        onEpisodeCreate={onEpisodeCreate}
        onEpisodeRename={onEpisodeRename}
        onEpisodeDelete={onEpisodeDelete}
        capsuleNavItems={vm.stageNav.capsuleNavItems}
        currentStage={vm.stageNav.currentStage}
        onStageChange={vm.stageNav.handleStageChange}
        projectId={projectId}
        episodeId={episodeId}
        onOpenAssetLibrary={() => vm.ui.openAssetLibrary()}
        onOpenSettingsModal={() => vm.ui.setIsSettingsModalOpen(true)}
        onRefresh={() => vm.ui.onRefresh({ mode: 'full' })}
        assetLibraryLabel={vm.i18n.t('buttons.assetLibrary')}
        settingsLabel={vm.i18n.t('buttons.settings')}
        refreshTitle={vm.i18n.t('buttons.refreshData')}
        headerSlot={
          <AgentModeToggle
            isAgentMode={isAgentMode}
            onToggle={handleToggleMode}
            pipelineActive={pipelineActive}
            hasCompletedOnce={hasCompletedOnce}
          />
        }
        hideCapsuleNav={isAgentMode}
      />

      <div className="pt-20">
        {isAgentMode ? (
          <>
            {/* Slim left control console */}
            <div
              className={`fixed left-0 top-16 bottom-0 z-20 flex transition-all duration-300 ease-in-out ${
                isPipelineCollapsed ? 'w-0' : 'w-[220px]'
              }`}
            >
              {!isPipelineCollapsed && (
                <div className="flex-1 overflow-y-auto p-3 pt-5">
                  <AgentPipelineDashboard
                    projectId={projectId}
                    episodeId={episodeId ?? ''}
                    novelText={vm.project.novelText}
                    disabled={!vm.project.novelText?.trim()}
                    pipelineRunId={pipelineRunId}
                    onStarted={setPipelineRunId}
                    onEnterEditor={async () => {
                      if (!episodeId) {
                        console.error('[Editor] No episodeId available')
                        return
                      }
                      try {
                        const res = await fetch(`/api/novel-promotion/${projectId}/editor?episodeId=${episodeId}`)
                        if (res.ok) {
                          const data = await res.json()
                          if (data.projectData) {
                            setEditorProject(typeof data.projectData === 'string' ? JSON.parse(data.projectData) : data.projectData)
                          } else {
                            console.error('[Editor] No projectData in response', data)
                          }
                        } else {
                          console.error('[Editor] Load failed:', res.status)
                        }
                      } catch (err) {
                        console.error('[Editor] Load error:', err)
                      }
                    }}
                  />
                </div>
              )}
              {/* Collapse / Expand toggle */}
              <button
                onClick={() => setIsPipelineCollapsed((v) => !v)}
                className="absolute top-4 -right-4 z-30 w-8 h-8 rounded-full bg-white/80 border border-orange-200/60 shadow-md backdrop-blur-sm flex items-center justify-center text-orange-600 hover:bg-orange-50 hover:border-orange-300 transition-all"
              >
                <AppIcon
                  name={isPipelineCollapsed ? 'chevronRight' : 'chevronLeft'}
                  className="h-4 w-4"
                />
              </button>
            </div>

            {/* Workflow Canvas / Agent Output Views */}
            <div
              className={`relative transition-all duration-300 ease-in-out h-[calc(100vh-6rem)] ${
                isPipelineCollapsed ? 'ml-4' : 'ml-[220px]'
              } ${canvasView === 'overview' && selectedNodeKey ? 'mr-[400px]' : ''}`}
              style={{ backgroundColor: '#0f1117' }}
            >
              {/* Canvas View Navigation */}
              <CanvasViewNav activeView={canvasView} onViewChange={handleCanvasViewChange} />

              {/* View content */}
              {canvasView === 'overview' ? (
                <WorkflowCanvas
                  projectId={projectId}
                  onNodeClick={(stepKey) => setSelectedNodeKey((prev) => prev === stepKey ? null : stepKey)}
                />
              ) : canvasView === 'characters' ? (
                <CharacterAssetsView projectId={projectId} />
              ) : canvasView === 'script' ? (
                <ScriptOutputView projectId={projectId} episodeId={episodeId} />
              ) : canvasView === 'storyboard' ? (
                <StoryboardOutputView projectId={projectId} episodeId={episodeId} />
              ) : canvasView === 'assembly' ? (
                <AssemblyOutputView projectId={projectId} episodeId={episodeId} />
              ) : null}
            </div>

            {/* Node Detail Panel (slides in from right, only in overview) */}
            {canvasView === 'overview' && selectedNodeKey && (
              <NodeDetailPanel
                stepKey={selectedNodeKey}
                projectId={projectId}
                step={pipelineData?.steps?.find((s) => s.stepKey === selectedNodeKey) ?? null}
                activeTask={
                  pipelineData?.currentPhase === getAgentByStepKey(selectedNodeKey)?.phaseKey
                    ? pipelineData?.activeTask
                    : null
                }
                logs={pipelineData?.logs}
                onClose={() => setSelectedNodeKey(null)}
              />
            )}
          </>
        ) : (
          <WorkspaceStageRuntimeProvider value={vm.runtime.stageRuntime}>
            <WorkspaceStageContent currentStage={vm.stageNav.currentStage} />
          </WorkspaceStageRuntimeProvider>
        )}

        <WorkspaceAssetLibraryModal
          isOpen={vm.ui.isAssetLibraryOpen}
          onClose={vm.ui.closeAssetLibrary}
          assetsLoading={vm.ui.assetsLoading}
          assetsLoadingState={vm.ui.assetsLoadingState}
          hasCharacters={vm.project.projectCharacters.length > 0}
          hasLocations={vm.project.projectLocations.length > 0}
          projectId={projectId}
          isAnalyzingAssets={vm.execution.isAssetAnalysisRunning}
          focusCharacterId={vm.ui.assetLibraryFocusCharacterId}
          focusCharacterRequestId={vm.ui.assetLibraryFocusRequestId}
          triggerGlobalAnalyze={vm.ui.triggerGlobalAnalyzeOnOpen}
          onGlobalAnalyzeComplete={() => vm.ui.setTriggerGlobalAnalyzeOnOpen(false)}
        />

        {vm.execution.showCreatingToast && (
          <ProgressToast
            show
            message={vm.i18n.t('storyInput.creating')}
            step={vm.execution.transitionProgress.step || ''}
            runBadges={runBadges}
          />
        )}

        <ConfirmDialog
          show={vm.rebuild.showRebuildConfirm}
          type="warning"
          title={vm.rebuild.rebuildConfirmTitle}
          message={vm.rebuild.rebuildConfirmMessage}
          confirmText={vm.i18n.t('rebuildConfirm.confirm')}
          cancelText={vm.i18n.t('rebuildConfirm.cancel')}
          onConfirm={vm.rebuild.handleAcceptRebuildConfirm}
          onCancel={vm.rebuild.handleCancelRebuildConfirm}
        />

        <WorkspaceRunStreamConsoles
          storyToScriptStream={vm.execution.storyToScriptStream}
          scriptToStoryboardStream={vm.execution.scriptToStoryboardStream}
          storyToScriptConsoleMinimized={vm.execution.storyToScriptConsoleMinimized}
          scriptToStoryboardConsoleMinimized={vm.execution.scriptToStoryboardConsoleMinimized}
          onStoryToScriptMinimizedChange={vm.execution.setStoryToScriptConsoleMinimized}
          onScriptToStoryboardMinimizedChange={vm.execution.setScriptToStoryboardConsoleMinimized}
          projectId={projectId}
          episodeId={episodeId}
          hideMinimizedBadges={vm.execution.showCreatingToast}
        />
      </div>
    </div>
  )
}

export default function NovelPromotionWorkspace(props: NovelPromotionWorkspaceProps) {
  const { projectId, episodeId } = props
  return (
    <WorkspaceProvider projectId={projectId} episodeId={episodeId}>
      <NovelPromotionWorkspaceContent {...props} />
    </WorkspaceProvider>
  )
}
