/**
 * Graph Operations
 *
 * This module provides functions for executing text operations on the graph
 * and updating the reactive state accordingly.
 */

import * as Effect from 'effect/Effect'
import * as Option from 'effect/Option'
import * as EG from '@adjunct/core/EffectGraph'
import { actions } from './atoms'

/**
 * Simple tokenization (no NLP service for now)
 */
function simpleTokenize(text: string): ReadonlyArray<string> {
  return text
    .split(/\s+/)
    .filter(t => t.length > 0)
}

/**
 * Simple sentencization
 */
function simpleSentencize(text: string): ReadonlyArray<string> {
  return text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
}

/**
 * Create a graph from text using a specified operation
 */
export function createGraphFromText(
  text: string,
  operation: 'sentencize' | 'tokenize' | 'both'
): Effect.Effect<EG.EffectGraph<string>, never, never> {
  return Effect.gen(function* () {
    // Start with a singleton graph containing the input text
    let graph = EG.singleton(text)
    const rootNode = EG.getRoots(graph)[0]

    if (operation === 'sentencize' || operation === 'both') {
      // Apply sentencization
      const sentences = simpleSentencize(text)
      for (const sentence of sentences) {
        const sentenceNode = EG.makeNode(
          sentence,
          rootNode ? Option.some(rootNode.id) : Option.none(),
          Option.some('sentencize')
        )
        graph = EG.addNode(graph, sentenceNode)

        // If 'both', also tokenize each sentence
        if (operation === 'both') {
          const tokens = simpleTokenize(sentence)
          for (const token of tokens) {
            const tokenNode = EG.makeNode(
              token,
              Option.some(sentenceNode.id),
              Option.some('tokenize')
            )
            graph = EG.addNode(graph, tokenNode)
          }
        }
      }
    } else if (operation === 'tokenize') {
      // Apply tokenization directly to root
      const tokens = simpleTokenize(text)
      for (const token of tokens) {
        const tokenNode = EG.makeNode(
          token,
          rootNode ? Option.some(rootNode.id) : Option.none(),
          Option.some('tokenize')
        )
        graph = EG.addNode(graph, tokenNode)
      }
    }

    return graph
  })
}

/**
 * Execute a graph operation and update state
 */
export async function executeOperation(
  text: string,
  operation: 'sentencize' | 'tokenize' | 'both'
): Promise<void> {
  actions.setProcessing(true)
  actions.setError(null)

  try {
    const program = createGraphFromText(text, operation)
    const graph = await Effect.runPromise(program)

    actions.setGraph(graph)
    actions.addOperation(operation)
    actions.setProcessing(false)
  } catch (error) {
    actions.setError(error instanceof Error ? error.message : 'Unknown error')
    actions.setProcessing(false)
  }
}

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
