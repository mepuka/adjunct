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
}

/**
 * Graph Visualization Component
 *
 * Renders the graph as a DAG with nodes positioned by depth.
 * Emphasizes the functor/morphism view of text transformations.
 */
export function GraphVisualization({ graph }: GraphVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [nodePositions, setNodePositions] = useState<NodePosition[]>([])
  const [hoveredNode, setHoveredNode] = useState<EG.NodeId | null>(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const selectNode = useAtomSet(selectedNodeAtom)

  // Calculate node positions based on graph structure
  useEffect(() => {
    if (!graph) return

    const nodes = EG.toArray(graph)
    const roots = EG.getRoots(graph)

    // Group nodes by depth
    const nodesByLevel = new Map<number, EG.GraphNode<string>[]>()
    nodes.forEach(node => {
      const level = node.metadata.depth
      if (!nodesByLevel.has(level)) {
        nodesByLevel.set(level, [])
      }
      nodesByLevel.get(level)!.push(node)
    })

    const maxLevel = Math.max(...Array.from(nodesByLevel.keys()))
    const nodeSize = 120
    const horizontalSpacing = 150
    const verticalSpacing = 120
    const padding = 50

    // Calculate positions
    const positions: NodePosition[] = []
    nodesByLevel.forEach((levelNodes, level) => {
      const y = padding + level * verticalSpacing
      const levelWidth = levelNodes.length * horizontalSpacing
      const startX = padding

      levelNodes.forEach((node, index) => {
        const x = startX + index * horizontalSpacing + (index * 20) // Add some jitter
        positions.push({
          id: node.id,
          x,
          y,
          level
        })
      })
    })

    setNodePositions(positions)

    // Update canvas dimensions based on content
    const maxX = Math.max(...positions.map(p => p.x)) + nodeSize + padding
    const maxY = Math.max(...positions.map(p => p.y)) + nodeSize + padding
    setDimensions({
      width: Math.max(maxX, 800),
      height: Math.max(maxY, 600)
    })
  }, [graph])

  // Draw the graph
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || nodePositions.length === 0) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    canvas.width = dimensions.width
    canvas.height = dimensions.height

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const nodeRadius = 40
    const nodes = EG.toArray(graph)

    // Draw edges first (so they appear below nodes)
    ctx.strokeStyle = '#39bae6'
    ctx.lineWidth = 2
    nodes.forEach(node => {
      const children = EG.getChildren(graph, node.id)
      const nodePos = nodePositions.find(p => p.id === node.id)
      if (!nodePos) return

      children.forEach(child => {
        const childPos = nodePositions.find(p => p.id === child.id)
        if (!childPos) return

        // Draw edge with arrow
        ctx.beginPath()
        ctx.moveTo(nodePos.x, nodePos.y + nodeRadius)

        // Control point for curve
        const cpX = (nodePos.x + childPos.x) / 2
        const cpY = (nodePos.y + childPos.y) / 2

        ctx.quadraticCurveTo(cpX, cpY, childPos.x, childPos.y - nodeRadius)
        ctx.stroke()

        // Draw arrowhead
        const angle = Math.atan2(childPos.y - cpY, childPos.x - cpX)
        const arrowSize = 8
        ctx.beginPath()
        ctx.moveTo(childPos.x, childPos.y - nodeRadius)
        ctx.lineTo(
          childPos.x - arrowSize * Math.cos(angle - Math.PI / 6),
          childPos.y - nodeRadius - arrowSize * Math.sin(angle - Math.PI / 6)
        )
        ctx.lineTo(
          childPos.x - arrowSize * Math.cos(angle + Math.PI / 6),
          childPos.y - nodeRadius - arrowSize * Math.sin(angle + Math.PI / 6)
        )
        ctx.closePath()
        ctx.fillStyle = '#39bae6'
        ctx.fill()
      })
    })

    // Draw nodes
    nodes.forEach(node => {
      const pos = nodePositions.find(p => p.id === node.id)
      if (!pos) return

      const isHovered = hoveredNode === node.id
      const isRoot = node.parentId._tag === "None"

      // Node circle
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, nodeRadius, 0, Math.PI * 2)

      // Fill based on operation type
      if (isRoot) {
        ctx.fillStyle = 'rgba(212, 191, 255, 0.2)'
        ctx.strokeStyle = '#d4bfff'
      } else {
        const operation = node.metadata.operation._tag === "Some" ? node.metadata.operation.value : ''
        if (operation === 'sentencize') {
          ctx.fillStyle = 'rgba(57, 186, 230, 0.2)'
          ctx.strokeStyle = '#39bae6'
        } else if (operation === 'tokenize') {
          ctx.fillStyle = 'rgba(127, 217, 98, 0.2)'
          ctx.strokeStyle = '#7fd962'
        } else {
          ctx.fillStyle = 'rgba(255, 180, 84, 0.2)'
          ctx.strokeStyle = '#ffb454'
        }
      }

      ctx.lineWidth = isHovered ? 3 : 2
      ctx.fill()
      ctx.stroke()

      // Node label (operation)
      ctx.fillStyle = '#e6e8eb'
      ctx.font = '12px "IBM Plex Mono"'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const label = isRoot ? 'root' : (node.metadata.operation._tag === "Some" ? node.metadata.operation.value : 'transform')
      ctx.fillText(label, pos.x, pos.y - 10)

      // Node data preview
      ctx.font = '10px "IBM Plex Mono"'
      ctx.fillStyle = '#acb6bf'
      const preview = node.data.length > 15 ? node.data.slice(0, 15) + '...' : node.data
      ctx.fillText(preview, pos.x, pos.y + 10)

      // Depth indicator
      ctx.fillStyle = '#6c7680'
      ctx.font = '10px "IBM Plex Mono"'
      ctx.fillText(`L${node.metadata.depth}`, pos.x, pos.y + 25)
    })
  }, [graph, nodePositions, hoveredNode, dimensions])

  // Handle mouse interactions
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const nodeRadius = 40
    let found = false

    for (const pos of nodePositions) {
      const dx = x - pos.x
      const dy = y - pos.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      if (distance <= nodeRadius) {
        setHoveredNode(pos.id)
        canvas.style.cursor = 'pointer'
        found = true
        break
      }
    }

    if (!found) {
      setHoveredNode(null)
      canvas.style.cursor = 'default'
    }
  }

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (hoveredNode) {
      selectNode({ nodeId: hoveredNode, path: [] })
    }
  }

  return (
    <div className="graph-visualization" ref={containerRef}>
      <div className="graph-canvas-container">
        <canvas
          ref={canvasRef}
          className="graph-canvas"
          onMouseMove={handleMouseMove}
          onClick={handleClick}
        />
      </div>
      <div className="graph-legend">
        <div className="legend-item">
          <div className="legend-color" style={{ background: 'rgba(212, 191, 255, 0.2)', borderColor: '#d4bfff' }}></div>
          <span>Root</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ background: 'rgba(57, 186, 230, 0.2)', borderColor: '#39bae6' }}></div>
          <span>Sentencize</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ background: 'rgba(127, 217, 98, 0.2)', borderColor: '#7fd962' }}></div>
          <span>Tokenize</span>
        </div>
      </div>
    </div>
  )
}
