export type Branch = { name: string }
export type ContentItem = {
  type: 'dir' | 'file'
  name: string
  path: string
  size?: number
}

export type GitHubConfig = {
  owner: string
  repo: string
  token?: string
}

const API_BASE = 'https://api.github.com'

function headers(token?: string) {
  const h: Record<string, string> = {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

export class GitHubApiError extends Error {
  status: number
  remaining: number
  reset: number
  constructor(message: string, status: number, remaining: number, reset: number) {
    super(message)
    this.name = 'GitHubApiError'
    this.status = status
    this.remaining = remaining
    this.reset = reset
  }
}

async function gh<T>(url: string, token?: string): Promise<{ data: T; rate?: { remaining: number; reset: number } }> {
  const res = await fetch(url, { headers: headers(token) })
  const remaining = Number(res.headers.get('x-ratelimit-remaining') || '0')
  const reset = Number(res.headers.get('x-ratelimit-reset') || '0')
  if (!res.ok) {
    const text = await res.text()
    let msg = text
    try {
      const j = JSON.parse(text)
      msg = j.message || text
    } catch {}
    throw new GitHubApiError(msg, res.status, remaining, reset)
  }
  const data = await res.json()
  return { data, rate: { remaining, reset } }
}

export async function listBranches(cfg: GitHubConfig, page = 1, per_page = 100): Promise<Branch[]> {
  const url = `${API_BASE}/repos/${cfg.owner}/${cfg.repo}/branches?per_page=${per_page}&page=${page}`
  const { data } = await gh<Branch[]>(url, cfg.token)
  return data
}

export async function listAllBranches(cfg: GitHubConfig): Promise<Branch[]> {
  const per = 100
  let page = 1
  let out: Branch[] = []
  // Paginate until less than per results returned
  while (true) {
    const chunk = await listBranches(cfg, page, per)
    out = out.concat(chunk)
    if (chunk.length < per) break
    page += 1
  }
  return out
}

export async function listContents(cfg: GitHubConfig, path = '', ref?: string): Promise<ContentItem[]> {
  const encPath = path ? `/${encodeURIComponent(path).replace(/%2F/g, '/')}` : ''
  const refQuery = ref ? `?ref=${encodeURIComponent(ref)}` : ''
  const url = `${API_BASE}/repos/${cfg.owner}/${cfg.repo}/contents${encPath}${refQuery}`
  const { data } = await gh<any[]>(url, cfg.token)
  return data.map((d) => ({ type: d.type, name: d.name, path: d.path, size: d.size }))
}

export async function getFileContent(cfg: GitHubConfig, path: string, ref?: string): Promise<{ content: string; size?: number }> {
  const encPath = `/${encodeURIComponent(path).replace(/%2F/g, '/')}`
  const refQuery = ref ? `?ref=${encodeURIComponent(ref)}` : ''
  const url = `${API_BASE}/repos/${cfg.owner}/${cfg.repo}/contents${encPath}${refQuery}`
  const { data } = await gh<any>(url, cfg.token)
  if (!data.content || data.encoding !== 'base64') throw new Error('Unexpected file content response')
  const decoded = decodeBase64(data.content)
  return { content: decoded, size: data.size }
}

export function decodeBase64(b64: string): string {
  // Handle large/base64 strings and unicode safely
  try {
    return decodeURIComponent(escape(atob(b64.replace(/\n/g, ''))))
  } catch {
    // Fallback
    return atob(b64.replace(/\n/g, ''))
  }
}

export function groupBranchName(name: string): { locale: string; version: string } {
  // Split strictly by the first '-' as requested
  const idx = name.indexOf('-')
  if (idx === -1) {
    return { locale: name.toLowerCase(), version: '' }
  }
  const locale = name.slice(0, idx).toLowerCase()
  const version = name.slice(idx + 1)
  return { locale, version }
}
