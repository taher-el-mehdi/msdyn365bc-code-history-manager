import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

export type RepoConfig = {
  owner: string
  repo: string
  token?: string
}

export type Branch = {
  name: string
}

export type ContentItem = {
  type: 'file' | 'dir'
  name: string
  path: string
  size?: number
}

export type SelectedFile = {
  path: string
  branch: string
}

export type AppState = {
  repo: RepoConfig
  setRepo: (r: RepoConfig) => void
  branches: Branch[]
  setBranches: (b: Branch[]) => void
  selectedBranch?: string
  setSelectedBranch: (b?: string) => void
  currentPath: string
  setCurrentPath: (p: string) => void
  selectedFile?: SelectedFile
  setSelectedFile: (f?: SelectedFile) => void
}

const defaultRepo: RepoConfig = {
  owner: 'StefanMaron',
  repo: 'MSDyn365BC.Code.History',
}

const AppContext = createContext<AppState | null>(null)

export const AppProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [repo, setRepo] = useState<RepoConfig>(() => {
    const fromStorage = localStorage.getItem('repoConfig')
    return fromStorage ? JSON.parse(fromStorage) : defaultRepo
  })
  const [branches, setBranches] = useState<Branch[]>([])
  const [selectedBranch, setSelectedBranch] = useState<string | undefined>(undefined)
  const [currentPath, setCurrentPath] = useState<string>('')
  const [selectedFile, setSelectedFile] = useState<SelectedFile | undefined>(undefined)

  // When switching branches (versions/waves), keep the same file path selected
  // and update its branch so viewers reload content accordingly.
  useEffect(() => {
    if (!selectedBranch) return
    if (selectedFile && selectedFile.branch !== selectedBranch) {
      setSelectedFile({ path: selectedFile.path, branch: selectedBranch })
    }
  }, [selectedBranch])

  const value = useMemo<AppState>(() => ({
    repo,
    setRepo: (r) => { localStorage.setItem('repoConfig', JSON.stringify(r)); setRepo(r) },
    branches,
    setBranches,
    selectedBranch,
    setSelectedBranch,
    currentPath,
    setCurrentPath,
    selectedFile,
    setSelectedFile,
  }), [repo, branches, selectedBranch, currentPath, selectedFile])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useApp = () => {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
