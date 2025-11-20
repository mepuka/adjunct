# Searching Effect Documentation Locally

This guide shows you how to search the locally generated Effect API documentation using grep and other command-line tools.

## Documentation Location

The Effect documentation is generated at:
```
/Users/pooks/Dev/effect-repo/packages/*/docs/
```

Key locations:
- **Core Effect**: `/Users/pooks/Dev/effect-repo/packages/effect/docs/`
- **Platform**: `/Users/pooks/Dev/effect-repo/packages/platform/docs/`
- **CLI**: `/Users/pooks/Dev/effect-repo/packages/cli/docs/`
- **SQL**: `/Users/pooks/Dev/effect-repo/packages/sql/docs/`
- **All packages**: See full list with `ls /Users/pooks/Dev/effect-repo/packages/*/docs/`

## Documentation Structure

Each package contains:
```
docs/
├── _config.yml
├── index.md
└── modules/
    ├── Array.ts.md      (143,723 lines total across all modules)
    ├── Effect.ts.md     (largest and most important)
    ├── Stream.ts.md
    └── ...
```

Each module file contains:
- Overview section
- Exports grouped by category
- Detailed function documentation with:
  - Description
  - Type signatures
  - Code examples
  - Since version tags

## Quick Search Examples

### 1. Find a Function by Name

```bash
# Search for a specific function (e.g., "pipe")
grep -n "^## pipe" /Users/pooks/Dev/effect-repo/packages/effect/docs/modules/*.md

# Find all occurrences of a function name
grep -r "^## flatMap" /Users/pooks/Dev/effect-repo/packages/effect/docs/

# Case-insensitive search
grep -ri "^## retry" /Users/pooks/Dev/effect-repo/packages/*/docs/
```

### 2. Search Within Function Documentation

```bash
# Find functions that mention "error handling" in their description
grep -A 10 "^## " /Users/pooks/Dev/effect-repo/packages/effect/docs/modules/Effect.ts.md | \
  grep -B 10 "error handling"

# Find all functions in a category (e.g., "Caching")
grep -A 200 "^- \[Caching\]" /Users/pooks/Dev/effect-repo/packages/effect/docs/modules/Effect.ts.md
```

### 3. Search for Code Examples

```bash
# Find examples using a specific pattern
grep -r "Effect.all" /Users/pooks/Dev/effect-repo/packages/effect/docs/modules/

# Find examples with specific imports
grep -r "import.*Effect.*from" /Users/pooks/Dev/effect-repo/packages/effect/docs/

# Search for usage patterns (e.g., pipe usage)
grep -A 5 "pipe(" /Users/pooks/Dev/effect-repo/packages/effect/docs/modules/Effect.ts.md
```

### 4. Find Type Signatures

```bash
# Search for a specific type
grep -r "Effect<" /Users/pooks/Dev/effect-repo/packages/effect/docs/modules/Effect.ts.md | head -20

# Find interface definitions
grep -n "^### .* (interface)" /Users/pooks/Dev/effect-repo/packages/effect/docs/modules/*.md

# Find type aliases
grep -n "^### .* (type alias)" /Users/pooks/Dev/effect-repo/packages/effect/docs/modules/*.md
```

### 5. Browse by Category

```bash
# List all categories in Effect module
grep "^- \[" /Users/pooks/Dev/effect-repo/packages/effect/docs/modules/Effect.ts.md

# Common categories to explore:
# - Caching
# - Error Handling
# - Concurrency
# - Resources
# - Collecting
# - Filtering
```

### 6. Search Across All Packages

```bash
# Find a concept across all Effect packages
grep -r "retry" /Users/pooks/Dev/effect-repo/packages/*/docs/modules/*.md

# List all packages with documentation
ls -d /Users/pooks/Dev/effect-repo/packages/*/docs/

# Count functions per package
for pkg in /Users/pooks/Dev/effect-repo/packages/*/docs/modules; do
  echo "$(basename $(dirname $(dirname $pkg))): $(grep -c "^## " $pkg/*.md 2>/dev/null | awk -F: '{sum+=$2} END {print sum}')"
done
```

## Advanced Search Patterns

### Multi-Step Searches

```bash
# Find all functions related to errors
grep "^## " /Users/pooks/Dev/effect-repo/packages/effect/docs/modules/Effect.ts.md | \
  grep -i "error\|fail\|catch"

# Find functions with specific return types
grep -A 5 "^## " /Users/pooks/Dev/effect-repo/packages/effect/docs/modules/Effect.ts.md | \
  grep "Effect<.*never.*>"

# Search for functions with examples
grep -B 5 "```ts" /Users/pooks/Dev/effect-repo/packages/effect/docs/modules/Effect.ts.md | \
  grep "^## "
```

### Context-Aware Searches

```bash
# Get full documentation for a specific function
function effect_doc() {
  local func_name=$1
  local file=${2:-Effect.ts.md}
  awk "/^## $func_name\$/,/^## /" /Users/pooks/Dev/effect-repo/packages/effect/docs/modules/$file | \
    head -n -1
}

# Usage: effect_doc "flatMap"
# Usage: effect_doc "retry" "Stream.ts.md"
```

### Finding Related Functions

```bash
# Find all functions in the same category as a target function
function find_category() {
  local func_name=$1
  grep -B 100 "  - \[$func_name\]" /Users/pooks/Dev/effect-repo/packages/effect/docs/modules/Effect.ts.md | \
    grep "^- \[" | tail -1
}

# Find all functions in a specific category
function list_category() {
  local category=$1
  awk "/^- \[$category\]/,/^- \[/" /Users/pooks/Dev/effect-repo/packages/effect/docs/modules/Effect.ts.md | \
    grep "  - \[" | sed 's/.*\[\(.*\)\].*/\1/'
}

# Usage: list_category "Error Handling"
```

## Useful Shell Aliases

Add these to your `~/.bashrc` or `~/.zshrc`:

```bash
# Quick access to Effect docs root
export EFFECT_DOCS="/Users/pooks/Dev/effect-repo/packages"

# Search Effect core documentation
alias effect-search='grep -rn "$1" $EFFECT_DOCS/effect/docs/modules/'

# Find a function by name
alias effect-find='grep -n "^## $1" $EFFECT_DOCS/effect/docs/modules/*.md'

# List all Effect modules
alias effect-modules='ls $EFFECT_DOCS/effect/docs/modules/'

# Open Effect.ts.md (if you have less or a text viewer)
alias effect-main='less $EFFECT_DOCS/effect/docs/modules/Effect.ts.md'

# Search all packages
alias effect-search-all='grep -rn "$1" $EFFECT_DOCS/*/docs/modules/'

# Quick function documentation viewer
effect_doc() {
  local func=$1
  local module=${2:-Effect.ts.md}
  awk "/^## $func\$/,/^## /" $EFFECT_DOCS/effect/docs/modules/$module | head -n -1 | less
}
```

## Common Search Workflows

### 1. "How do I...?" Workflow

```bash
# Example: "How do I handle errors?"
grep -ri "handle.*error\|error.*handling" $EFFECT_DOCS/effect/docs/modules/Effect.ts.md

# Example: "How do I retry?"
grep -n "^## retry" $EFFECT_DOCS/effect/docs/modules/*.md
effect_doc "retry"
```

### 2. "What functions work with...?" Workflow

```bash
# Example: "What functions work with Arrays?"
grep -n "^## " $EFFECT_DOCS/effect/docs/modules/Array.ts.md | wc -l  # count functions
grep "^- \[" $EFFECT_DOCS/effect/docs/modules/Array.ts.md  # list categories

# Example: "What Stream functions are available?"
ls $EFFECT_DOCS/effect/docs/modules/ | grep -i stream
```

### 3. "Show me examples of...?" Workflow

```bash
# Find code examples of a pattern
grep -A 20 "```ts" $EFFECT_DOCS/effect/docs/modules/Effect.ts.md | grep -A 15 "Effect.all"

# Find all examples in a specific module
grep -c "```ts" $EFFECT_DOCS/effect/docs/modules/Effect.ts.md  # count examples
```

### 4. "What's the signature of...?" Workflow

```bash
# Get function signature (usually after the ## heading)
grep -A 3 "^## flatMap" $EFFECT_DOCS/effect/docs/modules/Effect.ts.md
```

## Integration with Development Tools

### VS Code Integration

Create `.vscode/tasks.json`:

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Search Effect Docs",
      "type": "shell",
      "command": "grep -rn '${input:searchTerm}' /Users/pooks/Dev/effect-repo/packages/effect/docs/modules/",
      "problemMatcher": []
    }
  ],
  "inputs": [
    {
      "id": "searchTerm",
      "type": "promptString",
      "description": "Enter search term"
    }
  ]
}
```

### FZF Integration (Fuzzy Finder)

If you have `fzf` installed:

```bash
# Fuzzy search through all function names
grep -h "^## " $EFFECT_DOCS/effect/docs/modules/*.md | \
  sed 's/^## //' | \
  fzf --preview 'effect_doc {} 2>/dev/null || echo "Not found"'
```

## Key Modules to Know

| Module | Description | Line Count (approx) |
|--------|-------------|---------------------|
| `Effect.ts.md` | Core Effect type and operations | ~20,000 |
| `Array.ts.md` | Array manipulation functions | ~97,000 |
| `Stream.ts.md` | Streaming operations | ~40,000 |
| `Layer.ts.md` | Dependency injection layers | ~15,000 |
| `Cause.ts.md` | Error cause tracking | ~59,000 |
| `Channel.ts.md` | Low-level streaming primitives | ~89,000 |

## Performance Tips

1. **Search specific modules** instead of all docs when possible
2. **Use grep -n** to get line numbers for faster navigation
3. **Use grep -A/-B/-C** to get context around matches
4. **Cache commonly used searches** in shell functions
5. **Use ripgrep (rg)** instead of grep for faster searches:
   ```bash
   rg "pattern" $EFFECT_DOCS/effect/docs/modules/
   ```

## Updating Documentation

To regenerate docs after Effect updates:

```bash
cd /Users/pooks/Dev/effect-repo
git pull origin main
pnpm install
pnpm docgen
```

## Alternative: Use MCP Server

You already have the Effect MCP server configured. For interactive searches:

```typescript
// In Claude Code, you can search docs programmatically
await mcp__effect_docs__effect_docs_search({ query: "retry" })
```

This provides structured access to the same documentation.

---

## Quick Reference Card

```bash
# Essential commands
grep -n "^## function_name" $EFFECT_DOCS/effect/docs/modules/Effect.ts.md
grep -ri "search term" $EFFECT_DOCS/effect/docs/modules/
grep -A 20 "^## function_name" $EFFECT_DOCS/effect/docs/modules/Effect.ts.md

# Find by category
grep "^- \[" $EFFECT_DOCS/effect/docs/modules/Effect.ts.md

# Count total functions
grep -c "^## " $EFFECT_DOCS/effect/docs/modules/Effect.ts.md

# Search across packages
grep -r "pattern" $EFFECT_DOCS/*/docs/modules/
```

Happy searching! 🔍
