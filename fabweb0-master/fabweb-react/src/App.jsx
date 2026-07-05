import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import RoleSelection from './pages/RoleSelection';
import RegisterRole from './pages/RegisterRole';
import RegisterStagiaire from './pages/RegisterStagiaire';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/role-selection" element={<RoleSelection />} />
        <Route path="/register-role" element={<RegisterRole />} />
        <Route path="/register-stagiaire" element={<RegisterStagiaire />} />
      </Routes>
    </Router>
  );
}

export default App;
