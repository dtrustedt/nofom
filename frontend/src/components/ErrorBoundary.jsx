// frontend/src/components/ErrorBoundary.jsx
import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[Nofom] Uncaught error:', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: 'var(--font-sans)',
        background: 'var(--color-surface-alt)',
        textAlign: 'center'
      }}>
        <div style={{
          width: 56, height: 56,
          borderRadius: '50%',
          background: 'var(--color-high-bg)',
          border: '2px solid var(--color-high-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.5rem', marginBottom: 20
        }}>
          ⚠
        </div>

        <h1 style={{
          fontSize: '1.125rem', fontWeight: 700,
          color: 'var(--color-text-primary)', margin: '0 0 8px'
        }}>
          Something went wrong
        </h1>

        <p style={{
          fontSize: '0.875rem',
          color: 'var(--color-text-muted)',
          margin: '0 0 24px',
          maxWidth: 320,
          lineHeight: 1.55
        }}>
          The app encountered an unexpected error. Your triage data is safe
          in local storage and has not been lost.
        </p>

        <button
          onClick={() => window.location.href = '/'}
          className="nf-btn nf-btn-primary"
          style={{ marginBottom: 12 }}
        >
          Reload App
        </button>

        <details style={{
          marginTop: 16,
          fontSize: '0.75rem',
          color: 'var(--color-text-muted)',
          maxWidth: 400,
          textAlign: 'left'
        }}>
          <summary style={{ cursor: 'pointer', marginBottom: 8 }}>
            Technical details
          </summary>
          <pre style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            padding: 12,
            overflow: 'auto',
            fontSize: '0.6875rem',
            lineHeight: 1.5,
            whiteSpace: 'pre-wrap'
          }}>
            {this.state.error?.toString()}
          </pre>
        </details>
      </div>
    )
  }
}
