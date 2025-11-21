/**
 * CorpusOps - Production-grade utilities for large text corpus processing
 *
 * This module provides efficient operations for processing large collections
 * of documents, with support for:
 *
 * - Streaming: Process documents one at a time to avoid loading all in memory
 * - Batching: Group documents for parallel processing
 * - Parallel execution: Process multiple documents concurrently
 * - Incremental aggregation: Combine results using monoid algebra
 * - Progress tracking: Monitor long-running corpus operations
 *
 * Mathematical foundations:
 * - Streams form a monad allowing compositional transformations
 * - Batching respects chunking algebra
 * - Parallel processing preserves monoid homomorphisms
 * - Incremental aggregation uses associative operations
 */

import * as Effect from "effect/Effect"
import * as Stream from "effect/Stream"
import * as Chunk from "effect/Chunk"
import * as Array from "effect/Array"
import { pipe } from "effect/Function"
import * as NLP from "./NLPService.js"

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Document in a corpus
 */
export interface Document {
  readonly id: string
  readonly text: string
  readonly metadata?: Record<string, unknown>
}

/**
 * Processed document with extracted features
 */
export interface ProcessedDocument<Features> {
  readonly id: string
  readonly text: string
  readonly features: Features
  readonly metadata?: Record<string, unknown>
}

/**
 * Corpus statistics aggregated across documents
 */
export interface CorpusStatistics {
  readonly documentCount: number
  readonly totalWords: number
  readonly totalSentences: number
  readonly totalChars: number
  readonly vocabulary: Set<string>
  readonly termFrequency: Map<string, number>
  readonly documentFrequency: Map<string, number>
}

/**
 * Progress information for long-running operations
 */
export interface Progress {
  readonly processed: number
  readonly total: number
  readonly percentage: number
}

/**
 * Configuration for corpus processing
 */
export interface CorpusConfig {
  readonly batchSize: number
  readonly concurrency: number
  readonly reportProgress?: (progress: Progress) => Effect.Effect<void>
}

/**
 * Default corpus processing configuration
 */
export const defaultCorpusConfig: CorpusConfig = {
  batchSize: 100,
  concurrency: 10
}

// =============================================================================
// Streaming Operations
// =============================================================================

/**
 * Stream documents from an array
 *
 * @example
 * const docs = streamDocuments([
 *   { id: "1", text: "Hello world" },
 *   { id: "2", text: "Goodbye world" }
 * ])
 */
export const streamDocuments = (
  documents: ReadonlyArray<Document>
): Stream.Stream<Document, never, never> =>
  Stream.fromIterable(documents)

/**
 * Stream documents in batches
 *
 * Useful for parallel processing while controlling memory usage.
 *
 * @example
 * const batches = streamDocumentBatches(documents, 100)
 */
export const streamDocumentBatches = (
  documents: ReadonlyArray<Document>,
  batchSize: number
): Stream.Stream<Chunk.Chunk<Document>, never, never> =>
  pipe(
    streamDocuments(documents),
    Stream.chunks,
    Stream.rechunk(batchSize)
  )

// =============================================================================
// Parallel Processing
// =============================================================================

/**
 * Process documents in parallel with controlled concurrency
 *
 * @example
 * const processed = yield* processParallel(
 *   documents,
 *   (doc) => extractFeatures(doc),
 *   { batchSize: 100, concurrency: 10 }
 * )
 */
export const processParallel = <Features, Err, R>(
  documents: ReadonlyArray<Document>,
  processDoc: (doc: Document) => Effect.Effect<Features, Err, R>,
  config: CorpusConfig = defaultCorpusConfig
): Effect.Effect<ReadonlyArray<ProcessedDocument<Features>>, Err, R> =>
  Effect.gen(function*() {
    const results: Array<ProcessedDocument<Features>> = []
    let processed = 0
    const total = documents.length

    // Process in batches with controlled concurrency
    const batches = Array.chunksOf(documents, config.batchSize)

    for (const batch of batches) {
      // Process batch in parallel
      const batchResults = yield* Effect.all(
        batch.map((doc) =>
          Effect.map(processDoc(doc), (features): ProcessedDocument<Features> => {
            const result: ProcessedDocument<Features> = {
              id: doc.id,
              text: doc.text,
              features
            }
            if (doc.metadata !== undefined) {
              return { ...result, metadata: doc.metadata }
            }
            return result
          })
        ),
        { concurrency: config.concurrency }
      )

      results.push(...batchResults)
      processed += batch.length

      // Report progress if configured
      if (config.reportProgress) {
        yield* config.reportProgress({
          processed,
          total,
          percentage: Math.floor((processed / total) * 100)
        })
      }
    }

    return results
  })

/**
 * Process documents in parallel using streams
 *
 * More memory-efficient than processParallel for very large corpora.
 *
 * @example
 * const program = pipe(
 *   processParallelStream(documents, extractFeatures, config),
 *   Stream.runCollect
 * )
 */
export const processParallelStream = <Features, Err, R>(
  documents: ReadonlyArray<Document>,
  processDoc: (doc: Document) => Effect.Effect<Features, Err, R>,
  config: CorpusConfig = defaultCorpusConfig
): Stream.Stream<ProcessedDocument<Features>, Err, R> =>
  pipe(
    streamDocuments(documents),
    Stream.mapEffect(
      (doc) =>
        Effect.map(processDoc(doc), (features): ProcessedDocument<Features> => {
          const result: ProcessedDocument<Features> = {
            id: doc.id,
            text: doc.text,
            features
          }
          if (doc.metadata !== undefined) {
            return { ...result, metadata: doc.metadata }
          }
          return result
        }),
      { concurrency: config.concurrency }
    )
  )

// =============================================================================
// Incremental Aggregation
// =============================================================================

/**
 * Empty corpus statistics (monoid identity)
 */
export const emptyStatistics: CorpusStatistics = {
  documentCount: 0,
  totalWords: 0,
  totalSentences: 0,
  totalChars: 0,
  vocabulary: new Set(),
  termFrequency: new Map(),
  documentFrequency: new Map()
}

/**
 * Combine two corpus statistics (monoid operation)
 *
 * This is associative: combine(combine(a, b), c) = combine(a, combine(b, c))
 */
export const combineStatistics = (
  s1: CorpusStatistics,
  s2: CorpusStatistics
): CorpusStatistics => ({
  documentCount: s1.documentCount + s2.documentCount,
  totalWords: s1.totalWords + s2.totalWords,
  totalSentences: s1.totalSentences + s2.totalSentences,
  totalChars: s1.totalChars + s2.totalChars,
  vocabulary: new Set([...s1.vocabulary, ...s2.vocabulary]),
  termFrequency: mergeFrequencyMaps(s1.termFrequency, s2.termFrequency),
  documentFrequency: mergeFrequencyMaps(s1.documentFrequency, s2.documentFrequency)
})

/**
 * Merge two frequency maps (helper for combineStatistics)
 */
const mergeFrequencyMaps = (
  m1: Map<string, number>,
  m2: Map<string, number>
): Map<string, number> => {
  const result = new Map(m1)
  m2.forEach((count, term) => {
    result.set(term, (result.get(term) ?? 0) + count)
  })
  return result
}

/**
 * Compute statistics from a single document
 */
export const documentStatistics = (
  doc: Document,
  tokens: ReadonlyArray<string>,
  sentences: ReadonlyArray<string>
): CorpusStatistics => {
  const vocabulary = new Set(tokens)
  const termFrequency = new Map<string, number>()
  const documentFrequency = new Map<string, number>()

  // Count term frequency
  tokens.forEach((token) => {
    termFrequency.set(token, (termFrequency.get(token) ?? 0) + 1)
  })

  // Document frequency (1 for each unique term in this doc)
  vocabulary.forEach((term) => {
    documentFrequency.set(term, 1)
  })

  return {
    documentCount: 1,
    totalWords: tokens.length,
    totalSentences: sentences.length,
    totalChars: doc.text.length,
    vocabulary,
    termFrequency,
    documentFrequency
  }
}

/**
 * Aggregate statistics across all documents (incremental, memory-efficient)
 *
 * @example
 * const stats = yield* aggregateStatistics(documents)
 */
export const aggregateStatistics = (
  documents: ReadonlyArray<Document>
): Effect.Effect<CorpusStatistics, never, NLP.NLPService> =>
  Effect.gen(function*() {
    const nlp = yield* NLP.NLPService
    let stats = emptyStatistics

    // Process documents incrementally using monoid fold
    for (const doc of documents) {
      const sentences = yield* nlp.sentencize(doc.text)
      const tokens = yield* nlp.tokenize(doc.text)
      const filtered = yield* nlp.removeStopWords(tokens)
      const stemmed = yield* nlp.stem(filtered)

      const docStats = documentStatistics(doc, stemmed, sentences)
      stats = combineStatistics(stats, docStats)
    }

    return stats
  })

/**
 * Aggregate statistics using parallel processing
 *
 * More efficient for large corpora.
 *
 * @example
 * const stats = yield* aggregateStatisticsParallel(
 *   documents,
 *   { batchSize: 100, concurrency: 10 }
 * )
 */
export const aggregateStatisticsParallel = (
  documents: ReadonlyArray<Document>,
  config: CorpusConfig = defaultCorpusConfig
): Effect.Effect<CorpusStatistics, never, NLP.NLPService> =>
  Effect.gen(function*() {
    const nlp = yield* NLP.NLPService

    // Process documents in parallel batches
    const batches = Array.chunksOf(documents, config.batchSize)
    let stats = emptyStatistics

    for (const batch of batches) {
      // Process batch in parallel
      const batchStats = yield* Effect.all(
        batch.map((doc) =>
          Effect.gen(function*() {
            const sentences = yield* nlp.sentencize(doc.text)
            const tokens = yield* nlp.tokenize(doc.text)
            const filtered = yield* nlp.removeStopWords(tokens)
            const stemmed = yield* nlp.stem(filtered)
            return documentStatistics(doc, stemmed, sentences)
          })
        ),
        { concurrency: config.concurrency }
      )

      // Combine batch statistics using monoid fold
      const batchCombined = batchStats.reduce(combineStatistics, emptyStatistics)
      stats = combineStatistics(stats, batchCombined)
    }

    return stats
  })

// =============================================================================
// TF-IDF Computation
// =============================================================================

/**
 * Compute TF (term frequency) for a document
 */
export const computeTF = (tokens: ReadonlyArray<string>): Map<string, number> => {
  const tf = new Map<string, number>()
  const total = tokens.length

  if (total === 0) return tf

  tokens.forEach((token) => {
    tf.set(token, (tf.get(token) ?? 0) + 1)
  })

  // Normalize by document length
  tf.forEach((count, term) => {
    tf.set(term, count / total)
  })

  return tf
}

/**
 * Compute IDF (inverse document frequency) from corpus statistics
 */
export const computeIDF = (
  corpusStats: CorpusStatistics
): Map<string, number> => {
  const idf = new Map<string, number>()
  const totalDocs = corpusStats.documentCount

  if (totalDocs === 0) return idf

  corpusStats.documentFrequency.forEach((docFreq, term) => {
    idf.set(term, Math.log(totalDocs / docFreq))
  })

  return idf
}

/**
 * Compute TF-IDF vectors for all documents
 *
 * @example
 * const vectors = yield* computeTFIDF(documents)
 */
export const computeTFIDF = (
  documents: ReadonlyArray<Document>,
  config: CorpusConfig = defaultCorpusConfig
): Effect.Effect<
  ReadonlyArray<{ id: string; vector: Map<string, number> }>,
  never,
  NLP.NLPService
> =>
  Effect.gen(function*() {
    const nlp = yield* NLP.NLPService

    // First pass: compute corpus statistics
    const corpusStats = yield* aggregateStatisticsParallel(documents, config)
    const idf = computeIDF(corpusStats)

    // Second pass: compute TF-IDF for each document
    const vectors = yield* processParallel(
      documents,
      (doc) =>
        Effect.gen(function*() {
          const tokens = yield* nlp.tokenize(doc.text)
          const filtered = yield* nlp.removeStopWords(tokens)
          const stemmed = yield* nlp.stem(filtered)

          const tf = computeTF(stemmed)
          const tfidf = new Map<string, number>()

          tf.forEach((tfScore, term) => {
            const idfScore = idf.get(term) ?? 0
            tfidf.set(term, tfScore * idfScore)
          })

          return tfidf
        }),
      config
    )

    return vectors.map((v) => ({ id: v.id, vector: v.features }))
  })

// =============================================================================
// Similarity Computations
// =============================================================================

/**
 * Compute cosine similarity between two TF-IDF vectors
 */
export const cosineSimilarity = (
  v1: Map<string, number>,
  v2: Map<string, number>
): number => {
  let dotProduct = 0
  let norm1 = 0
  let norm2 = 0

  // Compute dot product and norms
  const allTerms = new Set([...v1.keys(), ...v2.keys()])

  allTerms.forEach((term) => {
    const score1 = v1.get(term) ?? 0
    const score2 = v2.get(term) ?? 0

    dotProduct += score1 * score2
    norm1 += score1 * score1
    norm2 += score2 * score2
  })

  // Avoid division by zero
  if (norm1 === 0 || norm2 === 0) return 0

  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2))
}

/**
 * Compute pairwise document similarities
 *
 * Returns a map from document pair (id1, id2) to similarity score.
 *
 * @example
 * const similarities = yield* computePairwiseSimilarities(documents)
 */
export const computePairwiseSimilarities = (
  documents: ReadonlyArray<Document>,
  config: CorpusConfig = defaultCorpusConfig
): Effect.Effect<
  Map<string, Map<string, number>>,
  never,
  NLP.NLPService
> =>
  Effect.gen(function*() {
    // Compute TF-IDF vectors
    const vectors = yield* computeTFIDF(documents, config)

    // Build similarity matrix
    const similarities = new Map<string, Map<string, number>>()

    // Compute upper triangular matrix (symmetric)
    for (let i = 0; i < vectors.length; i++) {
      const v1 = vectors[i]!
      const row = new Map<string, number>()

      for (let j = i + 1; j < vectors.length; j++) {
        const v2 = vectors[j]!
        const similarity = cosineSimilarity(v1.vector, v2.vector)
        row.set(v2.id, similarity)
      }

      similarities.set(v1.id, row)
    }

    return similarities
  })

// =============================================================================
// Top-K Queries
// =============================================================================

/**
 * Get top K terms by frequency
 */
export const topTermsByFrequency = (
  stats: CorpusStatistics,
  k: number
): ReadonlyArray<[string, number]> =>
  Array.fromIterable(stats.termFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)

/**
 * Get top K documents most similar to a query document
 */
export const topSimilarDocuments = (
  queryId: string,
  similarities: Map<string, Map<string, number>>,
  k: number
): ReadonlyArray<[string, number]> => {
  const queryRow = similarities.get(queryId)
  if (!queryRow) return []

  return Array.fromIterable(queryRow.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Create documents from an array of strings
 */
export const createDocuments = (
  texts: ReadonlyArray<string>
): ReadonlyArray<Document> =>
  texts.map((text, i) => ({
    id: `doc-${i}`,
    text
  }))

/**
 * Create documents with custom IDs
 */
export const createDocumentsWithIds = (
  items: ReadonlyArray<{ id: string; text: string }>
): ReadonlyArray<Document> =>
  items.map((item) => ({
    id: item.id,
    text: item.text
  }))
