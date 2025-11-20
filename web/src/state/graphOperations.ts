/**
 * Graph Operations
 *
 * This module provides mutation atoms for executing text operations on the graph.
 * These atoms can be used directly with useAtomSet in React components.
 */

import * as EG from "@adjunct/core/EffectGraph"
import { Atom } from "@effect-atom/atom"
import { Effect, Option } from "effect"
import { atomRuntime } from "../runtime/atomRuntime"
import { errorAtom, graphAtom, isProcessingAtom, operationsAtom } from "./atoms"
/**
 * Simple tokenization (no NLP service for now)
 */
function simpleTokenize(text: string): ReadonlyArray<string> {
  return text
    .split(/\s+/)
    .filter((t) => t.length > 0)
}

/**
 * Simple sentencization
 */
function simpleSentencize(text: string): ReadonlyArray<string> {
  return text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

/**
 * Create a graph from text using a specified operation
 */
export function createGraphFromText(
  text: string,
  operation: "sentencize" | "tokenize" | "both"
): Effect.Effect<EG.EffectGraph<string>, never, never> {
  return Effect.sync(() => {
    // Start with a singleton graph containing the input text
    let graph = EG.singleton(text)
    const roots = EG.getRoots(graph)
    const rootNode = roots.length > 0 ? roots[0] : null

    if (operation === "sentencize" || operation === "both") {
      // Apply sentencization
      const sentences = simpleSentencize(text)
      for (const sentence of sentences) {
        const parentId = (rootNode
          ? Option.some(rootNode.id)
          : Option.none()) as any
        const operationOpt = Option.some("sentencize") as any
        const sentenceNode = EG.makeNode(
          sentence,
          parentId,
          operationOpt
        )
        graph = EG.addNode(graph, sentenceNode)

        // If 'both', also tokenize each sentence
        if (operation === "both") {
          const tokens = simpleTokenize(sentence)
          for (const token of tokens) {
            const tokenParentId = Option.some(sentenceNode.id) as any
            const tokenOp = Option.some("tokenize") as any
            const tokenNode = EG.makeNode(
              token,
              tokenParentId,
              tokenOp
            )
            graph = EG.addNode(graph, tokenNode)
          }
        }
      }
    } else if (operation === "tokenize") {
      // Apply tokenization directly to root
      const tokens = simpleTokenize(text)
      for (const token of tokens) {
        const tokenParentId = (rootNode
          ? Option.some(rootNode.id)
          : Option.none()) as any
        const tokenOp = Option.some("tokenize") as any
        const tokenNode = EG.makeNode(
          token,
          tokenParentId,
          tokenOp
        )
        graph = EG.addNode(graph, tokenNode)
      }
    }

    return graph
  })
}

/**
 * Mutation atom for executing a graph operation
 * Use with useAtomSet in React components
 */
export const executeOperationMutation = atomRuntime.fn(
  (params: { text: string; operation: "sentencize" | "tokenize" | "both" }) =>
    Effect.gen(function*() {
      yield* Atom.set(isProcessingAtom, true)
      yield* Atom.set(errorAtom, null)

      const graph = yield* createGraphFromText(params.text, params.operation)
      yield* Atom.set(graphAtom, graph)

      // Add operation to history
      const current = yield* Atom.get(operationsAtom)
      yield* Atom.set(operationsAtom, [...current, params.operation])

      yield* Atom.set(isProcessingAtom, false)
    }).pipe(
      Effect.catchAll((error: unknown) =>
        Effect.gen(function*() {
          const errorMessage = error instanceof Error ? error.message : String(error)
          yield* Atom.set(errorAtom, errorMessage)
          yield* Atom.set(isProcessingAtom, false)
        })
      )
    )
)

/**
 * Get graph statistics
 */
export function getGraphStats(graph: EG.EffectGraph<string> | null) {
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
}
