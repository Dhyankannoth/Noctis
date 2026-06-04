import { BrowserRouter, Routes, Route } from 'react-router-dom'
import DemoOne from './demo'
import CanvasPage from './canvas-page'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DemoOne />} />
        <Route path="/canvas" element={<CanvasPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
