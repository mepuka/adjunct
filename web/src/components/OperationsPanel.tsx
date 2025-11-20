import { useAtomValue, useAtomSet } from '@effect-atom/atom-react'
import { inputTextAtom, isProcessingAtom, operationsAtom, graphAtom } from '../state/atoms'
import { executeOperationMutation } from '../state/graphOperations'
import './OperationsPanel.css'

/**
 * Operations Panel Component
 *
 * Provides buttons for executing text graph operations.
 * Displays operation history to show the functional pipeline.
 */
export function OperationsPanel() {
  const inputText = useAtomValue(inputTextAtom)
  const isProcessing = useAtomValue(isProcessingAtom)
  const operations = useAtomValue(operationsAtom)
  
  // Get mutation setter - this handles runtime execution automatically
  const executeOperation = useAtomSet(executeOperationMutation)
  const setGraph = useAtomSet(graphAtom)
  const clearOperations = useAtomSet(operationsAtom)

  const handleSentencize = () => {
    executeOperation({ text: inputText, operation: 'sentencize' })
  }

  const handleTokenize = () => {
    executeOperation({ text: inputText, operation: 'tokenize' })
  }

  const handleBoth = () => {
    executeOperation({ text: inputText, operation: 'both' })
  }

  const handleClear = () => {
    setGraph(null)
    clearOperations([])
  }

  return (
    <div className="panel operations-panel">
      <div className="panel-header">
        <h2 className="panel-title">Operations</h2>
        {operations.length > 0 && (
          <button
            className="btn-clear"
            onClick={handleClear}
            disabled={isProcessing}
          >
            Clear
          </button>
        )}
      </div>

      <div className="operations-grid">
        <button
          className="operation-btn"
          onClick={handleSentencize}
          disabled={isProcessing || !inputText.trim()}
          title="Split text into sentences"
        >
          <div className="operation-icon">📝</div>
          <div className="operation-label">Sentencize</div>
          <div className="operation-desc">text → sentences</div>
        </button>

        <button
          className="operation-btn"
          onClick={handleTokenize}
          disabled={isProcessing || !inputText.trim()}
          title="Split text into tokens"
        >
          <div className="operation-icon">🔤</div>
          <div className="operation-label">Tokenize</div>
          <div className="operation-desc">text → tokens</div>
        </button>

        <button
          className="operation-btn"
          onClick={handleBoth}
          disabled={isProcessing || !inputText.trim()}
          title="Split into sentences then tokens"
        >
          <div className="operation-icon">⚡</div>
          <div className="operation-label">Compose</div>
          <div className="operation-desc">text → sent → tokens</div>
        </button>
      </div>

      {operations.length > 0 && (
        <div className="operations-history">
          <h3 className="history-title">Applied Operations</h3>
          <div className="history-list">
            {operations.map((op, i) => (
              <div key={i} className="history-item">
                <span className="history-index">{i + 1}</span>
                <span className="badge badge-operation">{op}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="operations-note">
        <div className="note-title">Functor Operations</div>
        <div className="note-text">
          Each operation is a morphism that transforms the graph structure
          while preserving the categorical properties of the text.
        </div>
      </div>
    </div>
  )
}
