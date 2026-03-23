import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './components/HomePage';
import SearchItem from './components/SearchItem';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/search-item" element={<SearchItem />} />
      </Routes>
    </Router>
  );
}

export default App;