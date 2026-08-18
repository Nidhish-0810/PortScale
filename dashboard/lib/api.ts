const API_BASE = '/api/proxy'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('portscale_token')
}

export async function apiClient<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })

  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('portscale_token')
      document.cookie = 'portscale_token=; path=/; max-age=0'
      window.location.href = '/'
    }
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try {
      const e = await res.json()
      msg = e.detail || e.message || msg
    } catch {}
    throw new Error(msg)
  }

  if (res.status === 204 || res.headers.get('content-length') === '0') return {} as T
  return res.json()
}

export const api = {
  auth: {
    me: () => apiClient<UserInfo>('/auth/me'),
  },
  projects: {
    list: () => apiClient<Project[]>('/projects'),
    get: (id: string) => apiClient<ProjectDetail>(`/projects/${id}`),
    create: (data: CreateProjectInput) =>
      apiClient<Project>('/projects', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: { name?: string; github_branch?: string }) =>
      apiClient<Project>(`/projects/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => apiClient<void>(`/projects/${id}`, { method: 'DELETE' }),
    stats: (id: string) => apiClient<ProjectStats>(`/projects/${id}/stats`),
    redeploy: (projectId: string, branch: string) =>
      apiClient<Deployment>('/deployments', {
        method: 'POST',
        body: JSON.stringify({ project_id: projectId, branch, commit_message: 'Manual redeploy' }),
      }),
    envVars: {
      list: (projectId: string) => apiClient<EnvVar[]>(`/projects/${projectId}/env`),
      set: (projectId: string, key: string, value: string) =>
        apiClient<EnvVar>(`/projects/${projectId}/env`, {
          method: 'POST',
          body: JSON.stringify({ key, value }),
        }),
      delete: (projectId: string, key: string) =>
        apiClient<void>(`/projects/${projectId}/env/${encodeURIComponent(key)}`, { method: 'DELETE' }),
    },
  },
  deployments: {
    list: (projectId: string, page = 1) =>
      apiClient<Deployment[]>(`/projects/${projectId}/deployments?page=${page}&per_page=20`),
    listAll: (page = 1, status?: string) =>
      apiClient<Deployment[]>(`/deployments?page=${page}&per_page=20${status ? `&status=${status}` : ''}`),
    listRecent: () =>
      apiClient<Deployment[]>(`/deployments?page=1&per_page=15`),
    get: (id: string) => apiClient<Deployment>(`/deployments/${id}`),
    stop: (id: string) => apiClient<void>(`/deployments/${id}`, { method: 'DELETE' }),
    rollback: (id: string) =>
      apiClient<Deployment>(`/deployments/${id}/rollback`, { method: 'POST' }),
    containerLogs: (id: string, tail = 200) =>
      apiClient<ContainerLogs>(`/deployments/${id}/container-logs?tail=${tail}`),
  },
  github: {
    repos: (page = 1) =>
      apiClient<GithubRepo[]>(`/github/repos?page=${page}&per_page=30`),
    searchRepos: (q: string) =>
      apiClient<GithubRepo[]>(`/github/repos/search?q=${encodeURIComponent(q)}`),
    branches: (owner: string, repo: string) =>
      apiClient<{ name: string; protected: boolean }[]>(`/github/repos/${owner}/${repo}/branches`),
  },
  stats: {
    global: () => apiClient<GlobalStats>('/stats'),
  },
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserInfo {
  user_id: string
  login: string
  name: string
  email: string
  avatar_url: string
}

export interface Project {
  id: string
  name: string
  slug: string
  github_repo_url: string
  github_repo_name: string
  github_branch: string
  user_id: string
  created_at: string
  latest_deployment_status?: string
}

export interface ProjectDetail extends Project {
  deployments: Deployment[]
}

export interface CreateProjectInput {
  name: string
  github_repo_url: string
  github_repo_name: string
  github_branch: string
}

export type DeploymentStatus = 'queued' | 'building' | 'deploying' | 'live' | 'failed' | 'stopped'

export interface Deployment {
  id: string
  project_id: string
  project_name?: string
  status: DeploymentStatus
  commit_sha: string | null
  commit_message: string | null
  branch: string | null
  container_id: string | null
  url: string | null
  build_log: string | null
  build_duration_seconds: number | null
  created_at: string
  updated_at: string
  started_at: string | null
  finished_at: string | null
}

export interface GithubRepo {
  id: number
  name: string
  full_name: string
  private: boolean
  html_url: string
  default_branch: string
  description: string
  language: string
  updated_at: string
}

export interface GlobalStats {
  total_projects: number
  total_deployments: number
  live_deployments: number
  failed_deployments: number
  avg_build_time_seconds: number
  success_rate_percent: number
}

export interface ProjectStats {
  total: number
  live: number
  failed: number
  success_rate: number
  avg_build_time_seconds: number
}

export interface ContainerLogs {
  container_id: string
  container_status: string
  logs: string
  url: string | null
}

export interface EnvVar {
  id: string
  project_id: string
  key: string
  value: string
  created_at: string
}
