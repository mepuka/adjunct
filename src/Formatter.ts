/**
 * Formatter - Pretty printing utilities using Effect's Printer module
 *
 * Provides pure functional formatting for:
 * - Plain text (with indentation)
 * - HTML (semantic markup)
 * - Markdown (structured documents)
 * - Terminal/ANSI (colored output)
 *
 * All formatters use Effect's Printer module for consistent, composable formatting.
 */

import * as Ansi from "@effect/printer-ansi/Ansi"
import * as AnsiDoc from "@effect/printer-ansi/AnsiDoc"
import * as Color from "@effect/printer-ansi/Color"
import * as Doc from "@effect/printer/Doc"
import { pipe } from "effect/Function"
import * as Graph from "effect/Graph"
import * as Option from "effect/Option"
import type * as S from "./Schema.js"

// =============================================================================
// Type Definitions
// =============================================================================

/**
 * Output format for formatting
 */
export type Format = "text" | "html" | "markdown" | "terminal"

/**
 * Configuration for formatting
 */
export interface FormatConfig {
  readonly format: Format
  readonly width?: number
  readonly indent?: number
  readonly colors?: boolean
}

// =============================================================================
// Text Graph Formatting
// =============================================================================

/**
 * Format a TextGraph as plain text with indentation
 * Uses Graph Walker API for clean traversal
 */
export const formatTextGraph = (
  graph: Graph.DirectedGraph<S.TextNode, S.TextEdge>,
  getChildren: (
    graph: Graph.DirectedGraph<S.TextNode, S.TextEdge>,
    idx: Graph.NodeIndex
  ) => ReadonlyArray<Graph.NodeIndex>,
  getRoots: (graph: Graph.DirectedGraph<S.TextNode, S.TextEdge>) => ReadonlyArray<Graph.NodeIndex>,
  config: FormatConfig = { format: "text", width: 80, indent: 2 }
): string => {
  // Build depth map using DFS from roots
  const depthMap = new Map<Graph.NodeIndex, number>()
  const roots = getRoots(graph)

  const calculateDepth = (nodeIndex: Graph.NodeIndex, visited: Set<number>): number => {
    if (visited.has(nodeIndex)) {
      return depthMap.get(nodeIndex) ?? 0
    }
    visited.add(nodeIndex)

    // Check if it's a root
    if (roots.includes(nodeIndex)) {
      depthMap.set(nodeIndex, 0)
      return 0
    }

    // Find parent (node that has this as a child)
    let depth = 0
    for (const [idx] of Graph.nodes(graph)) {
      const children = getChildren(graph, idx)
      if (children.includes(nodeIndex)) {
        depth = calculateDepth(idx, visited) + 1
        break
      }
    }
    depthMap.set(nodeIndex, depth)
    return depth
  }

  // Calculate depths for all nodes
  const visited = new Set<number>()
  for (const [idx] of Graph.nodes(graph)) {
    calculateDepth(idx, visited)
  }

  // Use DFS walker to traverse and format
  const walker = roots.length > 0
    ? Graph.dfs(graph, { start: [...roots] })
    : Graph.dfs(graph)

  const docs = Array.from(
    walker.visit((idx, node) => {
      const depth = depthMap.get(idx) ?? 0
      const prefix = Doc.text(" ".repeat(depth * config.indent!))
      const typeLabel = Doc.text(`[${node.type}]`)
      const textContent = Doc.text(node.text.slice(0, 50))
      return pipe(
        prefix,
        Doc.cat(typeLabel),
        Doc.cat(Doc.space),
        Doc.cat(textContent)
      )
    })
  )

  const result = Doc.vsep(docs)
  return Doc.render(result, {
    style: "smart",
    options: {
      lineWidth: config.width ?? 80,
      ribbonFraction: 0.8
    }
  })
}

/**
 * Format a TextGraph as HTML with semantic markup and beautiful styling
 * Uses Graph Walker API for clean traversal
 * Creates a modern, responsive HTML document with proper hierarchy
 */
export const formatTextGraphHtml = (
  graph: Graph.DirectedGraph<S.TextNode, S.TextEdge>,
  getChildren: (
    graph: Graph.DirectedGraph<S.TextNode, S.TextEdge>,
    idx: Graph.NodeIndex
  ) => ReadonlyArray<Graph.NodeIndex>,
  getRoots: (graph: Graph.DirectedGraph<S.TextNode, S.TextEdge>) => ReadonlyArray<Graph.NodeIndex>,
  _config: FormatConfig = { format: "html", width: 80, indent: 2 }
): string => {
  // Build depth map for proper indentation
  const depthMap = new Map<Graph.NodeIndex, number>()
  const roots = getRoots(graph)

  const calculateDepth = (nodeIndex: Graph.NodeIndex, visited: Set<number>): number => {
    if (visited.has(nodeIndex)) {
      return depthMap.get(nodeIndex) ?? 0
    }
    visited.add(nodeIndex)

    if (roots.includes(nodeIndex)) {
      depthMap.set(nodeIndex, 0)
      return 0
    }

    let depth = 0
    for (const [idx] of Graph.nodes(graph)) {
      const children = getChildren(graph, idx)
      if (children.includes(nodeIndex)) {
        depth = calculateDepth(idx, visited) + 1
        break
      }
    }
    depthMap.set(nodeIndex, depth)
    return depth
  }

  const visited = new Set<number>()
  for (const [idx] of Graph.nodes(graph)) {
    calculateDepth(idx, visited)
  }

  // Build HTML using Doc for proper structure
  const htmlParts: Array<string> = []
  htmlParts.push("<!DOCTYPE html>")
  htmlParts.push("<html lang=\"en\">")
  htmlParts.push("<head>")
  htmlParts.push("  <meta charset=\"UTF-8\">")
  htmlParts.push("  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">")
  htmlParts.push("  <title>Text Processing Graph</title>")
  htmlParts.push("  <style>")
  htmlParts.push("    * { box-sizing: border-box; margin: 0; padding: 0; }")
  htmlParts.push("    body {")
  htmlParts.push("      font-family: \"SF Mono\", \"Monaco\", \"Consolas\", \"Courier New\", monospace;")
  htmlParts.push("      padding: 2rem;")
  htmlParts.push("      background: linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%);")
  htmlParts.push("      color: #d4d4d4;")
  htmlParts.push("      line-height: 1.6;")
  htmlParts.push("    }")
  htmlParts.push("    .container { max-width: 1200px; margin: 0 auto; }")
  htmlParts.push("    h1 {")
  htmlParts.push("      color: #4ec9b0;")
  htmlParts.push("      margin-bottom: 2rem;")
  htmlParts.push("      font-size: 2rem;")
  htmlParts.push("      text-align: center;")
  htmlParts.push("      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);")
  htmlParts.push("    }")
  htmlParts.push("    .graph {")
  htmlParts.push("      background: rgba(30, 30, 30, 0.8);")
  htmlParts.push("      border-radius: 8px;")
  htmlParts.push("      padding: 1.5rem;")
  htmlParts.push("      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);")
  htmlParts.push("    }")
  htmlParts.push("    .node {")
  htmlParts.push("      margin: 0.75rem 0;")
  htmlParts.push("      padding: 1rem;")
  htmlParts.push("      border-left: 4px solid;")
  htmlParts.push("      border-radius: 6px;")
  htmlParts.push("      transition: transform 0.2s, box-shadow 0.2s;")
  htmlParts.push("      backdrop-filter: blur(10px);")
  htmlParts.push("    }")
  htmlParts.push("    .node:hover {")
  htmlParts.push("      transform: translateX(4px);")
  htmlParts.push("      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);")
  htmlParts.push("    }")
  htmlParts.push("    .document {")
  htmlParts.push("      border-color: #4ec9b0;")
  htmlParts.push(
    "      background: linear-gradient(90deg, rgba(78, 201, 176, 0.15) 0%, rgba(78, 201, 176, 0.05) 100%);"
  )
  htmlParts.push("      margin-left: 0;")
  htmlParts.push("    }")
  htmlParts.push("    .sentence {")
  htmlParts.push("      border-color: #569cd6;")
  htmlParts.push(
    "      background: linear-gradient(90deg, rgba(86, 156, 214, 0.15) 0%, rgba(86, 156, 214, 0.05) 100%);"
  )
  htmlParts.push("      margin-left: 2rem;")
  htmlParts.push("    }")
  htmlParts.push("    .token {")
  htmlParts.push("      border-color: #ce9178;")
  htmlParts.push(
    "      background: linear-gradient(90deg, rgba(206, 145, 120, 0.15) 0%, rgba(206, 145, 120, 0.05) 100%);"
  )
  htmlParts.push("      margin-left: 4rem;")
  htmlParts.push("    }")
  htmlParts.push("    .type {")
  htmlParts.push("      font-weight: bold;")
  htmlParts.push("      color: #9cdcfe;")
  htmlParts.push("      font-size: 0.9em;")
  htmlParts.push("      text-transform: uppercase;")
  htmlParts.push("      letter-spacing: 0.5px;")
  htmlParts.push("    }")
  htmlParts.push("    .text {")
  htmlParts.push("      color: #d4d4d4;")
  htmlParts.push("      margin-left: 0.5rem;")
  htmlParts.push("    }")
  htmlParts.push("    .meta {")
  htmlParts.push("      color: #808080;")
  htmlParts.push("      font-size: 0.85em;")
  htmlParts.push("      margin-top: 0.5rem;")
  htmlParts.push("      font-style: italic;")
  htmlParts.push("    }")
  htmlParts.push("    @media (max-width: 768px) {")
  htmlParts.push("      body { padding: 1rem; }")
  htmlParts.push("      .sentence { margin-left: 1rem; }")
  htmlParts.push("      .token { margin-left: 2rem; }")
  htmlParts.push("    }")
  htmlParts.push("  </style>")
  htmlParts.push("</head>")
  htmlParts.push("<body>")
  htmlParts.push("  <div class=\"container\">")
  htmlParts.push("    <h1>📊 Text Processing Graph</h1>")
  htmlParts.push("    <div class=\"graph\">")

  // Use DFS walker to traverse nodes with depth information
  const walker = roots.length > 0
    ? Graph.dfs(graph, { start: [...roots] })
    : Graph.dfs(graph)

  for (const [idx, node] of Graph.entries(walker)) {
    const depth = depthMap.get(idx) ?? 0
    const escapedText = node.text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")

    const indentStyle = depth > 0 ? `style="margin-left: ${depth * 2}rem;"` : ""
    htmlParts.push(`      <div class="node ${node.type}" ${indentStyle}>`)
    htmlParts.push(`        <span class="type">[${node.type}]</span>`)
    htmlParts.push(`        <span class="text">${escapedText.slice(0, 100)}</span>`)
    if (node.text.length > 100) {
      htmlParts.push(`        <div class="meta">... (${node.text.length - 100} more characters)</div>`)
    }
    Option.match(
      Option.fromNullable(node.operation),
      {
        onNone: () => {},
        onSome: (op: string) => {
          htmlParts.push(`        <div class="meta">Operation: ${op}</div>`)
        }
      }
    )
    htmlParts.push(`      </div>`)
  }

  htmlParts.push("    </div>")
  htmlParts.push("  </div>")
  htmlParts.push("</body>")
  htmlParts.push("</html>")

  return htmlParts.join("\n")
}

/**
 * Format a TextGraph as Markdown with proper hierarchy
 * Uses Graph Walker API with depth calculation
 */
export const formatTextGraphMarkdown = (
  graph: Graph.DirectedGraph<S.TextNode, S.TextEdge>,
  getChildren: (
    graph: Graph.DirectedGraph<S.TextNode, S.TextEdge>,
    idx: Graph.NodeIndex
  ) => ReadonlyArray<Graph.NodeIndex>,
  getRoots: (graph: Graph.DirectedGraph<S.TextNode, S.TextEdge>) => ReadonlyArray<Graph.NodeIndex>,
  _config: FormatConfig = { format: "markdown", width: 80, indent: 2 }
): string => {
  const lines: Array<string> = []
  lines.push("# Text Processing Graph\n")

  // Build depth map
  const depthMap = new Map<Graph.NodeIndex, number>()
  const roots = getRoots(graph)

  const calculateDepth = (nodeIndex: Graph.NodeIndex, visited: Set<number>): number => {
    if (visited.has(nodeIndex)) {
      return depthMap.get(nodeIndex) ?? 0
    }
    visited.add(nodeIndex)

    if (roots.includes(nodeIndex)) {
      depthMap.set(nodeIndex, 0)
      return 0
    }

    let depth = 0
    for (const [idx] of Graph.nodes(graph)) {
      const children = getChildren(graph, idx)
      if (children.includes(nodeIndex)) {
        depth = calculateDepth(idx, visited) + 1
        break
      }
    }
    depthMap.set(nodeIndex, depth)
    return depth
  }

  const visited = new Set<number>()
  for (const [idx] of Graph.nodes(graph)) {
    calculateDepth(idx, visited)
  }

  // Use DFS walker to traverse and format
  const walker = roots.length > 0
    ? Graph.dfs(graph, { start: [...roots] })
    : Graph.dfs(graph)

  for (const [idx, node] of Graph.entries(walker)) {
    const level = depthMap.get(idx) ?? 0
    const heading = "#".repeat(Math.min(level + 2, 6))
    const typeBadge = `\`${node.type}\``
    const textPreview = node.text.length > 100
      ? `${node.text.slice(0, 100)}...`
      : node.text

    lines.push(`${heading} ${typeBadge} ${textPreview}\n`)

    if (node.text.length > 100) {
      lines.push(`> Full text: ${node.text.replace(/\n/g, " ")}\n`)
    }

    Option.match(
      Option.fromNullable(node.operation),
      {
        onNone: () => {},
        onSome: (op: string) => {
          lines.push(`*Operation: \`${op}\`*\n`)
        }
      }
    )

    lines.push("") // Empty line for spacing
  }

  return lines.join("\n")
}

/**
 * Format a TextGraph for terminal with ANSI colors
 * Uses Graph Walker API for clean traversal with beautiful colors
 */
export const formatTextGraphTerminal = (
  graph: Graph.DirectedGraph<S.TextNode, S.TextEdge>,
  getChildren: (
    graph: Graph.DirectedGraph<S.TextNode, S.TextEdge>,
    idx: Graph.NodeIndex
  ) => ReadonlyArray<Graph.NodeIndex>,
  getRoots: (graph: Graph.DirectedGraph<S.TextNode, S.TextEdge>) => ReadonlyArray<Graph.NodeIndex>,
  config: FormatConfig = { format: "terminal", width: 80, indent: 2, colors: true }
): string => {
  const getTypeColor = (type: S.TextNode["type"]): Color.Color => {
    switch (type) {
      case "document":
        return Color.cyan
      case "sentence":
        return Color.blue
      case "token":
        return Color.yellow
      default:
        return Color.white
    }
  }

  // Build depth map for indentation
  const depthMap = new Map<Graph.NodeIndex, number>()
  const roots = getRoots(graph)

  const calculateDepth = (nodeIndex: Graph.NodeIndex, visited: Set<number>): number => {
    if (visited.has(nodeIndex)) {
      return depthMap.get(nodeIndex) ?? 0
    }
    visited.add(nodeIndex)

    if (roots.includes(nodeIndex)) {
      depthMap.set(nodeIndex, 0)
      return 0
    }

    let depth = 0
    for (const [idx] of Graph.nodes(graph)) {
      const children = getChildren(graph, idx)
      if (children.includes(nodeIndex)) {
        depth = calculateDepth(idx, visited) + 1
        break
      }
    }
    depthMap.set(nodeIndex, depth)
    return depth
  }

  const visited = new Set<number>()
  for (const [idx] of Graph.nodes(graph)) {
    calculateDepth(idx, visited)
  }

  // Use DFS walker to traverse and format with colors
  const walker = roots.length > 0
    ? Graph.dfs(graph, { start: [...roots] })
    : Graph.dfs(graph)

  const docs = Array.from(
    walker.visit((idx, node) => {
      const depth = depthMap.get(idx) ?? 0
      const prefix = AnsiDoc.text(" ".repeat(depth * config.indent!))
      const typeColor = getTypeColor(node.type)
      const typeLabel = pipe(
        AnsiDoc.text(`[${node.type}]`),
        AnsiDoc.annotate(Ansi.color(typeColor)),
        AnsiDoc.annotate(Ansi.bold)
      )
      const textContent = AnsiDoc.text(node.text.slice(0, 50))
      return pipe(
        prefix,
        AnsiDoc.cat(typeLabel),
        AnsiDoc.cat(AnsiDoc.text(" ")),
        AnsiDoc.cat(textContent)
      )
    })
  )

  const result = AnsiDoc.vsep(docs)
  return AnsiDoc.render(result, {
    style: "pretty"
  })
}

// =============================================================================
// Unified Formatting Function
// =============================================================================

/**
 * Format a TextGraph in the specified format
 */
export const formatGraph = (
  graph: Graph.DirectedGraph<S.TextNode, S.TextEdge>,
  getChildren: (
    graph: Graph.DirectedGraph<S.TextNode, S.TextEdge>,
    idx: Graph.NodeIndex
  ) => ReadonlyArray<Graph.NodeIndex>,
  getRoots: (graph: Graph.DirectedGraph<S.TextNode, S.TextEdge>) => ReadonlyArray<Graph.NodeIndex>,
  config: FormatConfig = { format: "text", width: 80, indent: 2 }
): string => {
  switch (config.format) {
    case "text":
      return formatTextGraph(graph, getChildren, getRoots, config)
    case "html":
      return formatTextGraphHtml(graph, getChildren, getRoots, config)
    case "markdown":
      return formatTextGraphMarkdown(graph, getChildren, getRoots, config)
    case "terminal":
      return formatTextGraphTerminal(graph, getChildren, getRoots, config)
  }
}

// =============================================================================
// EffectGraph Formatting
// =============================================================================

/**
 * Format an EffectGraph for terminal with ANSI colors
 * Accepts graph operations as parameters to avoid circular dependency
 */
export const formatEffectGraphTerminal = <A>(
  graph: any, // EffectGraph<A> - using any to avoid circular import
  getNode: (graph: any, nodeId: any) => Option.Option<any>,
  getChildren: (graph: any, nodeId: any) => ReadonlyArray<any>,
  getRoots: (graph: any) => ReadonlyArray<any>,
  showData: (a: A) => string,
  config: FormatConfig = { format: "terminal", width: 80, indent: 2, colors: true }
): string => {
  const docs: Array<AnsiDoc.AnsiDoc> = []

  const visit = (
    nodeId: any,
    indent: number,
    visited: Set<any>
  ): void => {
    if (visited.has(nodeId)) return
    visited.add(nodeId)

    const nodeOption = getNode(graph, nodeId)
    if (Option.isNone(nodeOption)) return

    const node = Option.getOrThrow(nodeOption)
    const prefix = AnsiDoc.text(" ".repeat(indent))
    const op = Option.match(node.metadata.operation, {
      onNone: () => "root",
      onSome: (o: string) => o
    })
    const opLabel = pipe(
      AnsiDoc.text(`[${op}]`),
      AnsiDoc.annotate(Ansi.color(Color.magenta))
    )
    const dataContent = AnsiDoc.text(showData(node.data).slice(0, 50))
    const doc = pipe(
      prefix,
      AnsiDoc.cat(opLabel),
      AnsiDoc.cat(AnsiDoc.text(" ")),
      AnsiDoc.cat(dataContent)
    )
    docs.push(doc)

    const children = getChildren(graph, nodeId)
    children.forEach((child: any) => visit(child.id, indent + config.indent!, visited))
  }

  const roots = getRoots(graph)
  const visited = new Set<any>()
  roots.forEach((root: any) => visit(root.id, 0, visited))

  const result = AnsiDoc.vsep(docs)
  return AnsiDoc.render(result, {
    style: "pretty"
  })
}

// =============================================================================
// Utility Formatters
// =============================================================================

/**
 * Create a styled header for terminal output
 */
export const header = (text: string): string => {
  const doc = pipe(
    AnsiDoc.text("═".repeat(60)),
    AnsiDoc.cat(AnsiDoc.line),
    AnsiDoc.cat(
      pipe(
        AnsiDoc.text(text),
        AnsiDoc.annotate(Ansi.bold),
        AnsiDoc.annotate(Ansi.color(Color.cyan))
      )
    ),
    AnsiDoc.cat(AnsiDoc.line),
    AnsiDoc.cat(AnsiDoc.text("═".repeat(60)))
  )
  return AnsiDoc.render(doc, { style: "pretty" })
}

/**
 * Create a styled section title
 */
export const section = (text: string): string => {
  const doc = pipe(
    AnsiDoc.text("\n"),
    AnsiDoc.cat(
      pipe(
        AnsiDoc.text(`▶ ${text}`),
        AnsiDoc.annotate(Ansi.bold),
        AnsiDoc.annotate(Ansi.color(Color.blue))
      )
    ),
    AnsiDoc.cat(AnsiDoc.line)
  )
  return AnsiDoc.render(doc, { style: "pretty" })
}

/**
 * Create a styled info message
 */
export const info = (text: string): string => {
  const doc = pipe(
    AnsiDoc.text("ℹ "),
    AnsiDoc.cat(
      pipe(
        AnsiDoc.text(text),
        AnsiDoc.annotate(Ansi.color(Color.cyan))
      )
    )
  )
  return AnsiDoc.render(doc, { style: "pretty" })
}

/**
 * Create a styled success message
 */
export const success = (text: string): string => {
  const doc = pipe(
    AnsiDoc.text("✓ "),
    AnsiDoc.cat(
      pipe(
        AnsiDoc.text(text),
        AnsiDoc.annotate(Ansi.color(Color.green))
      )
    )
  )
  return AnsiDoc.render(doc, { style: "pretty" })
}

/**
 * Create a styled warning message
 */
export const warning = (text: string): string => {
  const doc = pipe(
    AnsiDoc.text("⚠ "),
    AnsiDoc.cat(
      pipe(
        AnsiDoc.text(text),
        AnsiDoc.annotate(Ansi.color(Color.yellow))
      )
    )
  )
  return AnsiDoc.render(doc, { style: "pretty" })
}

/**
 * Create a styled error message
 */
export const error = (text: string): string => {
  const doc = pipe(
    AnsiDoc.text("✗ "),
    AnsiDoc.cat(
      pipe(
        AnsiDoc.text(text),
        AnsiDoc.annotate(Ansi.color(Color.red))
      )
    )
  )
  return AnsiDoc.render(doc, { style: "pretty" })
}
