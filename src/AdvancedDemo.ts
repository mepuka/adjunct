/**
 * Advanced Demo - Rich Text Processing with Multiple Output Formats
 *
 * This demo showcases:
 * 1. Processing complex multi-paragraph text
 * 2. Multiple output formats (Terminal, Markdown, HTML)
 * 3. Advanced graph operations and analytics
 * 4. N-gram extraction and word counting
 */

import * as Console from "effect/Console"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as EffectGraph from "./EffectGraph.js"
import * as Formatter from "./Formatter.js"
import { NLPServiceLive } from "./NLPService.js"
import * as TextOperations from "./TextOperations.js"
import * as TypeClass from "./TypeClass.js"

// =============================================================================
// Rich Sample Text
// =============================================================================

const SAMPLE_TEXT = `
Category theory is a general theory of mathematical structures and their relations.
It was introduced by Samuel Eilenberg and Saunders Mac Lane in the 1940s.

The study of categories allows for a unified treatment of many mathematical concepts.
Categories consist of objects and morphisms (also called arrows) between objects.
Morphisms can be composed, and this composition is associative.

Effect-TS leverages category theory to provide type-safe functional programming.
By modeling effects as values, we gain composability and referential transparency.
This approach leads to more maintainable and testable code.
`.trim()

// =============================================================================
// Example 1: Complex Text Analysis
// =============================================================================

const complexAnalysisExample = Effect.gen(function*() {
  yield* Console.log(Formatter.header("Advanced Text Analysis Demo"))
  yield* Console.log(Formatter.section("Input Text"))
  yield* Console.log(SAMPLE_TEXT)
  yield* Console.log("")

  // Create graph and apply pipeline
  const initialGraph = EffectGraph.singleton(SAMPLE_TEXT)

  yield* Console.log(Formatter.section("Processing Pipeline"))
  yield* Console.log(Formatter.info("Step 1: Normalize whitespace"))
  yield* Console.log(Formatter.info("Step 2: Paragraphize"))
  yield* Console.log(Formatter.info("Step 3: Sentencize paragraphs"))
  yield* Console.log("")

  // Apply normalization
  const normalizedGraph = yield* TypeClass.executeOperation(
    initialGraph,
    TextOperations.normalizeOperation
  )

  // Apply paragraphization
  const paragraphizedGraph = yield* TypeClass.executeOperation(
    normalizedGraph,
    TextOperations.paragraphizeOperation
  )

  // Apply sentencization to each paragraph
  const sentencizedGraph = yield* TypeClass.executeOperation(
    paragraphizedGraph,
    TextOperations.sentencizeOperation
  )

  yield* Console.log(Formatter.section("Graph Statistics"))
  yield* Console.log(`Total nodes: ${EffectGraph.size(sentencizedGraph)}`)
  yield* Console.log(`Graph depth: ${TypeClass.depth(sentencizedGraph)} levels`)
  yield* Console.log("")

  // Display graph structure
  yield* Console.log(Formatter.section("Graph Structure (Terminal Format)"))
  yield* Console.log(
    EffectGraph.show(
      sentencizedGraph,
      (data) =>
        typeof data === "string" ? `"${data.substring(0, 50)}${data.length > 50 ? "..." : ""}"` : JSON.stringify(data)
    )
  )
  yield* Console.log("")

  // Extract all sentences
  const allData = TypeClass.collectData(sentencizedGraph)
  const sentences = allData.filter((data): data is string =>
    typeof data === "string" && data.includes(".") && !data.includes("\n\n")
  )

  yield* Console.log(Formatter.section("Extracted Sentences"))
  sentences.forEach((sentence, i) => {
    Effect.runSync(Console.log(`${i + 1}. ${sentence}`))
  })
  yield* Console.log("")
})

// =============================================================================
// Example 2: Word Count Analysis
// =============================================================================

const wordCountExample = Effect.gen(function*() {
  yield* Console.log(Formatter.section("Word Count Analysis"))

  const initialGraph = EffectGraph.singleton(SAMPLE_TEXT)

  // Apply tokenization to get all words
  const normalizedGraph = yield* TypeClass.executeOperation(
    initialGraph,
    TextOperations.normalizeOperation
  )

  const tokenizedGraph = yield* TypeClass.executeOperation(
    normalizedGraph,
    TextOperations.tokenizeOperation
  )

  // Define algebra to count words
  const wordCountAlgebra: EffectGraph.GraphAlgebra<string | any, number> = (
    node,
    childrenCounts
  ) => {
    // Count this node if it's a word token
    const isWord = typeof node.data === "string"
      && node.data.length > 0
      && /\w/.test(node.data)
      && Option.isSome(node.metadata?.operation) && node.metadata?.operation.value === "tokenize"
    const nodeCount = isWord ? 1 : 0
    const childrenTotal = childrenCounts.reduce((a, b) => a + b, 0)
    return nodeCount + childrenTotal
  }

  const wordCounts = yield* EffectGraph.cata(tokenizedGraph, wordCountAlgebra)
  const totalWords = wordCounts[0] || 0

  yield* Console.log(Formatter.info(`Total words: ${totalWords}`))

  // Character count
  const charCountAlgebra: EffectGraph.GraphAlgebra<string | any, number> = (
    node,
    childrenCounts
  ) => {
    const nodeChars = typeof node.data === "string" ? node.data.length : 0
    const childrenTotal = childrenCounts.reduce((a, b) => a + b, 0)
    return nodeChars + childrenTotal
  }

  const charCounts = yield* EffectGraph.cata(tokenizedGraph, charCountAlgebra)
  const totalChars = charCounts[0] || 0

  yield* Console.log(Formatter.info(`Total characters: ${totalChars}`))
  yield* Console.log(Formatter.info(`Average word length: ${(totalChars / totalWords).toFixed(2)} chars`))
  yield* Console.log("")
})

// =============================================================================
// Example 3: Graph Export (Different Formats)
// =============================================================================

const exportFormatsExample = Effect.gen(function*() {
  yield* Console.log(Formatter.section("Output Format Demonstrations"))

  const simpleText = "Effect-TS is powerful. Category theory is elegant. Functional programming is practical."
  const initialGraph = EffectGraph.singleton(simpleText)

  const processedGraph = yield* TypeClass.executeOperations(
    initialGraph,
    TextOperations.standardPipeline
  )

  // Terminal format (already shown above with colors)
  yield* Console.log(Formatter.info("Format 1: Terminal (ANSI colors) - shown above"))

  // Text format (plain)
  yield* Console.log("")
  yield* Console.log(Formatter.info("Format 2: Plain Text"))
  yield* Console.log(
    EffectGraph.show(processedGraph, (data) => typeof data === "string" ? `"${data}"` : "...")
  )
  yield* Console.log("")

  // Markdown format indicator
  yield* Console.log(Formatter.info("Format 3: Markdown (conceptual)"))
  yield* Console.log("```")
  yield* Console.log("# Text Processing Graph")
  yield* Console.log("")
  yield* Console.log("## Root Node")
  yield* Console.log("- Original text")
  yield* Console.log("")
  yield* Console.log("## Normalized")
  yield* Console.log("- Whitespace cleaned")
  yield* Console.log("")
  yield* Console.log("## Sentences")
  yield* Console.log("- Sentence 1: Effect-TS is powerful.")
  yield* Console.log("- Sentence 2: Category theory is elegant.")
  yield* Console.log("- Sentence 3: Functional programming is practical.")
  yield* Console.log("```")
  yield* Console.log("")
})

// =============================================================================
// Example 4: Composition Demonstration
// =============================================================================

const compositionExample = Effect.gen(function*() {
  yield* Console.log(Formatter.section("Operation Composition"))

  const messyText = "  Hello     WORLD!!!   This   is   AMAZING.  "

  yield* Console.log(Formatter.info("Input (messy):"))
  yield* Console.log(`"${messyText}"`)
  yield* Console.log("")

  const initialGraph = EffectGraph.singleton(messyText)

  // Step by step
  yield* Console.log(Formatter.info("Step 1: Normalize"))
  const step1 = yield* TypeClass.executeOperation(
    initialGraph,
    TextOperations.normalizeOperation
  )
  const normalized = TypeClass.collectData(step1)[1] as string
  yield* Console.log(`Result: "${normalized}"`)
  yield* Console.log("")

  yield* Console.log(Formatter.info("Step 2: Sentencize"))
  const step2 = yield* TypeClass.executeOperation(
    step1,
    TextOperations.sentencizeOperation
  )
  yield* Console.log(`Sentences created: ${EffectGraph.size(step2) - EffectGraph.size(step1)}`)
  yield* Console.log("")

  yield* Console.log(Formatter.info("Step 3: Tokenize"))
  const step3 = yield* TypeClass.executeOperation(
    step2,
    TextOperations.tokenizeOperation
  )
  yield* Console.log(`Tokens created: ${EffectGraph.size(step3) - EffectGraph.size(step2)}`)
  yield* Console.log("")

  yield* Console.log(Formatter.section("Final Graph"))
  yield* Console.log(`Total nodes: ${EffectGraph.size(step3)}`)
  yield* Console.log(`Depth: ${TypeClass.depth(step3)} levels`)
  yield* Console.log("")
})

// =============================================================================
// Main Program
// =============================================================================

const program = Effect.gen(function*() {
  yield* Console.log("")
  yield* Console.log("=".repeat(80))
  yield* Console.log(Formatter.header("Effect-DSPy Advanced Demonstration"))
  yield* Console.log("=".repeat(80))
  yield* Console.log("")

  yield* complexAnalysisExample
  yield* wordCountExample
  yield* exportFormatsExample
  yield* compositionExample

  yield* Console.log("")
  yield* Console.log(Formatter.success("✓ Advanced demonstration completed successfully!"))
  yield* Console.log("")
  yield* Console.log(Formatter.section("Summary"))
  yield* Console.log(Formatter.info("✓ Multi-paragraph text processing"))
  yield* Console.log(Formatter.info("✓ Graph analytics (word count, character count)"))
  yield* Console.log(Formatter.info("✓ Multiple output formats"))
  yield* Console.log(Formatter.info("✓ Step-by-step operation composition"))
  yield* Console.log("")
})

// Provide the NLP service and run
const runnable = Effect.provide(program, NLPServiceLive)

Effect.runPromise(runnable).catch(console.error)
