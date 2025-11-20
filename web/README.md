# Adjunct Web - Text Graph Workbench

A scientific workbench for visualizing text graph operations as functors.

## Overview

This web application provides an interactive interface for exploring the Adjunct library's text processing capabilities. It visualizes text transformations as directed acyclic graphs (DAGs), emphasizing the functional nature of operations.

## Features

- **Text Input Panel**: Enter and edit text for processing
- **Operations Panel**: Apply functional transformations (sentencize, tokenize, compose)
- **Graph Visualization**: Interactive DAG visualization with functor-oriented view
- **Node Inspector**: Detailed information about selected nodes
- **Statistics Panel**: Real-time graph metrics
- **Scientific Workbench Theme**: Dark, minimalist aesthetic inspired by lab equipment

## Architecture

### State Management

Uses Effect atoms (`@effect-atom/atom-react`) for reactive state management:
- `graphAtom`: Current graph state
- `inputTextAtom`: Input text
- `selectedNodeAtom`: Selected node for inspection
- `visualizationModeAtom`: Visualization mode (DAG, tree, functor)

### Visualization

The graph visualization uses HTML5 Canvas to render:
- **Nodes**: Circular nodes colored by operation type
- **Edges**: Curved arrows showing parent-child relationships
- **Layouts**: Automatic layout based on graph depth

### Operations

Currently supports three operations:
1. **Sentencize**: Split text into sentences
2. **Tokenize**: Split text into tokens/words
3. **Compose**: Sentencize then tokenize (demonstrates composition)

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Type check
pnpm check
```

## Technology Stack

- **React**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool
- **Effect-TS**: Functional programming runtime
- **Effect Atoms**: Reactive state management
- **IBM Plex**: Typography (Mono + Sans)

## Design Philosophy

### Scientific Workbench Aesthetic

The interface is designed to feel like a scientific instrument:
- **Dark theme**: Reduces eye strain, focuses attention on data
- **Monospace typography**: Emphasizes the computational nature
- **Subtle colors**: Accent colors inspired by lab equipment indicators
- **Minimal chrome**: Removes distractions, keeps focus on the graph

### Functor-Oriented Visualization

The visualization emphasizes the functional nature of operations:
- **Operations as morphisms**: Each transformation is a morphism between objects
- **Composition**: Shows how operations compose to form pipelines
- **DAG structure**: Preserves the categorical structure of transformations
- **Type-colored nodes**: Different colors for different operation types

## Future Enhancements

- [ ] Support for NLP operations (POS tagging, NER, etc.)
- [ ] Multiple visualization modes (tree, force-directed, hierarchical)
- [ ] Export graph to GraphViz/Mermaid formats
- [ ] Operation composition builder
- [ ] Performance metrics and benchmarking
- [ ] Custom operation definitions
- [ ] Graph diff/compare views
- [ ] Animation of graph transformations

## Integration with Core Library

The web app imports the core Adjunct library directly:
- `@adjunct/core/EffectGraph`: Core graph operations
- `@adjunct/core/TextOperations`: Text processing operations
- `@adjunct/core/NLPService`: NLP integration (future)

This provides type-safe access to all graph operations and ensures consistency between the library and visualization.

## License

MIT
