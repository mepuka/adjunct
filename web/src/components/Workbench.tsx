import { useAtomValue } from '@effect-atom/atom-react'
import { graphAtom, isProcessingAtom, errorAtom } from '../state/atoms'
import { GraphVisualization } from './GraphVisualization'
import { TextInput } from './TextInput'
import { OperationsPanel } from './OperationsPanel'
import { NodeInspector } from './NodeInspector'
import { StatsPanel } from './StatsPanel'
import './Workbench.css'

/**
 * Main Workbench Component
 *
 * Scientific workbench for visualizing text graph operations as functors.
 * Layout is optimized for viewing transformations and maintaining focus on the text.
 */
export function Workbench() {
  const graph = useAtomValue(graphAtom)
  const isProcessing = useAtomValue(isProcessingAtom)
  const error = useAtomValue(errorAtom)

  return (
    <div className="workbench">
      {/* Header */}
      <header className="workbench-header">
        <div className="workbench-title">
          <h1>Adjunct</h1>
          <span className="workbench-subtitle">Text Graph Workbench</span>
        </div>
        <div className="workbench-status">
          {isProcessing && (
            <div className="status-indicator processing">
              <span className="status-dot"></span>
              Processing...
            </div>
          )}
          {error && (
            <div className="status-indicator error">
              <span className="status-dot"></span>
              {error}
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="workbench-content">
        {/* Left Sidebar - Input & Operations */}
        <aside className="workbench-sidebar left">
          <TextInput />
          <OperationsPanel />
          <StatsPanel />
        </aside>

        {/* Center - Graph Visualization */}
        <main className="workbench-main">
          <div className="panel visualization-panel">
            <div className="panel-header">
              <h2 className="panel-title">Graph Visualization</h2>
              <div className="visualization-mode-selector">
                <span className="badge badge-functor">Functor View</span>
              </div>
            </div>
            {graph ? (
              <GraphVisualization graph={graph} />
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">📊</div>
                <h3>No Graph Generated</h3>
                <p>Apply an operation to visualize the text graph</p>
              </div>
            )}
          </div>
        </main>

        {/* Right Sidebar - Node Inspector */}
        <aside className="workbench-sidebar right">
          <NodeInspector />
        </aside>
      </div>
    </div>
  )
}
