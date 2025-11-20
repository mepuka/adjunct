import { useAtomValue } from '@effect-atom/atom-react'
import { graphAtom, selectedNodeAtom } from '../state/atoms'
import * as EG from '@adjunct/core/EffectGraph'
import * as Option from 'effect/Option'
import './NodeInspector.css'

/**
 * Node Inspector Component
 *
 * Displays detailed information about the selected node.
 */
export function NodeInspector() {
  const graph = useAtomValue(graphAtom)
  const selection = useAtomValue(selectedNodeAtom)

  if (!graph || !selection.nodeId) {
    return (
      <div className="panel node-inspector-panel empty">
        <div className="panel-header">
          <h2 className="panel-title">Node Inspector</h2>
        </div>
        <div className="inspector-empty">
          <div className="inspector-empty-icon">🔍</div>
          <p>Select a node to inspect</p>
        </div>
      </div>
    )
  }

  const nodeOption = EG.getNode(graph, selection.nodeId)

  if (Option.isNone(nodeOption)) {
    return null
  }

  const node = Option.getOrThrow(nodeOption)
  const children = EG.getChildren(graph, node.id)

  return (
    <div className="panel node-inspector-panel">
      <div className="panel-header">
        <h2 className="panel-title">Node Inspector</h2>
        <span className="badge badge-functor">Active</span>
      </div>

      <div className="inspector-section">
        <div className="inspector-label">Node ID</div>
        <div className="inspector-value mono">{node.id.slice(0, 8)}...</div>
      </div>

      <div className="inspector-section">
        <div className="inspector-label">Data</div>
        <div className="inspector-value text">{node.data}</div>
      </div>

      <div className="inspector-section">
        <div className="inspector-label">Operation</div>
        <div className="inspector-value">
          {Option.match(node.metadata.operation, {
            onNone: () => <span className="inspector-none">root</span>,
            onSome: (op) => <span className="badge badge-operation">{op}</span>
          })}
        </div>
      </div>

      <div className="inspector-section">
        <div className="inspector-label">Metadata</div>
        <div className="inspector-metadata">
          <div className="metadata-row">
            <span className="metadata-key">Depth</span>
            <span className="metadata-value">{node.metadata.depth}</span>
          </div>
          <div className="metadata-row">
            <span className="metadata-key">Children</span>
            <span className="metadata-value">{children.length}</span>
          </div>
          <div className="metadata-row">
            <span className="metadata-key">Parent</span>
            <span className="metadata-value">
              {Option.match(node.parentId, {
                onNone: () => 'none',
                onSome: (id) => id.slice(0, 8) + '...'
              })}
            </span>
          </div>
        </div>
      </div>

      {children.length > 0 && (
        <div className="inspector-section">
          <div className="inspector-label">Children ({children.length})</div>
          <div className="children-list">
            {children.slice(0, 5).map((child) => (
              <div key={child.id} className="child-item">
                <span className="child-text">{child.data}</span>
              </div>
            ))}
            {children.length > 5 && (
              <div className="child-item more">
                +{children.length - 5} more
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
