/**
 * Atom Runtime for Mutation Operations
 *
 * This runtime is used to create mutation atoms for complex operations.
 * Simple atom setters can use useAtomSet directly without this runtime.
 */

import { Atom } from "@effect-atom/atom"
import { Layer } from "effect"

/**
 * Create the atom runtime
 * This provides the AtomRegistry service needed for atom operations
 */
export const atomRuntime = Atom.runtime(Layer.empty)
