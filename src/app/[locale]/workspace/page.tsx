'use client'
import { logError as _ulogError } from '@/lib/logging/core'
import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import AppShell from '@/components/AppShell'
import ConfirmDialog from '@/components/ConfirmDialog'
import { AppIcon } from '@/components/ui/icons'
import { shouldGuideToModelSetup } from '@/lib/workspace/model-setup'
import { Link, useRouter } from '@/i18n/navigation'
import { apiFetch } from '@/lib/api-fetch'
import QuickCreateHero from './components/QuickCreateHero'
import TemplateSection from './components/TemplateSection'
import ProjectCard from './components/ProjectCard'
import type { ProjectTemplate } from '@/lib/workspace/templates'

interface ProjectStats {
  episodes: number
  images: number
  videos: number
  panels: number
  firstEpisodePreview: string | null
}

interface Project {
  id: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
  totalCost?: number
  stats?: ProjectStats
  thumbnailUrl?: string | null
}

interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

const PAGE_SIZE = 7

export default function WorkspacePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  })
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editFormData, setEditFormData] = useState({
    name: '',
    description: ''
  })
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)

  // 分页和搜索状态
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 0 })
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [modelNotConfigured, setModelNotConfigured] = useState(false)

  const t = useTranslations('workspace')
  const tc = useTranslations('common')

  // 检查用户是否已登录
  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push({ pathname: '/auth/signin' })
      return
    }
  }, [session, status, router])

  // 获取项目列表
  const fetchProjects = useCallback(async (page: number = 1, search: string = '') => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: PAGE_SIZE.toString()
      })
      if (search.trim()) {
        params.set('search', search.trim())
      }

      const response = await apiFetch(`/api/projects?${params}`)
      if (response.ok) {
        const data = await response.json()
        setProjects(data.projects)
        setPagination(data.pagination)
      }
    } catch (error) {
      _ulogError('获取项目失败:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // 初始加载和搜索/分页变化时重新获取
  useEffect(() => {
    if (session) {
      fetchProjects(pagination.page, searchQuery)
    }
  }, [session, pagination.page, searchQuery, fetchProjects])

  // 搜索处理
  const handleSearch = () => {
    setSearchQuery(searchInput)
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  // 打开新建项目弹窗并检测模型配置
  const openCreateModal = useCallback(() => {
    setShowCreateModal(true)
    void (async () => {
      try {
        const res = await apiFetch('/api/user-preference')
        if (res.ok) {
          const payload: unknown = await res.json()
          setModelNotConfigured(shouldGuideToModelSetup(payload))
        }
      } catch {
        // 忽略检测失败
      }
    })()
  }, [])

  // 分页处理
  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }))
  }

  // Quick create 成功回调
  const handleProjectCreated = () => {
    setSearchQuery('')
    setSearchInput('')
    setPagination(prev => ({ ...prev, page: 1 }))
    void fetchProjects(1, '')
  }

  // 模板选择 → 打开弹窗预填
  const handleTemplateSelect = (template: ProjectTemplate) => {
    setFormData({ name: '', description: '' })
    openCreateModal()
    // Use template nameKey to pre-fill is not practical since we need i18n,
    // just open the modal and let user fill in
    void template
  }

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    setCreateLoading(true)
    try {
      const response = await apiFetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          mode: 'novel-promotion'
        })
      })

      if (response.ok) {
        let shouldOpenModelSetup = true
        const preferenceResponse = await apiFetch('/api/user-preference')
        if (preferenceResponse.ok) {
          const preferencePayload: unknown = await preferenceResponse.json()
          shouldOpenModelSetup = shouldGuideToModelSetup(preferencePayload)
        } else {
          _ulogError('获取用户偏好失败:', { status: preferenceResponse.status })
        }

        setSearchQuery('')
        setSearchInput('')
        setPagination(prev => ({ ...prev, page: 1 }))
        void fetchProjects(1, '')
        setShowCreateModal(false)
        setFormData({ name: '', description: '' })

        if (shouldOpenModelSetup) {
          alert(t('analysisModelRequiredAfterCreate'))
          router.push({ pathname: '/profile' })
        }
      } else {
        alert(t('createFailed'))
      }
    } catch (error) {
      _ulogError('创建项目失败:', error)
      alert(t('createFailed'))
    } finally {
      setCreateLoading(false)
    }
  }

  const handleEditProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProject || !editFormData.name.trim()) return

    setCreateLoading(true)
    try {
      const response = await apiFetch(`/api/projects/${editingProject.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editFormData)
      })

      if (response.ok) {
        const data = await response.json()
        setProjects(projects.map(p => p.id === editingProject.id ? data.project : p))
        setShowEditModal(false)
        setEditingProject(null)
        setEditFormData({ name: '', description: '' })
      } else {
        alert(t('updateFailed'))
      }
    } catch {
      alert(t('updateFailed'))
    } finally {
      setCreateLoading(false)
    }
  }

  const handleDeleteProject = async () => {
    if (!projectToDelete) return

    setDeletingProjectId(projectToDelete.id)
    setShowDeleteConfirm(false)

    try {
      const response = await apiFetch(`/api/projects/${projectToDelete.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchProjects(pagination.page, searchQuery)
      } else {
        alert(t('deleteFailed'))
      }
    } catch {
      alert(t('deleteFailed'))
    } finally {
      setDeletingProjectId(null)
      setProjectToDelete(null)
    }
  }

  const openDeleteConfirm = (project: Project, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setProjectToDelete(project)
    setShowDeleteConfirm(true)
  }

  const cancelDelete = () => {
    setShowDeleteConfirm(false)
    setProjectToDelete(null)
  }

  const openEditModal = (project: Project, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setEditingProject(project)
    setEditFormData({
      name: project.name,
      description: project.description || ''
    })
    setShowEditModal(true)
  }

  if (status === 'loading' || !session) {
    return (
      <div className="glass-page min-h-screen flex items-center justify-center">
        <div className="text-[var(--glass-text-secondary)]">{tc('loading')}</div>
      </div>
    )
  }

  return (
    <AppShell>
      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-8 space-y-8">
        {/* Header */}
        <div className="cinema-fade-up flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[var(--glass-text-primary)] mb-2">{t('title')}</h1>
            <p className="text-[var(--glass-text-secondary)]">{t('subtitle')}</p>
          </div>

          {/* Search */}
          <div className="flex gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={t('searchPlaceholder')}
              className="glass-input-base w-64 px-3 py-2"
            />
            <button
              onClick={handleSearch}
              className="glass-btn-base glass-btn-primary px-4 py-2"
            >
              {t('searchButton')}
            </button>
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchInput('')
                  setSearchQuery('')
                  setPagination(prev => ({ ...prev, page: 1 }))
                }}
                className="glass-btn-base glass-btn-secondary px-4 py-2"
              >
                {t('clearButton')}
              </button>
            )}
          </div>
        </div>

        {/* Quick Create Hero */}
        <QuickCreateHero onProjectCreated={handleProjectCreated} />

        {/* Template Section */}
        <TemplateSection onSelectTemplate={handleTemplateSelect} />

        {/* Recent Projects */}
        <div className="cinema-fade-up" style={{ animationDelay: '160ms' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[var(--glass-text-primary)]">
              {t('recentProjects')}
            </h2>
            <button
              onClick={() => openCreateModal()}
              className="glass-btn-base glass-btn-soft px-3 py-1.5 text-sm"
            >
              <AppIcon name="plus" className="w-4 h-4" />
              {t('newProject')}
            </button>
          </div>

          {/* Projects Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="glass-surface p-6 animate-pulse">
                  <div className="h-4 bg-[var(--glass-bg-muted)] rounded mb-3"></div>
                  <div className="h-3 bg-[var(--glass-bg-muted)] rounded mb-2"></div>
                  <div className="h-3 bg-[var(--glass-bg-muted)] rounded w-2/3"></div>
                </div>
              ))
            ) : (
              projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  deletingProjectId={deletingProjectId}
                  onEdit={openEditModal}
                  onDelete={openDeleteConfirm}
                />
              ))
            )}
          </div>

          {/* Empty State */}
          {!loading && projects.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-[var(--glass-bg-muted)] rounded-xl flex items-center justify-center mx-auto mb-4">
                <AppIcon name="folderCards" className="w-8 h-8 text-[var(--glass-text-tertiary)]" />
              </div>
              <h3 className="text-lg font-medium text-[var(--glass-text-primary)] mb-2">
                {searchQuery ? t('noResults') : t('noProjects')}
              </h3>
              <p className="text-[var(--glass-text-secondary)] mb-6">
                {searchQuery ? t('noResultsDesc') : t('noProjectsDesc')}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => openCreateModal()}
                  className="glass-btn-base glass-btn-primary px-6 py-3"
                >
                  {t('newProject')}
                </button>
              )}
            </div>
          )}

          {/* Pagination */}
          {!loading && pagination.totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="glass-btn-base glass-btn-secondary px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <AppIcon name="chevronLeft" className="w-5 h-5" />
              </button>

              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                .filter(page => {
                  return page === 1 ||
                    page === pagination.totalPages ||
                    Math.abs(page - pagination.page) <= 2
                })
                .map((page, index, array) => (
                  <span key={page} className="flex items-center">
                    {index > 0 && array[index - 1] !== page - 1 && (
                      <span className="px-2 text-[var(--glass-text-tertiary)]">...</span>
                    )}
                    <button
                      onClick={() => handlePageChange(page)}
                      className={`glass-btn-base px-4 py-2 ${page === pagination.page
                        ? 'glass-btn-primary'
                        : 'glass-btn-secondary'
                        }`}
                    >
                      {page}
                    </button>
                  </span>
                ))}

              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="glass-btn-base glass-btn-secondary px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <AppIcon name="chevronRight" className="w-5 h-5" />
              </button>

              <span className="ml-4 text-sm text-[var(--glass-text-tertiary)]">
                {t('totalProjects', { count: pagination.total })}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 glass-overlay flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="glass-surface-modal p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-[var(--glass-text-primary)] mb-4">{t('createProject')}</h2>
            {modelNotConfigured && (
              <div className="flex items-start gap-2 mb-4 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
                <AppIcon name="alert" className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="text-[12px] leading-relaxed">
                  {t('modelNotConfigured.before')}
                  <Link
                    href={{ pathname: '/profile' }}
                    className="font-semibold underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-300 mx-0.5"
                    onClick={() => setShowCreateModal(false)}
                  >
                    {t('modelNotConfigured.link')}
                  </Link>
                  {t('modelNotConfigured.after')}
                </span>
              </div>
            )}
            <form onSubmit={handleCreateProject}>
              <div className="mb-4">
                <label htmlFor="name" className="glass-field-label block mb-2">
                  {t('projectName')} *
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="glass-input-base w-full px-3 py-2"
                  placeholder={t('projectNamePlaceholder')}
                  maxLength={100}
                  required
                  autoFocus
                />
              </div>
              <div className="mb-6">
                <label htmlFor="description" className="glass-field-label block mb-2">
                  {t('projectDescription')}
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="glass-textarea-base w-full px-3 py-2"
                  placeholder={t('projectDescriptionPlaceholder')}
                  rows={3}
                  maxLength={500}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setFormData({ name: '', description: '' })
                  }}
                  className="glass-btn-base glass-btn-secondary px-4 py-2"
                  disabled={createLoading}
                >
                  {tc('cancel')}
                </button>
                <button
                  type="submit"
                  className="glass-btn-base glass-btn-primary px-4 py-2 disabled:opacity-50"
                  disabled={createLoading || !formData.name.trim()}
                >
                  {createLoading ? t('creating') : t('createProject')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Project Modal */}
      {showEditModal && editingProject && (
        <div className="fixed inset-0 glass-overlay flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="glass-surface-modal p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-[var(--glass-text-primary)] mb-4">{t('editProject')}</h2>
            <form onSubmit={handleEditProject}>
              <div className="mb-4">
                <label htmlFor="edit-name" className="glass-field-label block mb-2">
                  {t('projectName')} *
                </label>
                <input
                  id="edit-name"
                  type="text"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="glass-input-base w-full px-3 py-2"
                  placeholder={t('projectNamePlaceholder')}
                  maxLength={100}
                  required
                />
              </div>
              <div className="mb-6">
                <label htmlFor="edit-description" className="glass-field-label block mb-2">
                  {t('projectDescription')}
                </label>
                <textarea
                  id="edit-description"
                  value={editFormData.description}
                  onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                  className="glass-textarea-base w-full px-3 py-2"
                  placeholder={t('projectDescriptionPlaceholder')}
                  rows={3}
                  maxLength={500}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingProject(null)
                    setEditFormData({ name: '', description: '' })
                  }}
                  className="glass-btn-base glass-btn-secondary px-4 py-2"
                  disabled={createLoading}
                >
                  {tc('cancel')}
                </button>
                <button
                  type="submit"
                  className="glass-btn-base glass-btn-primary px-4 py-2 disabled:opacity-50"
                  disabled={createLoading || !editFormData.name.trim()}
                >
                  {createLoading ? t('saving') : tc('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        show={showDeleteConfirm}
        title={t('deleteProject')}
        message={t('deleteConfirm', { name: projectToDelete?.name || '' })}
        confirmText={tc('delete')}
        cancelText={tc('cancel')}
        type="danger"
        onConfirm={handleDeleteProject}
        onCancel={cancelDelete}
      />
    </AppShell>
  )
}
