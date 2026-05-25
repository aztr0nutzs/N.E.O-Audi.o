/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { Dashboard } from './pages/Dashboard';
import { Downloader } from './pages/Downloader';
import { Uploader } from './pages/Uploader';
import { Library } from './pages/Library';
import { Player } from './pages/Player';
import { Equalizer } from './pages/Equalizer';
import { Settings } from './pages/Settings';
import { TrackDetail } from './pages/TrackDetail';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<Navigate to="/player" replace />} />
          <Route path="download" element={<Downloader />} />
          <Route path="upload" element={<Uploader />} />
          <Route path="library" element={<Library />} />
          <Route path="player" element={<Player />} />
          <Route path="equalizer" element={<Equalizer />} />
          <Route path="settings" element={<Settings />} />
          <Route path="track/:id" element={<TrackDetail />} />
        </Route>
      </Routes>
    </Router>
  );
}
