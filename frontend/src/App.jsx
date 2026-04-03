// frontend/src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50">
        <header className="bg-primary text-white p-4">
          <h1 className="text-xl font-bold">Nofom — Pediatric Triage</h1>
        </header>
        <main className="p-6">
          <p className="text-slate-600">Phase 1 scaffold — working ✅</p>
        </main>
      </div>
    </BrowserRouter>
  )
}

export default App
