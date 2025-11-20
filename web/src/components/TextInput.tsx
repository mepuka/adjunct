import { useAtomValue } from '@effect-atom/atom-react'
import { inputTextAtom, isProcessingAtom, actions } from '../state/atoms'
import './TextInput.css'

/**
 * Text Input Component
 *
 * Allows users to input text for processing.
 * Emphasizes the text-first approach of the workbench.
 */
export function TextInput() {
  const inputText = useAtomValue(inputTextAtom)
  const isProcessing = useAtomValue(isProcessingAtom)

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    actions.setInputText(e.target.value)
  }

  const wordCount = inputText.split(/\s+/).filter(w => w.length > 0).length
  const charCount = inputText.length

  return (
    <div className="panel text-input-panel">
      <div className="panel-header">
        <h2 className="panel-title">Input Text</h2>
        <div className="text-stats">
          <span className="text-stat">{wordCount}w</span>
          <span className="text-stat">{charCount}c</span>
        </div>
      </div>
      <textarea
        className="input textarea text-input-area"
        value={inputText}
        onChange={handleChange}
        disabled={isProcessing}
        placeholder="Enter text to process..."
        spellCheck={false}
      />
      <div className="text-input-hint">
        <span className="hint-icon">💡</span>
        <span className="hint-text">
          Enter text and apply operations to see functional transformations
        </span>
      </div>
    </div>
  )
}
