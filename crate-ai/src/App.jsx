import { useState, useEffect } from 'react';
import NavBar from './components/NavBar.jsx';
import Library from './components/Library.jsx';
import AddRecord from './components/AddRecord.jsx';
import LiveMode from './components/LiveMode.jsx';
import Settings from './components/Settings.jsx';

const TABS = ['library', 'add', 'live', 'settings'];

export default function App() {
  const [activeTab, setActiveTab] = useState('live');
  // Shared "now playing" state lifted to App so LiveMode → suggestions work
  const [nowPlaying, setNowPlaying] = useState(null);
  // Track library version to force re-fetches after imports
  const [libraryVersion, setLibraryVersion] = useState(0);

  const bumpLibrary = () => setLibraryVersion((v) => v + 1);

  return (
    <div className="flex flex-col h-full bg-[#0f0f0f]">
      {/* Status bar spacer (iPhone safe area) */}
      <div className="safe-top bg-[#0f0f0f]" />

      {/* Main content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'library' && (
          <Library libraryVersion={libraryVersion} />
        )}
        {activeTab === 'add' && (
          <AddRecord onImportComplete={bumpLibrary} />
        )}
        {activeTab === 'live' && (
          <LiveMode
            nowPlaying={nowPlaying}
            setNowPlaying={setNowPlaying}
            libraryVersion={libraryVersion}
          />
        )}
        {activeTab === 'settings' && <Settings onImportComplete={bumpLibrary} />}
      </div>

      {/* Bottom nav */}
      <NavBar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="safe-bottom bg-[#111]" />
    </div>
  );
}
