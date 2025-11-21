import { useEffect, useRef, useState } from 'react'
import * as EG from '@adjunct/core/EffectGraph'
import * as Option from 'effect/Option'
import { useAtomSet } from '@effect-atom/atom-react'
import { selectedNodeAtom } from '../state/atoms'
import './GraphVisualization.css'

interface GraphVisualizationProps {
  graph: EG.EffectGraph<string>
}

interface NodePosition {
  id: EG.NodeId
  x: number
  y: number
  level: number
  width: number
  height: number
}

interface Transform {
  x: number
  y: number
  scale: number
}

/**
 * Professional Graph Visualization Component
 *
 * Academic-level DAG visualization with:
 * - Hierarchical layout algorithm
 * - Zoom and pan navigation
 * - Professional typography and styling
 * - Minimap for overview
 * - Export capabilities
 */
export function GraphVisualization({ graph }: GraphVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const minimapRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [nodePositions, setNodePositions] = useState<NodePosition[]>([])
  const [hoveredNode, setHoveredNode] = useState<EG.NodeId | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<EG.NodeId | null>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const selectNode = useAtomSet(selectedNodeAtom)

  // Professional hierarchical layout algorithm
  useEffect(() => {
    if (!graph) return

    const nodes = EG.toArray(graph)
    const roots = EG.getRoots(graph)

    // Professional node dimensions
    const nodeWidth = 200
    const nodeHeight = 80
    const horizontalSpacing = 100
    const verticalSpacing = 100
    const padding = 80

    // Group nodes by depth
    const nodesByLevel = new Map<number, EG.GraphNode<string>[]>()
    nodes.forEach(node => {
      const level = node.metadata.depth
      if (!nodesByLevel.has(level)) {
        nodesByLevel.set(level, [])
      }
      nodesByLevel.get(level)!.push(node)
    })

    // Calculate positions with improved hierarchical layout
    const positions: NodePosition[] = []
    const maxLevel = Math.max(...Array.from(nodesByLevel.keys()))

    nodesByLevel.forEach((levelNodes, level) => {
      const y = padding + level * (nodeHeight + verticalSpacing)

      // Calculate total width needed for this level
      const totalWidth = levelNodes.length * (nodeWidth + horizontalSpacing) - horizontalSpacing
      const startX = padding + Math.max(0, (800 - totalWidth) / 2) // Center if possible

      levelNodes.forEach((node, index) => {
        const x = startX + index * (nodeWidth + horizontalSpacing)
        positions.push({
          id: node.id,
          x,
          y,
          level,
          width: nodeWidth,
          height: nodeHeight
        })
      })
    })

    setNodePositions(positions)

    // Update canvas dimensions based on content
    const maxX = Math.max(...positions.map(p => p.x + p.width)) + padding
    const maxY = Math.max(...positions.map(p => p.y + p.height)) + padding
    setDimensions({
      width: Math.max(maxX, 1200),
      height: Math.max(maxY, 800)
    })
  }, [graph])

  // Professional graph rendering with transform support
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || nodePositions.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size to match container
    const container = containerRef.current
    if (container) {
      canvas.width = container.clientWidth
      canvas.height = container.clientHeight
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Apply transform (zoom and pan)
    ctx.save()
    ctx.translate(transform.x, transform.y)
    ctx.scale(transform.scale, transform.scale)

    const nodes = EG.toArray(graph)

    // Professional color scheme
    const colors = {
      root: { bg: '#2a3b4c', border: '#5a7fa0', text: '#e8f0f7' },
      sentencize: { bg: '#2d3748', border: '#4a90b8', text: '#c5dff0' },
      tokenize: { bg: '#2d3a2f', border: '#5d9970', text: '#d0f0d8' },
      other: { bg: '#3a2f2d', border: '#b87e5d', text: '#f0ddd0' },
      edge: '#6a7c90',
      text: '#c5d0dc',
      textSecondary: '#8895a5',
      selected: '#4a90e2'
    }

    // Draw edges first (so they appear below nodes)
    ctx.strokeStyle = colors.edge
    ctx.lineWidth = 1.5
    nodes.forEach(node => {
      const children = EG.getChildren(graph, node.id)
      const nodePos = nodePositions.find(p => p.id === node.id)
      if (!nodePos) return

      children.forEach(child => {
        const childPos = nodePositions.find(p => p.id === child.id)
        if (!childPos) return

        // Calculate edge points (from bottom center of parent to top center of child)
        const startX = nodePos.x + nodePos.width / 2
        const startY = nodePos.y + nodePos.height
        const endX = childPos.x + childPos.width / 2
        const endY = childPos.y

        // Draw straight edge
        ctx.beginPath()
        ctx.moveTo(startX, startY)
        ctx.lineTo(endX, endY)
        ctx.stroke()

        // Draw arrowhead
        const angle = Math.atan2(endY - startY, endX - startX)
        const arrowSize = 8
        ctx.beginPath()
        ctx.moveTo(endX, endY)
        ctx.lineTo(
          endX - arrowSize * Math.cos(angle - Math.PI / 6),
          endY - arrowSize * Math.sin(angle - Math.PI / 6)
        )
        ctx.lineTo(
          endX - arrowSize * Math.cos(angle + Math.PI / 6),
          endY - arrowSize * Math.sin(angle + Math.PI / 6)
        )
        ctx.closePath()
        ctx.fillStyle = colors.edge
        ctx.fill()
      })
    })

    // Draw nodes with professional styling
    nodes.forEach(node => {
      const pos = nodePositions.find(p => p.id === node.id)
      if (!pos) return

      const isHovered = hoveredNode === node.id
      const isSelected = selectedNodeId === node.id
      const isRoot = node.parentId._tag === "None"

      // Determine node colors
      let nodeColors = colors.other
      if (isRoot) {
        nodeColors = colors.root
      } else {
        const operation = node.metadata.operation._tag === "Some" ? node.metadata.operation.value : ''
        if (operation === 'sentencize') {
          nodeColors = colors.sentencize
        } else if (operation === 'tokenize') {
          nodeColors = colors.tokenize
        }
      }

      // Draw node background (rounded rectangle)
      const borderRadius = 6
      ctx.fillStyle = nodeColors.bg
      ctx.strokeStyle = isSelected ? colors.selected : nodeColors.border
      ctx.lineWidth = isSelected ? 2.5 : (isHovered ? 2 : 1.5)

      // Rounded rectangle path
      ctx.beginPath()
      ctx.moveTo(pos.x + borderRadius, pos.y)
      ctx.lineTo(pos.x + pos.width - borderRadius, pos.y)
      ctx.quadraticCurveTo(pos.x + pos.width, pos.y, pos.x + pos.width, pos.y + borderRadius)
      ctx.lineTo(pos.x + pos.width, pos.y + pos.height - borderRadius)
      ctx.quadraticCurveTo(pos.x + pos.width, pos.y + pos.height, pos.x + pos.width - borderRadius, pos.y + pos.height)
      ctx.lineTo(pos.x + borderRadius, pos.y + pos.height)
      ctx.quadraticCurveTo(pos.x, pos.y + pos.height, pos.x, pos.y + pos.height - borderRadius)
      ctx.lineTo(pos.x, pos.y + borderRadius)
      ctx.quadraticCurveTo(pos.x, pos.y, pos.x + borderRadius, pos.y)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      // Draw node label (operation type)
      ctx.fillStyle = nodeColors.text
      ctx.font = '11px "IBM Plex Sans"'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      const label = isRoot ? 'ROOT' : (node.metadata.operation._tag === "Some" ? node.metadata.operation.value.toUpperCase() : 'TRANSFORM')
      ctx.fillText(label, pos.x + 10, pos.y + 8)

      // Draw metadata badge (depth level)
      ctx.fillStyle = colors.textSecondary
      ctx.font = '9px "IBM Plex Mono"'
      ctx.textAlign = 'right'
      ctx.fillText(`L${node.metadata.depth}`, pos.x + pos.width - 10, pos.y + 8)

      // Draw node data with proper text wrapping
      ctx.fillStyle = colors.text
      ctx.font = '12px "IBM Plex Mono"'
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'

      const maxTextWidth = pos.width - 20
      const lineHeight = 16
      let text = node.data

      // Truncate if too long
      ctx.font = '12px "IBM Plex Mono"'
      const metrics = ctx.measureText(text)
      if (metrics.width > maxTextWidth) {
        // Binary search for optimal length
        let low = 0
        let high = text.length
        while (low < high) {
          const mid = Math.floor((low + high + 1) / 2)
          const testText = text.slice(0, mid) + '...'
          if (ctx.measureText(testText).width <= maxTextWidth) {
            low = mid
          } else {
            high = mid - 1
          }
        }
        text = text.slice(0, low) + '...'
      }

      ctx.fillText(text, pos.x + 10, pos.y + 30)

      // Draw child count indicator if node has children
      const children = EG.getChildren(graph, node.id)
      if (children.length > 0) {
        ctx.fillStyle = colors.textSecondary
        ctx.font = '9px "IBM Plex Mono"'
        ctx.textAlign = 'right'
        ctx.textBaseline = 'bottom'
        ctx.fillText(`${children.length} child${children.length > 1 ? 'ren' : ''}`, pos.x + pos.width - 10, pos.y + pos.height - 8)
      }
    })

    ctx.restore()
  }, [graph, nodePositions, hoveredNode, selectedNodeId, dimensions, transform])

  // Transform screen coordinates to world coordinates
  const screenToWorld = (screenX: number, screenY: number) => {
    return {
      x: (screenX - transform.x) / transform.scale,
      y: (screenY - transform.y) / transform.scale
    }
  }

  // Handle mouse interactions with transform support
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    if (isPanning) {
      const dx = e.clientX - panStart.x
      const dy = e.clientY - panStart.y
      setTransform(prev => ({
        ...prev,
        x: prev.x + dx,
        y: prev.y + dy
      }))
      setPanStart({ x: e.clientX, y: e.clientY })
      return
    }

    const rect = canvas.getBoundingClientRect()
    const screenX = e.clientX - rect.left
    const screenY = e.clientY - rect.top
    const world = screenToWorld(screenX, screenY)

    let found = false
    for (const pos of nodePositions) {
      if (
        world.x >= pos.x &&
        world.x <= pos.x + pos.width &&
        world.y >= pos.y &&
        world.y <= pos.y + pos.height
      ) {
        setHoveredNode(pos.id)
        canvas.style.cursor = 'pointer'
        found = true
        break
      }
    }

    if (!found) {
      setHoveredNode(null)
      canvas.style.cursor = isPanning ? 'grabbing' : 'grab'
    }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    if (e.button === 0) { // Left click
      const rect = canvas.getBoundingClientRect()
      const screenX = e.clientX - rect.left
      const screenY = e.clientY - rect.top
      const world = screenToWorld(screenX, screenY)

      // Check if clicking on a node
      let clickedNode = false
      for (const pos of nodePositions) {
        if (
          world.x >= pos.x &&
          world.x <= pos.x + pos.width &&
          world.y >= pos.y &&
          world.y <= pos.y + pos.height
        ) {
          setSelectedNodeId(pos.id)
          selectNode({ nodeId: pos.id, path: [] })
          clickedNode = true
          break
        }
      }

      // If not clicking on a node, start panning
      if (!clickedNode) {
        setIsPanning(true)
        setPanStart({ x: e.clientX, y: e.clientY })
        canvas.style.cursor = 'grabbing'
      }
    }
  }

  const handleMouseUp = () => {
    setIsPanning(false)
    const canvas = canvasRef.current
    if (canvas) {
      canvas.style.cursor = 'grab'
    }
  }

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    // Zoom factor
    const zoomIntensity = 0.1
    const delta = e.deltaY > 0 ? -zoomIntensity : zoomIntensity
    const newScale = Math.min(Math.max(0.1, transform.scale + delta), 3)

    // Adjust pan to zoom towards mouse position
    const worldBefore = screenToWorld(mouseX, mouseY)
    const scaleRatio = newScale / transform.scale
    const worldAfter = {
      x: worldBefore.x,
      y: worldBefore.y
    }

    const newTransform = {
      scale: newScale,
      x: mouseX - worldAfter.x * newScale,
      y: mouseY - worldAfter.y * newScale
    }

    setTransform(newTransform)
  }

  // View controls
  const handleFitToView = () => {
    if (nodePositions.length === 0) return

    const padding = 50
    const minX = Math.min(...nodePositions.map(p => p.x))
    const maxX = Math.max(...nodePositions.map(p => p.x + p.width))
    const minY = Math.min(...nodePositions.map(p => p.y))
    const maxY = Math.max(...nodePositions.map(p => p.y + p.height))

    const graphWidth = maxX - minX + padding * 2
    const graphHeight = maxY - minY + padding * 2

    const canvas = canvasRef.current
    if (!canvas) return

    const scaleX = canvas.width / graphWidth
    const scaleY = canvas.height / graphHeight
    const scale = Math.min(scaleX, scaleY, 1)

    const centerX = (minX + maxX) / 2
    const centerY = (minY + maxY) / 2

    setTransform({
      scale,
      x: canvas.width / 2 - centerX * scale,
      y: canvas.height / 2 - centerY * scale
    })
  }

  const handleZoomIn = () => {
    setTransform(prev => ({
      ...prev,
      scale: Math.min(prev.scale + 0.1, 3)
    }))
  }

  const handleZoomOut = () => {
    setTransform(prev => ({
      ...prev,
      scale: Math.max(prev.scale - 0.1, 0.1)
    }))
  }

  const handleResetView = () => {
    setTransform({ x: 0, y: 0, scale: 1 })
  }

  return (
    <div className="graph-visualization" ref={containerRef}>
      <div className="graph-canvas-container">
        <canvas
          ref={canvasRef}
          className="graph-canvas"
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        />

        {/* View Controls */}
        <div className="view-controls">
          <button
            className="control-btn"
            onClick={handleFitToView}
            title="Fit to view"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M1.5 1.5h5v1h-5v5h-1v-5.5c0-.276.224-.5.5-.5h.5zm7 0h5.5c.276 0 .5.224.5.5v5.5h-1v-5h-5v-1zm-7 13v-5h1v5h5v1h-5.5c-.276 0-.5-.224-.5-.5v-.5zm13 0v-5h1v5.5c0 .276-.224.5-.5.5h-5.5v-1h5z"/>
            </svg>
          </button>
          <button
            className="control-btn"
            onClick={handleZoomIn}
            title="Zoom in"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1.5v13M1.5 8h13" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </button>
          <button
            className="control-btn"
            onClick={handleZoomOut}
            title="Zoom out"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M1.5 8h13" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </button>
          <button
            className="control-btn"
            onClick={handleResetView}
            title="Reset view"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM8 0a8 8 0 110 16A8 8 0 018 0zm1 8V5H7v3H4v2h3v3h2v-3h3V8z"/>
            </svg>
          </button>
          <div className="zoom-indicator">
            {Math.round(transform.scale * 100)}%
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="graph-legend">
        <div className="legend-item">
          <div className="legend-color" style={{ background: '#2a3b4c', borderColor: '#5a7fa0' }}></div>
          <span>Root Node</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ background: '#2d3748', borderColor: '#4a90b8' }}></div>
          <span>Sentencize</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ background: '#2d3a2f', borderColor: '#5d9970' }}></div>
          <span>Tokenize</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ background: '#3a2f2d', borderColor: '#b87e5d' }}></div>
          <span>Transform</span>
        </div>
      </div>
    </div>
  )
}
