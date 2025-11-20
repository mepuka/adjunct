/**
 * EffectGraph - A categorical approach to text processing as graph transformations
 *
 * This module models text processing operations as morphisms in a category where:
 * - Objects are nodes in a directed acyclic graph (DAG)
 * - Morphisms are operations that transform nodes, potentially creating children
 * - Composition is guaranteed to preserve the DAG property
 *
 * Key theoretical foundations:
 * - Catamorphism: Bottom-up fold over the graph structure
 * - F-Algebra: (F a → a) for defining operations
 * - Adjunction: Operations form adjoint functors between categories of nodes
 *
 * Implementation: Uses Effect's built-in Graph module internally
 */

import * as Effect from "effect/Effect"
import * as Graph from "effect/Graph"
import * as HashMap from "effect/HashMap"
import * as Option from "effect/Option"
import * as Formatter from "./Formatter.js"

// =============================================================================
// Core Data Types
// =============================================================================

/**
 * Unique identifier for graph nodes
 */
export type NodeId = string & { readonly _brand: "NodeId" }

export const NodeId = {
  make: (id: string): NodeId => id as NodeId,
  generate: (): NodeId => NodeId.make(crypto.randomUUID())
}

/**
 * A node in the directed acyclic graph containing:
 * - Unique identifier
 * - Data payload of type A
 * - Optional parent reference (for DAG structure)
 * - Metadata for tracking operations
 */
export interface GraphNode<A> {
  readonly id: NodeId
  readonly data: A
  readonly parentId: Option.Option<NodeId>
  readonly metadata: NodeMetadata
}

export interface NodeMetadata {
  readonly operation: Option.Option<string>
  readonly timestamp: number
  readonly depth: number
}

/**
 * Simple edge type for EffectGraph (we don't need edge data, just relationships)
 */
interface GraphEdge {
  readonly relation: "child"
}

/**
 * The EffectGraph represents a directed acyclic graph.
 * Internally uses Effect's Graph module with GraphNode<A> as node data.
 */
export interface EffectGraph<A> {
  readonly graph: Graph.DirectedGraph<GraphNode<A>, GraphEdge>
  readonly nodeIdToIndex: HashMap.HashMap<NodeId, Graph.NodeIndex>
  readonly indexToNodeId: HashMap.HashMap<Graph.NodeIndex, NodeId>
}

// =============================================================================
// Constructors
// =============================================================================

/**
 * Create a new GraphNode with the given data
 */
export const makeNode = <A>(
  data: A,
  parentId: Option.Option<NodeId> = Option.none(),
  operation: Option.Option<string> = Option.none()
): GraphNode<A> => ({
  id: NodeId.generate(),
  data,
  parentId,
  metadata: {
    operation,
    timestamp: Date.now(),
    depth: Option.match(parentId, {
      onNone: () => 0,
      onSome: () => 1 // Will be recalculated when added to graph
    })
  }
})

/**
 * Create an empty EffectGraph
 */
export const empty = <A>(): EffectGraph<A> => ({
  graph: Graph.directed<GraphNode<A>, GraphEdge>(),
  nodeIdToIndex: HashMap.empty(),
  indexToNodeId: HashMap.empty()
})

/**
 * Create an EffectGraph with a single root node
 */
export const singleton = <A>(data: A): EffectGraph<A> => {
  const node = makeNode(data)
  let nodeIndex: Graph.NodeIndex
  const graph = Graph.directed<GraphNode<A>, GraphEdge>((mutable) => {
    nodeIndex = Graph.addNode(mutable, node)
  })
  return {
    graph,
    nodeIdToIndex: HashMap.make([node.id, nodeIndex!]),
    indexToNodeId: HashMap.make([nodeIndex!, node.id])
  }
}

// =============================================================================
// Graph Operations
// =============================================================================

/**
 * Add a node to the graph
 * Maintains DAG invariants:
 * - Updates roots if node has no parent
 * - Recalculates depth based on parent
 */
export const addNode = <A>(
  effectGraph: EffectGraph<A>,
  node: GraphNode<A>
): EffectGraph<A> => {
  // Calculate depth based on parent
  const updatedNode = Option.match(node.parentId, {
    onNone: () => node,
    onSome: (parentId) => {
      const parentIndex = HashMap.get(effectGraph.nodeIdToIndex, parentId)
      const parentNode = Option.flatMap(parentIndex, (idx) => {
        const nodeOption = Graph.getNode(effectGraph.graph, idx)
        return Option.map(nodeOption, (n) => n)
      })
      const parentDepth = Option.match(parentNode, {
        onNone: () => 0,
        onSome: (p) => p.metadata.depth
      })
      return {
        ...node,
        metadata: {
          ...node.metadata,
          depth: parentDepth + 1
        }
      }
    }
  })

  // Add node to graph
  const newGraph = Graph.mutate(effectGraph.graph, (mutable) => {
    const nodeIndex = Graph.addNode(mutable, updatedNode)

    // Add edge from parent if exists
    Option.match(node.parentId, {
      onNone: () => {},
      onSome: (parentId) => {
        const parentIndex = HashMap.get(effectGraph.nodeIdToIndex, parentId)
        Option.match(parentIndex, {
          onNone: () => {},
          onSome: (pIdx) => {
            Graph.addEdge(mutable, pIdx, nodeIndex, { relation: "child" })
          }
        })
      }
    })
  })

  // Find the new node's index
  const newNodeIndex = Graph.findNodes(newGraph, (n) => n.id === updatedNode.id)[0]!

  // Update mappings
  const newNodeIdToIndex = HashMap.set(effectGraph.nodeIdToIndex, updatedNode.id, newNodeIndex)
  const newIndexToNodeId = HashMap.set(effectGraph.indexToNodeId, newNodeIndex, updatedNode.id)

  return {
    graph: newGraph,
    nodeIdToIndex: newNodeIdToIndex,
    indexToNodeId: newIndexToNodeId
  }
}

/**
 * Get a node by ID
 */
export const getNode = <A>(
  graph: EffectGraph<A>,
  nodeId: NodeId
): Option.Option<GraphNode<A>> => {
  const nodeIndex = HashMap.get(graph.nodeIdToIndex, nodeId)
  return Option.flatMap(nodeIndex, (idx) => Graph.getNode(graph.graph, idx))
}

/**
 * Get all children of a node
 */
export const getChildren = <A>(
  graph: EffectGraph<A>,
  nodeId: NodeId
): ReadonlyArray<GraphNode<A>> => {
  const nodeIndex = HashMap.get(graph.nodeIdToIndex, nodeId)
  return Option.match(nodeIndex, {
    onNone: () => [],
    onSome: (idx) => {
      const childIndices = Graph.neighbors(graph.graph, idx)
      return childIndices
        .map((childIdx) => Graph.getNode(graph.graph, childIdx))
        .filter(Option.isSome)
        .map((opt) => Option.getOrThrow(opt))
    }
  })
}

/**
 * Get all root nodes (nodes with no incoming edges)
 */
export const getRoots = <A>(
  graph: EffectGraph<A>
): ReadonlyArray<GraphNode<A>> => {
  const rootIndices = Array.from(
    Graph.indices(Graph.externals(graph.graph, { direction: "incoming" }))
  )
  return rootIndices
    .map((idx: Graph.NodeIndex) => Graph.getNode(graph.graph, idx))
    .filter(Option.isSome)
    .map((opt: Option.Option<GraphNode<A>>) => Option.getOrThrow(opt))
}

// =============================================================================
// Catamorphism - The fundamental fold operation
// =============================================================================

/**
 * F-Algebra: A function that collapses a structure
 * For graphs: (GraphNode<A>, [B]) → B
 * Takes a node and its already-processed children, produces a result
 */
export type GraphAlgebra<A, B> = (
  node: GraphNode<A>,
  children: ReadonlyArray<B>
) => B

/**
 * Catamorphism: Bottom-up fold over the graph structure
 *
 * This is the fundamental operation for consuming graphs.
 * It processes nodes in topological order (children before parents)
 * and applies the algebra at each step.
 *
 * Category theory: This is a catamorphism from the initial algebra
 * of the graph functor to any other algebra.
 *
 * @param graph - The graph to fold
 * @param algebra - The F-algebra defining how to combine nodes
 * @returns An Effect producing the results for all root nodes
 */
export const cata = <A, B>(
  graph: EffectGraph<A>,
  algebra: GraphAlgebra<A, B>
): Effect.Effect<ReadonlyArray<B>, never, never> => {
  const memo = new Map<NodeId, B>()

  const go = (nodeId: NodeId): Effect.Effect<B, never, never> =>
    Effect.gen(function*() {
      // Check memoization
      if (memo.has(nodeId)) {
        return memo.get(nodeId)!
      }

      const nodeOption = getNode(graph, nodeId)
      if (Option.isNone(nodeOption)) {
        throw new Error(`Node not found: ${nodeId}`)
      }
      const node = Option.getOrThrow(nodeOption)

      // Process children first (bottom-up)
      const childNodes = getChildren(graph, nodeId)
      const processedChildren = yield* Effect.all(
        childNodes.map((child: GraphNode<A>) => go(child.id))
      )

      // Apply algebra
      const result = algebra(node, processedChildren)
      memo.set(nodeId, result)

      return result
    })

  // Process all roots
  const roots = getRoots(graph)
  return Effect.all(roots.map((root: GraphNode<A>) => go(root.id)))
}

/**
 * Anamorphism: Top-down unfold creating a graph
 *
 * Dual to catamorphism. Builds a graph from a seed value.
 *
 * @param seed - Initial value
 * @param coalgebra - Function producing (data, children seeds)
 * @returns An Effect producing the constructed graph
 */
export type GraphCoalgebra<A, B> = (
  seed: B
) => Effect.Effect<readonly [A, ReadonlyArray<B>]>

export const ana = <A, B>(
  seed: B,
  coalgebra: GraphCoalgebra<A, B>
): Effect.Effect<EffectGraph<A>, never, never> =>
  Effect.gen(function*() {
    let graph = empty<A>()

    const go = (
      currentSeed: B,
      parentId: Option.Option<NodeId>
    ): Effect.Effect<NodeId, never, never> =>
      Effect.gen(function*() {
        const [data, childSeeds] = yield* coalgebra(currentSeed)
        const node = makeNode(data, parentId)
        graph = addNode(graph, node)

        // Process children
        yield* Effect.all(
          childSeeds.map((childSeed: B) => go(childSeed, Option.some(node.id)))
        )

        return node.id
      })

    yield* go(seed, Option.none())
    return graph
  })

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Map over all nodes in the graph, preserving structure
 * This is the Functor instance for EffectGraph
 */
export const map = <A, B>(
  graph: EffectGraph<A>,
  f: (a: A) => B
): EffectGraph<B> => {
  // Rebuild graph with mapped nodes, preserving structure
  const nodeMap = new Map<NodeId, Graph.NodeIndex>()
  const indexMap = new Map<Graph.NodeIndex, Graph.NodeIndex>()
  const newGraph = Graph.directed<GraphNode<B>, GraphEdge>((mutable) => {
    // First, add all nodes with mapped data and track index mapping
    for (const [oldIdx, node] of Graph.nodes(graph.graph)) {
      const mappedNode: GraphNode<B> = {
        ...node,
        data: f(node.data)
      }
      const newIdx = Graph.addNode(mutable, mappedNode)
      nodeMap.set(node.id, newIdx)
      indexMap.set(oldIdx, newIdx)
    }

    // Then, add all edges using the new indices
    for (const edgeIdx of Graph.indices(Graph.edges(graph.graph))) {
      const edgeOption = Graph.getEdge(graph.graph, edgeIdx)
      Option.match(edgeOption, {
        onNone: () => {},
        onSome: (edge) => {
          const newFromIdx = indexMap.get(edge.source)!
          const newToIdx = indexMap.get(edge.target)!
          Graph.addEdge(mutable, newFromIdx, newToIdx, { relation: "child" })
        }
      })
    }
  })

  // Rebuild mappings
  const newNodeIdToIndex = HashMap.fromIterable(
    Array.from(nodeMap.entries()).map(([id, idx]) => [id, idx] as const)
  )
  const newIndexToNodeId = HashMap.fromIterable(
    Array.from(nodeMap.entries()).map(([id, idx]) => [idx, id] as const)
  )

  return {
    graph: newGraph,
    nodeIdToIndex: newNodeIdToIndex,
    indexToNodeId: newIndexToNodeId
  }
}

/**
 * Convert graph to array of nodes (topologically sorted)
 */
export const toArray = <A>(
  graph: EffectGraph<A>
): ReadonlyArray<GraphNode<A>> => {
  return Array.from(Graph.values(Graph.nodes(graph.graph)))
}

/**
 * Get the size (number of nodes) in the graph
 */
export const size = <A>(graph: EffectGraph<A>): number => Graph.nodeCount(graph.graph)

/**
 * Pretty print the graph structure
 * Uses Effect's Printer module for beautiful terminal formatting
 */
export const show = <A>(
  graph: EffectGraph<A>,
  showData: (a: A) => string,
  format: "text" | "terminal" = "terminal"
): string => {
  if (format === "terminal") {
    return Formatter.formatEffectGraphTerminal(graph, getNode, getChildren, getRoots, showData)
  }
  // Fallback to simple text format
  const lines: Array<string> = []
  const visit = (nodeId: NodeId, indent: number, visited: Set<NodeId>): void => {
    if (visited.has(nodeId)) return
    visited.add(nodeId)
    const nodeOption = getNode(graph, nodeId)
    if (Option.isNone(nodeOption)) return
    const node = Option.getOrThrow(nodeOption)
    const prefix = "  ".repeat(indent)
    const op = Option.match(node.metadata.operation, {
      onNone: () => "root",
      onSome: (o: string) => o
    })
    lines.push(`${prefix}[${op}] ${showData(node.data)}`)
    const children = getChildren(graph, nodeId)
    children.forEach((child: GraphNode<A>) => visit(child.id, indent + 1, visited))
  }
  const roots = getRoots(graph)
  const visited = new Set<NodeId>()
  roots.forEach((root: GraphNode<A>) => visit(root.id, 0, visited))
  return lines.join("\n")
}
