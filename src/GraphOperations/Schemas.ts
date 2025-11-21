/**
 * Effect Schema definitions for GraphOperations domain types
 *
 * Provides type-safe serialization, deserialization, and validation
 * for all graph operation domain types.
 */

import * as Duration from "effect/Duration"
import * as Schema from "effect/Schema"
import type { NodeId } from "../EffectGraph.js"
import { NodeId as NodeIdConstructor } from "../EffectGraph.js"
import type { ExecutionId, ExecutionMetrics, ExecutionOptions, OperationCost, OperationResult } from "./Types.js"
import { ExecutionId as ExecutionIdConstructor } from "./Types.js"

// =============================================================================
// Duration Schema (transforms between Duration and milliseconds)
// =============================================================================

/**
 * Note: Duration conversion is handled directly in struct transforms
 * to avoid type inference issues with transform
 */

// =============================================================================
// Execution Strategy Schema
// =============================================================================

/**
 * Schema for ExecutionStrategy using TaggedStruct
 */
export const ExecutionStrategySchema = Schema.Union(
  Schema.TaggedStruct("Sequential", {}),
  Schema.TaggedStruct("Parallel", {
    concurrency: Schema.Number
  }),
  Schema.TaggedStruct("Batch", {
    batchSize: Schema.Number
  }),
  Schema.TaggedStruct("Streaming", {})
)

// =============================================================================
// Execution ID Schema
// =============================================================================

/**
 * Schema for ExecutionId (branded string)
 * Uses transform to apply the make constructor
 */
export const ExecutionIdSchema = Schema.transform(
  Schema.String,
  Schema.String,
  {
    strict: false,
    decode: (s: string) => ExecutionIdConstructor.make(s) as ExecutionId,
    encode: (_toI: string, toA: string) => (toA as ExecutionId) as string
  }
)

// =============================================================================
// NodeId Schema
// =============================================================================

/**
 * Schema for NodeId (branded string)
 * Uses transform to apply the make constructor
 */
export const NodeIdSchema = Schema.transform(
  Schema.String,
  Schema.String,
  {
    strict: false,
    decode: (s: string) => NodeIdConstructor.make(s) as NodeId,
    encode: (_toI: string, toA: string) => (toA as NodeId) as string
  }
)

// =============================================================================
// Execution Metrics Schema
// =============================================================================

/**
 * Schema for ExecutionMetrics (serialized form - Duration as milliseconds)
 */
const ExecutionMetricsSerializedSchema = Schema.Struct({
  duration: Schema.Number, // milliseconds
  nodesProcessed: Schema.Number,
  nodesCreated: Schema.Number,
  tokensConsumed: Schema.Number,
  cacheHits: Schema.Number,
  cacheMisses: Schema.Number
})

/**
 * Schema for ExecutionMetrics
 * Transforms between ExecutionMetrics (with Duration) and serialized form (with number)
 */
export const ExecutionMetricsSchema = Schema.transform(
  ExecutionMetricsSerializedSchema,
  Schema.Struct({
    duration: Schema.Number,
    nodesProcessed: Schema.Number,
    nodesCreated: Schema.Number,
    tokensConsumed: Schema.Number,
    cacheHits: Schema.Number,
    cacheMisses: Schema.Number
  }),
  {
    strict: false,
    decode: (serialized) =>
      ({
        duration: Duration.millis(serialized.duration) as Duration.Duration,
        nodesProcessed: serialized.nodesProcessed,
        nodesCreated: serialized.nodesCreated,
        tokensConsumed: serialized.tokensConsumed,
        cacheHits: serialized.cacheHits,
        cacheMisses: serialized.cacheMisses
      }) as ExecutionMetrics,
    encode: (_toI, metrics) => ({
      duration: Duration.toMillis(metrics.duration),
      nodesProcessed: metrics.nodesProcessed,
      nodesCreated: metrics.nodesCreated,
      tokensConsumed: metrics.tokensConsumed,
      cacheHits: metrics.cacheHits,
      cacheMisses: metrics.cacheMisses
    })
  }
)

// =============================================================================
// Operation Cost Schema
// =============================================================================

/**
 * Schema for OperationCost (serialized form - Duration as milliseconds)
 */
const OperationCostSerializedSchema = Schema.Struct({
  estimatedTime: Schema.Number, // milliseconds
  tokenCost: Schema.Number,
  memoryCost: Schema.Number,
  complexity: Schema.Literal("O(1)", "O(n)", "O(n log n)", "O(n²)")
})

/**
 * Schema for OperationCost
 * Transforms between OperationCost (with Duration) and serialized form (with number)
 */
export const OperationCostSchema = Schema.transform(
  OperationCostSerializedSchema,
  Schema.Struct({
    estimatedTime: Schema.Number,
    tokenCost: Schema.Number,
    memoryCost: Schema.Number,
    complexity: Schema.Literal("O(1)", "O(n)", "O(n log n)", "O(n²)")
  }),
  {
    strict: false,
    decode: (serialized) =>
      ({
        estimatedTime: Duration.millis(serialized.estimatedTime) as Duration.Duration,
        tokenCost: serialized.tokenCost,
        memoryCost: serialized.memoryCost,
        complexity: serialized.complexity
      }) as OperationCost,
    encode: (_toI, cost) => ({
      estimatedTime: Duration.toMillis(cost.estimatedTime),
      tokenCost: cost.tokenCost,
      memoryCost: cost.memoryCost,
      complexity: cost.complexity
    })
  }
)

// =============================================================================
// Validation Result Schema
// =============================================================================

/**
 * Schema for ValidationResult
 */
export const ValidationResultSchema = Schema.Struct({
  valid: Schema.Boolean,
  errors: Schema.Array(Schema.String),
  warnings: Schema.Array(Schema.String)
})

// =============================================================================
// Operation Category Schema
// =============================================================================

/**
 * Schema for OperationCategory
 */
export const OperationCategorySchema = Schema.Literal(
  "transformation",
  "expansion",
  "aggregation",
  "filtering",
  "composition",
  "llm"
)

// =============================================================================
// Execution Options Schema
// =============================================================================

/**
 * Schema for ExecutionOptions (serialized form - Duration as milliseconds)
 */
const ExecutionOptionsSerializedSchema = Schema.Struct({
  strategy: ExecutionStrategySchema,
  cache: Schema.Boolean,
  trace: Schema.Boolean,
  timeout: Schema.Union(Schema.Null, Schema.Number) // milliseconds or null
})

/**
 * Schema for ExecutionOptions
 * Transforms between ExecutionOptions (with Duration) and serialized form (with number)
 */
export const ExecutionOptionsSchema = Schema.transform(
  ExecutionOptionsSerializedSchema,
  Schema.Struct({
    strategy: ExecutionStrategySchema,
    cache: Schema.Boolean,
    trace: Schema.Boolean,
    timeout: Schema.Union(Schema.Null, Schema.Number)
  }),
  {
    strict: false,
    decode: (serialized) =>
      ({
        strategy: serialized.strategy,
        cache: serialized.cache,
        trace: serialized.trace,
        timeout: serialized.timeout === null ? null : (Duration.millis(serialized.timeout) as Duration.Duration)
      }) as ExecutionOptions,
    encode: (_toI, options) => ({
      strategy: options.strategy,
      cache: options.cache,
      trace: options.trace,
      timeout: options.timeout === null ? null : Duration.toMillis(options.timeout)
    })
  }
)

// =============================================================================
// Graph Node Schema (simplified for serialization)
// =============================================================================

/**
 * Schema for GraphNode data (simplified - stores data as JSON)
 * Note: This is a simplified schema for serialization.
 * The actual GraphNode type may have more complex structure.
 */
export const GraphNodeDataSchema = Schema.Struct({
  id: NodeIdSchema,
  data: Schema.Unknown, // Store as JSON-serializable
  parentId: Schema.optional(Schema.Union(Schema.Null, NodeIdSchema)),
  metadata: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Unknown }))
})

export type GraphNodeData = Schema.Schema.Type<typeof GraphNodeDataSchema>

// =============================================================================
// Operation Result Schema
// =============================================================================

/**
 * Schema for OperationResult (serialized form)
 * Generic types A, B, E are represented as Unknown in the schema
 * for serialization purposes
 */
const OperationResultSerializedSchema = Schema.Struct({
  executionId: ExecutionIdSchema,
  originalGraph: Schema.Unknown, // Graph reference - not serialized
  newNodes: Schema.Array(GraphNodeDataSchema),
  errors: Schema.Array(Schema.Unknown), // Errors are serialized as JSON
  metrics: ExecutionMetricsSerializedSchema,
  timestamp: Schema.Number
})

/**
 * Schema for OperationResult
 * Note: Generic types A, B, E are not fully type-safe in the schema
 * but are preserved in the TypeScript type system
 */
export const OperationResultSchema = <A = unknown, B = unknown, E = unknown>() =>
  Schema.transform(
    OperationResultSerializedSchema,
    Schema.Struct({
      executionId: ExecutionIdSchema,
      originalGraph: Schema.Unknown,
      newNodes: Schema.Array(GraphNodeDataSchema),
      errors: Schema.Array(Schema.Unknown),
      metrics: ExecutionMetricsSerializedSchema,
      timestamp: Schema.Number
    }),
    {
      strict: false, // Allow type flexibility for generic types
      decode: (serialized) => ({
        executionId: serialized.executionId,
        originalGraph: serialized.originalGraph,
        newNodes: serialized.newNodes,
        errors: serialized.errors,
        metrics: {
          duration: Duration.millis(serialized.metrics.duration) as Duration.Duration,
          nodesProcessed: serialized.metrics.nodesProcessed,
          nodesCreated: serialized.metrics.nodesCreated,
          tokensConsumed: serialized.metrics.tokensConsumed,
          cacheHits: serialized.metrics.cacheHits,
          cacheMisses: serialized.metrics.cacheMisses
        } as ExecutionMetrics,
        timestamp: serialized.timestamp
      } as unknown as OperationResult<A, B, E>),
      encode: (result) => ({
        executionId: result.executionId,
        originalGraph: result.originalGraph,
        newNodes: result.newNodes.map((node) => ({
          id: node.id,
          data: node.data,
          parentId: node.parentId,
          metadata: node.metadata
        })),
        errors: result.errors,
        metrics: {
          duration: Duration.toMillis(result.metrics.duration),
          nodesProcessed: result.metrics.nodesProcessed,
          nodesCreated: result.metrics.nodesCreated,
          tokensConsumed: result.metrics.tokensConsumed,
          cacheHits: result.metrics.cacheHits,
          cacheMisses: result.metrics.cacheMisses
        },
        timestamp: result.timestamp
      })
    }
  )

// =============================================================================
// Error Schemas
// =============================================================================

/**
 * Schema for ValidationError
 */
export const ValidationErrorSchema = Schema.TaggedStruct("ValidationError", {
  nodeId: NodeIdSchema,
  operationName: Schema.String,
  errors: Schema.Array(Schema.String)
})

/**
 * Schema for TimeoutError
 */
export const TimeoutErrorSchema = Schema.TaggedStruct("TimeoutError", {
  operationName: Schema.String,
  nodeId: NodeIdSchema,
  timeoutMs: Schema.Number
})

/**
 * Schema for OperationError
 */
export const OperationErrorSchema = Schema.TaggedStruct("OperationError", {
  operationName: Schema.String,
  nodeId: NodeIdSchema,
  cause: Schema.Unknown
})

/**
 * Schema for GraphError
 */
export const GraphErrorSchema = Schema.TaggedStruct("GraphError", {
  message: Schema.String,
  nodeId: Schema.optional(NodeIdSchema)
})

/**
 * Schema for StorageError
 */
export const StorageErrorSchema = Schema.TaggedStruct("StorageError", {
  operation: Schema.Literal("store", "retrieve", "delete", "query"),
  cause: Schema.Unknown
})

/**
 * Schema for ExecutionError
 */
export const ExecutionErrorSchema = Schema.TaggedStruct("ExecutionError", {
  message: Schema.String,
  cause: Schema.optional(Schema.Unknown)
})

/**
 * Union schema for all graph operation errors
 */
export const GraphOperationErrorSchema = Schema.Union(
  ValidationErrorSchema,
  TimeoutErrorSchema,
  OperationErrorSchema,
  GraphErrorSchema,
  StorageErrorSchema,
  ExecutionErrorSchema
)

export type GraphOperationError = Schema.Schema.Type<typeof GraphOperationErrorSchema>

// =============================================================================
// Result Key Schema
// =============================================================================

/**
 * Schema for ResultKey (used in ResultStore)
 */
export const ResultKeySchema = Schema.Struct({
  operationName: Schema.String,
  nodeId: NodeIdSchema
})

export type ResultKey = Schema.Schema.Type<typeof ResultKeySchema>

// =============================================================================
// Helper Functions for Serialization
// =============================================================================

/**
 * Serialize ExecutionMetrics to JSON
 * Converts Duration to milliseconds
 */
export const serializeExecutionMetrics = (metrics: ExecutionMetrics): unknown => ({
  duration: Duration.toMillis(metrics.duration),
  nodesProcessed: metrics.nodesProcessed,
  nodesCreated: metrics.nodesCreated,
  tokensConsumed: metrics.tokensConsumed,
  cacheHits: metrics.cacheHits,
  cacheMisses: metrics.cacheMisses
})

/**
 * Deserialize ExecutionMetrics from JSON
 * Converts milliseconds to Duration
 */
export const deserializeExecutionMetrics = (data: unknown) => Schema.decodeUnknown(ExecutionMetricsSchema)(data)

/**
 * Serialize OperationResult to JSON
 * Note: This serializes the structure but not the generic type parameters
 */
export const serializeOperationResult = <A, B, E>(result: OperationResult<A, B, E>) =>
  Schema.encode(OperationResultSchema<A, B, E>())(result as any)

/**
 * Deserialize OperationResult from JSON
 */
export const deserializeOperationResult = <A, B, E>(data: unknown) =>
  Schema.decodeUnknown(OperationResultSchema<A, B, E>())(data)

/**
 * Serialize ExecutionOptions to JSON
 * Converts Duration to milliseconds
 */
export const serializeExecutionOptions = (options: ExecutionOptions) =>
  Schema.encode(ExecutionOptionsSchema)(options as any)

/**
 * Deserialize ExecutionOptions from JSON
 * Converts milliseconds to Duration
 */
export const deserializeExecutionOptions = (data: unknown) => Schema.decodeUnknown(ExecutionOptionsSchema)(data)
