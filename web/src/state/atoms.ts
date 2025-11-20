/**
 * State Management with Effect Atoms
 *
 * This module defines the reactive state for the text graph workbench.
 * We use Effect atoms for type-safe, reactive state management that integrates
 * seamlessly with our Effect-based graph operations.
 */

import * as EG from "@adjunct/core/EffectGraph"
import { Atom } from "@effect-atom/atom"
import * as Effect from "effect/Effect"

/**
 * Visualization mode for the graph
 */
export type VisualizationMode = "dag" | "tree" | "functor"

/**
 * Node selection state
 */
export interface NodeSelection {
  readonly nodeId: EG.NodeId | null
  readonly path: ReadonlyArray<EG.NodeId>
}

/**
 * Initial state
 */
const initialState = {
  inputText:
    "The quick brown fox jumps over the lazy dog. This is a demonstration of text graph operations. We can visualize the functional transformations.",
  graph: null as EG.EffectGraph<string> | null,
  selectedNode: {
    nodeId: null,
    path: []
  } as NodeSelection,
  visualizationMode: "functor" as VisualizationMode,
  operations: [] as ReadonlyArray<string>,
  isProcessing: false,
  error: null as string | null
}

/**
 * Simple writable atoms - Atom.make(initialValue) creates a Writable<A>
 * TypeScript will infer the correct Writable type from the initial value
 */
export const inputTextAtom = Atom.make(initialState.inputText)

export const graphAtom = Atom.make(null as EG.EffectGraph<string> | null)

export const selectedNodeAtom = Atom.make(initialState.selectedNode)

export const visualizationModeAtom = Atom.make(initialState.visualizationMode)

export const operationsAtom = Atom.make([] as ReadonlyArray<string>)

export const isProcessingAtom = Atom.make(false)

export const errorAtom = Atom.make(null as string | null)

/**
 * Derived atom for graph statistics
 * Automatically recomputes when graphAtom changes
 */
export const graphStatsAtom = Atom.make((get) => {
  const graph = get(graphAtom)
  if (!graph) {
    return {
      nodeCount: 0,
      edgeCount: 0,
      depth: 0,
      roots: 0
    }
  }

  const nodes = EG.toArray(graph)
  const roots = EG.getRoots(graph)
  const maxDepth = nodes.reduce((max, node) => Math.max(max, node.metadata.depth), 0)

  return {
    nodeCount: EG.size(graph),
    edgeCount: nodes.reduce((sum, node) => sum + EG.getChildren(graph, node.id).length, 0),
    depth: maxDepth + 1,
    roots: roots.length
  }
})

/**
 * Actions for state updates
 * These return Effects that can be composed and run
 */
export const actions = {
  setInputText: (text: string) => Atom.set(inputTextAtom, text),

  setGraph: (graph: EG.EffectGraph<string> | null) => Atom.set(graphAtom, graph),

  selectNode: (nodeId: EG.NodeId | null, path: ReadonlyArray<EG.NodeId> = []) =>
    Atom.set(selectedNodeAtom, { nodeId, path }),

  setVisualizationMode: (mode: VisualizationMode) => Atom.set(visualizationModeAtom, mode),

  addOperation: (operation: string) =>
    Effect.gen(function*() {
      const current: ReadonlyArray<string> = yield* Atom.get(operationsAtom)
      yield* Atom.set(operationsAtom, [...current, operation])
    }),

  clearOperations: () => Atom.set(operationsAtom, []),

  setProcessing: (isProcessing: boolean) => Atom.set(isProcessingAtom, isProcessing),

  setError: (error: string | null) => Atom.set(errorAtom, error),

  reset: () =>
    Effect.gen(function*() {
      yield* Atom.set(inputTextAtom, initialState.inputText)
      yield* Atom.set(graphAtom, null)
      yield* Atom.set(selectedNodeAtom, initialState.selectedNode)
      yield* Atom.set(visualizationModeAtom, initialState.visualizationMode)
      yield* Atom.set(operationsAtom, [])
      yield* Atom.set(isProcessingAtom, false)
      yield* Atom.set(errorAtom, null)
    })
}
