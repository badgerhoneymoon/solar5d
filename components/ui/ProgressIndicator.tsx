import { Progress } from './progress'

interface ProgressIndicatorProps {
  progress: number
  visible: boolean
}

export default function ProgressIndicator({ progress, visible }: ProgressIndicatorProps) {
  if (!visible) return null
  return (
    <div className="fixed top-0 left-0 w-full flex flex-col items-center z-50 pointer-events-none">
      <div className="w-1/2 mt-8">
        <Progress value={progress} />
      </div>
      <span className="mt-2 text-white text-sm drop-shadow">Loading skybox...</span>
    </div>
  )
} 