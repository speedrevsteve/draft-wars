import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Lobby from './pages/Lobby';
import Draft from './pages/Draft';
import Results from './pages/Results';

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
  );
}

export default App;