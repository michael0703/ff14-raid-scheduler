import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './components/HomePage';
import RaidScheduler from './components/RaidScheduler';
import SettingsPage from './components/Settings';
import IfritPractice from './components/IfritPractice';
import SearchItem from './components/SearchItem';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/scheduler" element={<RaidScheduler />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/practice/ifrit" element={<IfritPractice />} />
        <Route path="/search-item" element={<SearchItem />} />
      </Routes>
    </Router>
  );
}

export default App;