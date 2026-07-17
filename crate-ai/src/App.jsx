import { useState, useEffect } from 'react';
import NavBar from './components/NavBar.jsx';
import Library from './components/Library.jsx';
import LiveMode from './components/LiveMode.jsx';
import AddRecord from './components/AddRecord.jsx';
import Settings from './components/Settings.jsx';
import SpeedStreaks from './components/SpeedStreaks.jsx';
import { getSetting, setSetting } from './lib/db.js';

export default function App() {
  const [activeTab, setActiveTab] = useState('live');
  const [nowPlaying, setNowPlaying] = useState(null);
  const [libraryVersion, setLibraryVersion] = useState(0);

  // Global DJ mode settings
  const [kamOn, setKamOn] = useState(false);
  const [x2On, setX2On] = useState(false);
  const [keyFormat, setKeyFormat] = useState('camelot'); // 'camelot' | 'musical'
  const [includePlayed, setIncludePlayed] = useState(true);

  const bumpLibrary = () => setLibraryVersion((v) => v + 1);

  // Persist settings to IndexedDB
  useEffect(() => {
    getSetting('keyFormat').then((v) => v && setKeyFormat(v));
    getSetting('includePlayed').then((v) => v != null && setIncludePlayed(v === 'true'));
  }, []);

  const handleKam = (val) => {
    setKamOn(val);
    // Theme class on document root
    document.documentElement.classList.toggle('kam-on', val);
  };

  const handleKeyFormat = (val) => {
    setKeyFormat(val);
    setSetting('keyFormat', val);
  };

  const handleIncludePlayed = (val) => {
    setIncludePlayed(val);
    setSetting('includePlayed', String(val));
  };

  return (
    <div
      className="flex flex-col h-full transition-colors duration-500"
      style={{ background: 'var(--bg)', color: 'var(--text)' }}
    >
      <div className="safe-top" style={{ background: 'var(--bg)' }} />

      {/* Speed streaks — visible only when X2 is on */}
      <SpeedStreaks active={x2On} />

      <div className="flex-1 overflow-hidden">
        {activeTab === 'library' && (
          <Library
            libraryVersion={libraryVersion}
            onImportComplete={bumpLibrary}
            keyFormat={keyFormat}
            nowPlaying={nowPlaying}
            setNowPlaying={(t) => { setNowPlaying(t); setActiveTab('live'); }}
            onAddRecord={() => setActiveTab('add')}
          />
        )}
        {activeTab === 'add' && (
          <AddRecord onImportComplete={bumpLibrary} />
        )}
        {activeTab === 'live' && (
          <LiveMode
            nowPlaying={nowPlaying}
            setNowPlaying={setNowPlaying}
            libraryVersion={libraryVersion}
            kamOn={kamOn}
            setKamOn={handleKam}
            x2On={x2On}
            setX2On={setX2On}
            keyFormat={keyFormat}
            includePlayed={includePlayed}
          />
        )}
        {activeTab === 'settings' && (
          <Settings
            onImportComplete={bumpLibrary}
            keyFormat={keyFormat}
            setKeyFormat={handleKeyFormat}
            kamOn={kamOn}
            setKamOn={handleKam}
            x2On={x2On}
            setX2On={setX2On}
            includePlayed={includePlayed}
            setIncludePlayed={handleIncludePlayed}
          />
        )}
      </div>

      <NavBar activeTab={activeTab} onTabChange={setActiveTab} />
      <div className="safe-bottom" style={{ background: 'var(--nav-bg)' }} />
    </div>
  );
}
