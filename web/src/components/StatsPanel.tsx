import { useAtomValue } from '@effect-atom/atom-react'
import { graphStatsAtom } from '../state/atoms'
import './StatsPanel.css'

/**
 * Stats Panel Component
 *
 * Displays graph statistics and metrics.
 */
export function StatsPanel() {
  const stats = useAtomValue(graphStatsAtom)

  if (stats.nodeCount === 0) {
    return null
  }

  return (
    <div className="panel stats-panel">
      <div className="panel-header">
        <h2 className="panel-title">Graph Stats</h2>
      </div>

      <div className="stats-grid">
        <div className="stat-item">
          <div className="stat-label">Nodes</div>
          <div className="stat-value">{stats.nodeCount}</div>
        </div>

        <div className="stat-item">
          <div className="stat-label">Edges</div>
          <div className="stat-value">{stats.edgeCount}</div>
        </div>

        <div className="stat-item">
          <div className="stat-label">Depth</div>
          <div className="stat-value">{stats.depth}</div>
        </div>

        <div className="stat-item">
          <div className="stat-label">Roots</div>
          <div className="stat-value">{stats.roots}</div>
        </div>
      </div>

      <div className="stats-note">
        <div className="stats-note-label">Category</div>
        <div className="stats-note-value">Directed Acyclic Graph (DAG)</div>
      </div>
    </div>
  )
}
