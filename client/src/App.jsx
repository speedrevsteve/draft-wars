import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Lobby from './pages/Lobby.jsx'
import Draft from './pages/Draft.jsx'
import Results from './pages/Results.jsx'
import './index.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/lobby/:code" element={<Lobby />} />
        <Route path="/draft/:code" element={<Draft />} />
        <Route path="/results/:code" element={<Results />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App