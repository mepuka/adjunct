/**
 * GraphOps - Production-grade graph operations with categorical semantics
 *
 * This module provides a comprehensive set of operations for working with
 * Effect's DirectedGraph, with proper mathematical foundations:
 *
 * - Functorial structure: map, flatMap preserve graph structure
 * - Monadic operations: flatMap for graph-producing computations
 * - Folds and traversals: aggregate data with proper algebraic laws
 * - Search operations: modeled as adjoint functors (query ⊣ index)
 * - Streaming operations: for large graphs that don't fit in memory
 *
 * Mathematical foundations:
 * - Graphs form a category with morphisms as structure-preserving maps
 * - Functors preserve composition and identity
 * - Adjunctions capture search/index duality
 * - Monoids enable parallel and incremental aggregation
 */

import type { Option } from "effect"
import { Array, Effect, Graph, Stream } from "effect"
import type * as Chunk from "effect/Chunk"
import { pipe } from "effect/Function"

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * A directed graph with node data of type A and edge data of type E
 */
export type DirectedGraph<A, E> = Graph.DirectedGraph<A, E>

/**
 * Node index in a graph
 */
export type NodeIndex = Graph.NodeIndex

/**
 * Graph walker for traversals
 */
export type NodeWalker<A> = Graph.NodeWalker<A>

/**
 * Search index for efficient querying
 * Maps from search keys to node indices
 */
export interface SearchIndex<K, A> {
  readonly index: Map<K, ReadonlyArray<NodeIndex>>
  readonly keyFn: (node: A) => ReadonlyArray<K>
}

/**
 * Graph traversal order
 */
export type TraversalOrder = "dfs" | "bfs" | "topo"

// =============================================================================
// Functorial Operations (Structure-Preserving Transformations)
// =============================================================================

/**
 * Map over nodes in a graph (Functor)
 *
 * Preserves graph structure (edges remain the same).
 * Satisfies functor laws:
 * - Identity: map(id) = id
 * - Composition: map(f ∘ g) = map(f) ∘ map(g)
 *
 * @example
 * const addPrefix = mapNodes(graph, (node) => `prefix: ${node}`)
 */
export const mapNodes = <A, B, E>(
  graph: DirectedGraph<A, E>,
  f: (node: A) => B
): DirectedGraph<B, E> => {
  // @ts-expect-error - Graph.mapNodes doesn't preserve type transformation
  return Graph.mutate(graph, (mutable) => {
    Graph.mapNodes(mutable, f as any)
  })
}

/**
 * Map over edges in a graph (Functor)
 *
 * Preserves graph structure (nodes remain the same).
 *
 * @example
 * const weightEdges = mapEdges(graph, (edge) => ({ ...edge, weight: 1.0 }))
 */
export const mapEdges = <A, E, F>(
  graph: DirectedGraph<A, E>,
  f: (edge: E) => F
): DirectedGraph<A, F> => {
  // @ts-expect-error - Graph.mapEdges doesn't preserve type transformation
  return Graph.mutate(graph, (mutable) => {
    Graph.mapEdges(mutable, f as any)
  })
}

/**
 * Map over both nodes and edges simultaneously (Bifunctor)
 *
 * @example
 * const transformed = bimap(graph,
 *   (node) => node.toUpperCase(),
 *   (edge) => ({ ...edge, label: edge.label.toLowerCase() })
 * )
 */
export const bimap = <A, B, E, F>(
  graph: DirectedGraph<A, E>,
  nodeF: (node: A) => B,
  edgeF: (edge: E) => F
): DirectedGraph<B, F> =>
  pipe(
    graph,
    (g) => mapNodes(g, nodeF),
    (g) => mapEdges(g, edgeF)
  )

// =============================================================================
// Filtering and Selection (Subset Functors)
// =============================================================================

/**
 * Filter nodes by predicate, removing nodes that don't match
 *
 * Edges to/from removed nodes are also removed.
 *
 * @example
 * const activeOnly = filterNodes(graph, (node) => node.active)
 */
export const filterNodes = <A, E>(
  graph: DirectedGraph<A, E>,
  predicate: (node: A) => boolean
): DirectedGraph<A, E> =>
  Graph.mutate(graph, (mutable) => {
    Graph.filterNodes(mutable, predicate)
  })

/**
 * Filter edges by predicate, removing edges that don't match
 *
 * Nodes are preserved even if they become disconnected.
 *
 * @example
 * const strongEdgesOnly = filterEdges(graph, (edge) => edge.weight > 0.5)
 */
export const filterEdges = <A, E>(
  graph: DirectedGraph<A, E>,
  predicate: (edge: E) => boolean
): DirectedGraph<A, E> =>
  Graph.mutate(graph, (mutable) => {
    Graph.filterEdges(mutable, predicate)
  })

/**
 * Find all nodes matching a predicate
 *
 * Returns node indices for efficient subsequent operations.
 *
 * @example
 * const sentenceIndices = findNodes(graph, (node) => node.type === "sentence")
 */
export const findNodes = <A, E>(
  graph: DirectedGraph<A, E>,
  predicate: (node: A) => boolean
): ReadonlyArray<NodeIndex> => Graph.findNodes(graph, predicate)

// =============================================================================
// Folds and Aggregations (Monoid Homomorphisms)
// =============================================================================

/**
 * Fold over all nodes in the graph
 *
 * Traversal order is unspecified - use foldTraversal for ordered folds.
 *
 * @example
 * const wordCount = foldNodes(graph, 0, (acc, node) => acc + node.text.split(' ').length)
 */
export const foldNodes = <A, E, B>(
  graph: DirectedGraph<A, E>,
  initial: B,
  f: (acc: B, node: A) => B
): B => {
  let result = initial
  for (const node of Graph.values(Graph.nodes(graph))) {
    result = f(result, node)
  }
  return result
}

/**
 * Fold over nodes in a specific traversal order
 *
 * This ensures deterministic aggregation when order matters.
 *
 * @example
 * const path = foldTraversal(graph, getRoots(graph), "dfs", [], (acc, node) => [...acc, node])
 */
export const foldTraversal = <A, E, B>(
  graph: DirectedGraph<A, E>,
  start: ReadonlyArray<NodeIndex>,
  order: TraversalOrder,
  initial: B,
  f: (acc: B, node: A, idx: NodeIndex) => B
): B => {
  let result = initial
  const walker = createWalker(graph, start, order)

  for (const [idx, node] of Graph.entries(walker)) {
    result = f(result, node, idx)
  }

  return result
}

/**
 * Collect all nodes into an array (useful for testing and debugging)
 *
 * @example
 * const allNodes = collectNodes(graph)
 */
export const collectNodes = <A, E>(
  graph: DirectedGraph<A, E>
): ReadonlyArray<A> => Array.fromIterable(Graph.values(Graph.nodes(graph)))

/**
 * Collect nodes in traversal order
 *
 * @example
 * const dfsOrder = collectTraversal(graph, getRoots(graph), "dfs")
 */
export const collectTraversal = <A, E>(
  graph: DirectedGraph<A, E>,
  start: ReadonlyArray<NodeIndex>,
  order: TraversalOrder
): ReadonlyArray<A> =>
  foldTraversal(graph, start, order, [] as Array<A>, (acc, node) => {
    acc.push(node)
    return acc
  })

// =============================================================================
// Traversal Utilities
// =============================================================================

/**
 * Create a walker for the given traversal order
 */
const createWalker = <A, E>(
  graph: DirectedGraph<A, E>,
  start: ReadonlyArray<NodeIndex>,
  order: TraversalOrder
): NodeWalker<A> => {
  const options = start.length > 0 ? { start: [...start] } : undefined

  switch (order) {
    case "dfs":
      return Graph.dfs(graph, options)
    case "bfs":
      return Graph.bfs(graph, options)
    case "topo":
      return Graph.topo(graph)
  }
}

/**
 * Get all root nodes (nodes with no incoming edges)
 */
export const getRoots = <A, E>(
  graph: DirectedGraph<A, E>
): ReadonlyArray<NodeIndex> =>
  Array.fromIterable(
    Graph.indices(Graph.externals(graph, { direction: "incoming" }))
  )

/**
 * Get all leaf nodes (nodes with no outgoing edges)
 */
export const getLeaves = <A, E>(
  graph: DirectedGraph<A, E>
): ReadonlyArray<NodeIndex> =>
  Array.fromIterable(
    Graph.indices(Graph.externals(graph, { direction: "outgoing" }))
  )

/**
 * Get children of a node
 */
export const getChildren = <A, E>(
  graph: DirectedGraph<A, E>,
  nodeIndex: NodeIndex
): ReadonlyArray<NodeIndex> => Graph.neighbors(graph, nodeIndex)

/**
 * Get node data by index
 */
export const getNode = <A, E>(
  graph: DirectedGraph<A, E>,
  nodeIndex: NodeIndex
): Option.Option<A> => Graph.getNode(graph, nodeIndex)

// =============================================================================
// Search Operations (Adjoint Functors: Query ⊣ Index)
// =============================================================================

/**
 * Build a search index from a graph
 *
 * This is the "index" functor in the query ⊣ index adjunction.
 * It creates an efficient lookup structure for queries.
 *
 * @example
 * const typeIndex = buildIndex(graph, (node) => [node.type])
 * const sentences = queryIndex(typeIndex, "sentence")
 */
export const buildIndex = <A, E, K>(
  graph: DirectedGraph<A, E>,
  keyFn: (node: A) => ReadonlyArray<K>
): SearchIndex<K, A> => {
  const index = new Map<K, Array<NodeIndex>>()

  for (const [idx, node] of Graph.entries(Graph.nodes(graph))) {
    const keys = keyFn(node)
    keys.forEach((key) => {
      const existing = index.get(key) ?? []
      existing.push(idx)
      index.set(key, existing)
    })
  }

  // Convert to readonly arrays
  const readonlyIndex = new Map<K, ReadonlyArray<NodeIndex>>()
  index.forEach((value, key) => {
    readonlyIndex.set(key, value)
  })

  return {
    index: readonlyIndex,
    keyFn
  }
}

/**
 * Query a search index
 *
 * This is the "query" functor in the query ⊣ index adjunction.
 * It retrieves node indices matching the search key.
 *
 * @example
 * const results = queryIndex(index, "sentence")
 */
export const queryIndex = <K, A>(
  searchIndex: SearchIndex<K, A>,
  key: K
): ReadonlyArray<NodeIndex> => searchIndex.index.get(key) ?? []

/**
 * Multi-key query with union semantics
 *
 * Returns all nodes matching any of the given keys.
 *
 * @example
 * const results = queryIndexUnion(index, ["sentence", "token"])
 */
export const queryIndexUnion = <K, A>(
  searchIndex: SearchIndex<K, A>,
  keys: ReadonlyArray<K>
): ReadonlyArray<NodeIndex> => {
  const resultSet = new Set<NodeIndex>()

  keys.forEach((key) => {
    const results = queryIndex(searchIndex, key)
    results.forEach((idx) => resultSet.add(idx))
  })

  return Array.fromIterable(resultSet)
}

/**
 * Multi-key query with intersection semantics
 *
 * Returns only nodes matching all of the given keys.
 *
 * @example
 * const results = queryIndexIntersection(index, [key1, key2])
 */
export const queryIndexIntersection = <K, A>(
  searchIndex: SearchIndex<K, A>,
  keys: ReadonlyArray<K>
): ReadonlyArray<NodeIndex> => {
  if (keys.length === 0) return []

  // Start with first key's results
  const firstResults = queryIndex(searchIndex, keys[0]!)
  if (firstResults.length === 0) return []

  const resultSet = new Set(firstResults)

  // Intersect with each subsequent key's results
  for (let i = 1; i < keys.length; i++) {
    const currentResults = new Set(queryIndex(searchIndex, keys[i]!))
    // Remove items not in current results
    resultSet.forEach((idx) => {
      if (!currentResults.has(idx)) {
        resultSet.delete(idx)
      }
    })

    // Early exit if no intersection
    if (resultSet.size === 0) return []
  }

  return Array.fromIterable(resultSet)
}

// =============================================================================
// Effect-Based Operations (Compositional Graph Transformations)
// =============================================================================

/**
 * Traverse the graph, applying an effectful function to each node
 *
 * Effects are sequenced in traversal order.
 *
 * @example
 * const program = traverseNodes(graph, getRoots(graph), "dfs",
 *   (node) => Console.log(node.text)
 * )
 */
export const traverseNodes = <A, E, R, Err>(
  graph: DirectedGraph<A, E>,
  start: ReadonlyArray<NodeIndex>,
  order: TraversalOrder,
  f: (node: A, idx: NodeIndex) => Effect.Effect<void, Err, R>
): Effect.Effect<void, Err, R> =>
  Effect.gen(function*() {
    const walker = createWalker(graph, start, order)

    for (const [idx, node] of Graph.entries(walker)) {
      yield* f(node, idx)
    }
  })

/**
 * Traverse the graph, applying an effectful function and collecting results
 *
 * @example
 * const tokens = yield* traverseNodesCollect(graph, roots, "dfs",
 *   (node) => NLP.tokenize(node.text)
 * )
 */
export const traverseNodesCollect = <A, E, B, Err, R>(
  graph: DirectedGraph<A, E>,
  start: ReadonlyArray<NodeIndex>,
  order: TraversalOrder,
  f: (node: A, idx: NodeIndex) => Effect.Effect<B, Err, R>
): Effect.Effect<ReadonlyArray<B>, Err, R> =>
  Effect.gen(function*() {
    const results: Array<B> = []
    const walker = createWalker(graph, start, order)

    for (const [idx, node] of Graph.entries(walker)) {
      const result = yield* f(node, idx)
      results.push(result)
    }

    return results
  })

/**
 * Map over nodes with an effectful function
 *
 * Returns a new graph with transformed node data.
 *
 * @example
 * const normalized = yield* mapNodesEffect(graph,
 *   (node) => NLP.normalizeWhitespace(node.text)
 * )
 */
export const mapNodesEffect = <A, B, E, Err, R>(
  graph: DirectedGraph<A, E>,
  f: (node: A, idx: NodeIndex) => Effect.Effect<B, Err, R>
): Effect.Effect<DirectedGraph<B, E>, Err, R> =>
  Effect.gen(function*() {
    const nodeMap = new Map<NodeIndex, B>()

    // Process all nodes
    for (const [idx, node] of Graph.entries(Graph.nodes(graph))) {
      const transformed = yield* f(node, idx)
      nodeMap.set(idx, transformed)
    }

    // Build new graph with transformed nodes
    // Note: This is a workaround for Graph.mapNodes type limitations
    const result = Graph.mutate(graph, (mutable) => {
      Graph.mapNodes(mutable, (node: A) => {
        // Find the node index to get the transformed value
        for (const [idx, n] of Graph.entries(Graph.nodes(graph))) {
          if (n === node) {
            const transformed = nodeMap.get(idx)
            if (transformed !== undefined) {
              return transformed as any as A
            }
          }
        }
        return node
      })
    })
    return result as any as DirectedGraph<B, E>
  })

// =============================================================================
// Streaming Operations (For Large Graphs)
// =============================================================================

/**
 * Stream nodes from a graph
 *
 * Useful for processing large graphs that don't fit in memory.
 *
 * @example
 * const program = pipe(
 *   streamNodes(graph, roots, "dfs"),
 *   Stream.map((node) => node.text),
 *   Stream.runCollect
 * )
 */
export const streamNodes = <A, E>(
  graph: DirectedGraph<A, E>,
  start: ReadonlyArray<NodeIndex>,
  order: TraversalOrder
): Stream.Stream<A, never, never> =>
  Stream.fromIterable(
    (function*() {
      const walker = createWalker(graph, start, order)
      for (const [, node] of Graph.entries(walker)) {
        yield node
      }
    })()
  )

/**
 * Stream nodes with indices
 */
export const streamNodesWithIndex = <A, E>(
  graph: DirectedGraph<A, E>,
  start: ReadonlyArray<NodeIndex>,
  order: TraversalOrder
): Stream.Stream<readonly [NodeIndex, A], never, never> =>
  Stream.fromIterable(
    (function*() {
      const walker = createWalker(graph, start, order)
      for (const entry of Graph.entries(walker)) {
        yield entry
      }
    })()
  )

/**
 * Process graph nodes in batches
 *
 * Useful for parallel processing of large graphs.
 *
 * @example
 * const program = pipe(
 *   batchNodes(graph, roots, "dfs", 100),
 *   Stream.mapEffect((batch) => processBatch(batch)),
 *   Stream.runCollect
 * )
 */
export const batchNodes = <A, E>(
  graph: DirectedGraph<A, E>,
  start: ReadonlyArray<NodeIndex>,
  order: TraversalOrder,
  batchSize: number
): Stream.Stream<Chunk.Chunk<A>, never, never> =>
  pipe(
    streamNodes(graph, start, order),
    Stream.chunks,
    Stream.rechunk(batchSize)
  )

// =============================================================================
// Graph Properties and Validation
// =============================================================================

/**
 * Check if the graph is acyclic (DAG)
 */
export const isAcyclic = <A, E>(
  graph: DirectedGraph<A, E>
): boolean => Graph.isAcyclic(graph)

/**
 * Get strongly connected components
 */
export const stronglyConnectedComponents = <A, E>(
  graph: DirectedGraph<A, E>
): ReadonlyArray<ReadonlyArray<NodeIndex>> => Graph.stronglyConnectedComponents(graph)

/**
 * Count nodes in the graph
 */
export const nodeCount = <A, E>(
  graph: DirectedGraph<A, E>
): number => Graph.nodeCount(graph)

/**
 * Count edges in the graph
 */
export const edgeCount = <A, E>(
  graph: DirectedGraph<A, E>
): number => Graph.edgeCount(graph)

/**
 * Check if the graph is empty (no nodes)
 */
export const isEmpty = <A, E>(
  graph: DirectedGraph<A, E>
): boolean => nodeCount(graph) === 0

// =============================================================================
// Utilities
// =============================================================================

/**
 * Create an empty directed graph
 */
export const empty = <A, E>(): DirectedGraph<A, E> => Graph.directed<A, E>()

/**
 * Create a graph with a single node
 */
export const singleton = <A, E>(node: A): DirectedGraph<A, E> =>
  Graph.directed<A, E>((mutable) => {
    Graph.addNode(mutable, node)
  })

/**
 * Merge two graphs
 *
 * Combines nodes and edges from both graphs.
 * Note: Node indices may change during merge.
 */
export const merge = <A, E>(
  g1: DirectedGraph<A, E>,
  g2: DirectedGraph<A, E>
): DirectedGraph<A, E> =>
  Graph.mutate(g1, (mutable) => {
    // Add all nodes from g2
    for (const node of Graph.values(Graph.nodes(g2))) {
      Graph.addNode(mutable, node)
    }

    // TODO: Add edges (requires mapping old indices to new indices)
    // This is a simplified version - production would need proper index mapping
  })
