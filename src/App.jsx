import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './components/HomePage';
import SearchItem from './components/SearchItem';
import SubmarineGathering from './components/SubmarineGathering';
import IfritSim from './components/IfritSim';
import UltimatePredationSim from './components/UltimatePredationSim';
import TitanTest from './components/TitanTest';
import GarudaTest from './components/GarudaTest';

import Layout from './components/Layout';
import { Navigate, useParams } from 'react-router-dom';

const ItemRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/search-item?selected=${id}`} replace />;
};

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search-item" element={<SearchItem />} />
          <Route path="/item/:id" element={<ItemRedirect />} />
          <Route path="/submarine" element={<SubmarineGathering />} />
          <Route path="/ifrit-sim" element={<IfritSim />} />
          <Route path="/ultimate-predation" element={<UltimatePredationSim />} />
          <Route path="/titan-test" element={<TitanTest />} />
          <Route path="/garuda-test" element={<GarudaTest />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;