import { Layout } from '@components/Layout'
import { BranchExplorer } from '@components/BranchExplorer'
import { FileTree } from '@components/FileTree'
import { CodeViewer } from '@components/CodeViewer'
import { useApp } from '@context/AppContext'
import { RepoConfigForm } from '@components/RepoConfigForm'

export default function App() {
  const { selectedFile } = useApp()
  return (
    <Layout
      sidebar={
        <div className="space-y-4">
          <RepoConfigForm />
          <BranchExplorer />
          <div className="border-t pt-4">
            <FileTree />
          </div>
        </div>
      }
      main={
        <div className="h-full">
          {selectedFile ? (
            <CodeViewer />
          ) : (
            <div className="text-gray-500 h-full flex items-center justify-center">
              Select a file to view.
            </div>
          )}
        </div>
      }
    />
  )
}
