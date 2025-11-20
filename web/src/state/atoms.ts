/**
 * State Management with Effect Atoms
 *
 * This module defines the reactive state for the text graph workbench.
 * We use Effect atoms for type-safe, reactive state management that integrates
 * seamlessly with our Effect-based graph operations.
 */

import { Atom, Writable } from '@effect-atom/atom'
import type * as EG from '@adjunct/core/EffectGraph'

/**
 * Visualization mode for the graph
 */
export type VisualizationMode = 'dag' | 'tree' | 'functor'

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
  inputText: 'The quick brown fox jumps over the lazy dog. This is a demonstration of text graph operations. We can visualize the functional transformations.',
  graph: null as EG.EffectGraph<string> | null,
  selectedNode: {
    nodeId: null,
    path: []
  } as NodeSelection,
  visualizationMode: 'functor' as VisualizationMode,
  operations: [] as ReadonlyArray<string>,
  isProcessing: false,
  error: null as string | null
}

/**
 * Derived atom for input text
 */
export const inputTextAtom = Writable.make(initialState.inputText)

/**
 * Derived atom for the current graph
 */
export const graphAtom = Writable.make<EG.EffectGraph<string> | null>(null)

/**
 * Derived atom for selected node
 */
export const selectedNodeAtom = Writable.make<NodeSelection>(initialState.selectedNode)

/**
 * Derived atom for visualization mode
 */
export const visualizationModeAtom = Writable.make<VisualizationMode>(initialState.visualizationMode)

/**
 * Derived atom for operations list
 */
export const operationsAtom = Writable.make<ReadonlyArray<string>>([])

/**
 * Derived atom for processing state
 */
export const isProcessingAtom = Writable.make(false)

/**
 * Derived atom for error state
 */
export const errorAtom = Writable.make<string | null>(null)

/**
 * Actions for state updates
 */
export const actions = {
  setInputText: (text: string) => {
    Writable.set(inputTextAtom, text)
  },

  setGraph: (graph: EG.EffectGraph<string> | null) => {
    Writable.set(graphAtom, graph)
  },

  selectNode: (nodeId: EG.NodeId | null, path: ReadonlyArray<EG.NodeId> = []) => {
    Writable.set(selectedNodeAtom, { nodeId, path })
  },

  setVisualizationMode: (mode: VisualizationMode) => {
    Writable.set(visualizationModeAtom, mode)
  },

  addOperation: (operation: string) => {
    const current = Writable.get(operationsAtom)
    Writable.set(operationsAtom, [...current, operation])
  },

  clearOperations: () => {
    Writable.set(operationsAtom, [])
  },

  setProcessing: (isProcessing: boolean) => {
    Writable.set(isProcessingAtom, isProcessing)
  },

  setError: (error: string | null) => {
    Writable.set(errorAtom, error)
  },

  reset: () => {
    Writable.set(inputTextAtom, initialState.inputText)
    Writable.set(graphAtom, null)
    Writable.set(selectedNodeAtom, initialState.selectedNode)
    Writable.set(visualizationModeAtom, initialState.visualizationMode)
    Writable.set(operationsAtom, [])
    Writable.set(isProcessingAtom, false)
    Writable.set(errorAtom, null)
  }
}
