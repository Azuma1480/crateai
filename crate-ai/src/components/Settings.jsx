import { useState, useEffect, useRef } from 'react';
import { getSetting, setSetting, getAllSettings } from '../lib/db.js';
import { testDiscogs } from '../lib/discogs.js';
import { testSpotify } from '../lib/spotify.js';
import { importLibraryFromFile } from '../lib/importExport.js';
import { importRekordboxFile } from '../lib/rekordbox.js';

const API_GROUPS = [
  {
    group: 'Discogs',
    hint: 'discogs.com/settings/developers',
    fields: [
      { key: 'discogsToken', label: 'Personal Access Token', type: 'password', placeholder: 'your discogs token' },
      { key: 'discogsProxy', label: 'Proxy URL（CORS回避・デスクトップで tools/discogs-proxy.mjs を起動）', type: 'text', placeholder: 'http://192.168.x.x:8722' },
    ],
    test: async (vals) => {
      if (!vals.discogsToken) throw new Error('Token required');
      return testDiscogs(vals.discogsToken);
    },
  },
  {
    group: 'Spotify',
    hint: 'developer.spotify.com/dashboard',
    fields: [
      { key: 'spotifyClientId', label: 'Client ID', type: 'text', placeholder: 'client id' },
      { key: 'spotifyClientSecret', label: 'Client Secret', type: 'password', placeholder: 'client secret' },
    ],
    test: async (vals) => {
      if (!vals.spotifyClientId || !vals.spotifyClientSecret)
        throw new Error('Client ID and Secret required');
      return testSpotify(vals.spotifyClientId, vals.spotifyClientSecret);
    },
  },
];

export default function Settings({
  onImportComplete,
  keyFormat, setKeyFormat,
  kamOn, setKamOn,
  x2On, setX2On,
  includePlayed, setIncludePlayed,
}) {
  const [apiValues, setApiValues] = useState({});
  const [savedApi, setSavedApi] = useState({});
  const [testing, setTesting] = useState({});
  const [testResults, setTestResults] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const fileInputRef = useRef(null);
  const rbInputRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const [importError, setImportError] = useState(null);
  const [importProgress, setImportProgress] = useState(null);

  useEffect(() => {
    getAllSettings().then((s) => { setApiValues(s); setSavedApi(s); });
  }, []);

  const handleChange = (key, val) => {
    setApiValues((prev) => ({ ...prev, [key]: val }));
    setTestResults((prev) => {
      const next = { ...prev };
      for (const g of API_GROUPS) {
        if (g.fields.some((f) => f.key === key)) delete next[g.group];
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const [key, val] of Object.entries(apiValues)) {
        await setSetting(key, val);
      }
      setSavedApi({ ...apiValues });
      setSaveMsg('Saved');
      setTimeout(() => setSaveMsg(''), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (group) => {
    setTesting((p) => ({ ...p, [group.group]: true }));
    setTestResults((p) => ({ ...p, [group.group]: null }));
    try {
      const ok = await group.test(apiValues);
      setTestResults((p) => ({ ...p, [group.group]: ok ? 'ok' : 'fail' }));
    } catch (err) {
      setTestResults((p) => ({ ...p, [group.group]: `error: ${err.message}` }));
    } finally {
      setTesting((p) => ({ ...p, [group.group]: false }));
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportError(null);
    setImportMsg('');
    setImportProgress(null);
    try {
      const result = await importLibraryFromFile(file, (p) => setImportProgress(p));
      setImportMsg(`✓ ${result.albums} albums / ${result.tracks} tracks imported`);
      onImportComplete?.();
    } catch (err) {
      setImportError(err.message);
    } finally {
      setImporting(false);
      setImportProgress(null);
      e.target.value = '';
    }
  };

  const handleRekordboxImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportError(null);
    setImportMsg('');
    try {
      const result = await importRekordboxFile(file);
      setImportMsg(`✓ Rekordboxから${result.tracks}曲を取り込み（BPMあり ${result.withBpm} / キーあり ${result.withKey}）`);
      onImportComplete?.();
    } catch (err) {
      setImportError(err.message);
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const hasApiChanges = JSON.stringify(apiValues) !== JSON.stringify(savedApi);

  return (
    <div
      className="flex flex-col h-full transition-colors duration-500"
      style={{ background: 'var(--bg)' }}
    >
      <div className="px-4 pt-4 pb-3 flex-shrink-0">
        <h1 className="font-bold" style={{ fontSize: 22, color: 'var(--text)', letterSpacing: '-0.02em' }}>
          Settings
        </h1>
        <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
          API keys stored locally · No account required
        </p>
      </div>

      <div className="flex-1 scroll-area px-4 pb-6 flex flex-col gap-3">

        {/* ── PLAYBACK ─────────────────────────────────────────────────────── */}
        <Section title="Playback">
          <Row label="Key Format" sub="Camelot (8A) or musical notation (Am)">
            <div
              className="flex rounded-lg p-0.5 gap-0.5"
              style={{ background: 'var(--surface2)' }}
            >
              {[['camelot', '8A'], ['musical', 'Am']].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setKeyFormat(val)}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-200"
                  style={{
                    background: keyFormat === val ? 'var(--accent)' : 'transparent',
                    color: keyFormat === val ? 'var(--bg)' : 'var(--text-dim)',
                    fontFamily: 'monospace',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </Row>
          <Row label="Include Played Tracks" sub="Show recently played records in suggestions">
            <Toggle on={includePlayed} onToggle={() => setIncludePlayed(!includePlayed)} />
          </Row>
          <Row label="プレイ履歴" sub="新しいセットを始めるときにリセット" last>
            <button
              onClick={async () => { await setSetting('playHistory', '{}'); setSaveMsg('履歴をリセットしました'); setTimeout(() => setSaveMsg(''), 2000); }}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold"
              style={{ background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text-dim)' }}
            >
              リセット
            </button>
          </Row>
        </Section>

        {/* ── DJ MODES ─────────────────────────────────────────────────────── */}
        <Section title="DJ Modes">
          <Row
            label="Key Adaptation Mode"
            sub="Calculates pitch-shifted key when tempo-matching on SL-1200"
          >
            <Toggle on={kamOn} onToggle={() => setKamOn(!kamOn)} />
          </Row>
          <Row
            label="X2 BPM Range"
            sub="Expand suggestion range from ±8% to ±16% pitch"
            last
          >
            <Toggle on={x2On} onToggle={() => setX2On(!x2On)} />
          </Row>
        </Section>

        {/* ── API GROUPS ──────────────────────────────────────────────────── */}
        {API_GROUPS.map((group) => {
          const result = testResults[group.group];
          const isOk = result === 'ok';
          const isFail = result && result !== 'ok';
          return (
            <Section
              key={group.group}
              title={group.group}
              hint={group.hint}
              badge={isOk ? '✓' : isFail ? '✗' : null}
              badgeOk={isOk}
            >
              {group.fields.map((field) => (
                <div key={field.key} className="px-4 pb-3">
                  <label style={{ fontSize: 11, color: 'var(--text-dim)', display: 'block', marginBottom: 6 }}>
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    value={apiValues[field.key] || ''}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    autoComplete="off"
                    spellCheck={false}
                    className="w-full rounded-xl px-3 py-2.5 text-sm font-mono outline-none"
                    style={{
                      background: 'var(--bg)',
                      border: '1px solid var(--border)',
                      color: 'var(--text)',
                    }}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                  />
                </div>
              ))}
              {isFail && (
                <div className="px-4 pb-3">
                  <p style={{ fontSize: 11, color: '#f87171' }}>
                    {result === 'fail' ? 'Connection failed — check your credentials' : result}
                  </p>
                </div>
              )}
              <div
                className="px-4 pb-4 pt-3"
                style={{ borderTop: '1px solid var(--border)' }}
              >
                <button
                  onClick={() => handleTest(group)}
                  disabled={testing[group.group]}
                  className="flex items-center gap-1.5 disabled:opacity-50"
                  style={{ fontSize: 12, color: 'var(--accent)' }}
                >
                  {testing[group.group] ? (
                    <>
                      <svg className="w-3.5 h-3.5 spin" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth={2}>
                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      </svg>
                      Testing…
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                        className="w-3.5 h-3.5">
                        <polyline points="9 11 12 14 22 4" />
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                      </svg>
                      Test connection
                    </>
                  )}
                </button>
              </div>
            </Section>
          );
        })}

        {/* ── IMPORT ──────────────────────────────────────────────────────── */}
        <Section title="Import Library" hint="Rekordbox XML (BPM+キー解析済み) または JSON">
          <div className="px-4 pb-3 pt-3">
            <input
              ref={rbInputRef}
              type="file"
              accept=".xml,text/xml,application/xml"
              onChange={handleRekordboxImport}
              className="hidden"
            />
            <button
              onClick={() => rbInputRef.current?.click()}
              disabled={importing}
              className="w-full flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold disabled:opacity-50"
              style={{ background: 'var(--accent)', color: 'var(--bg)' }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Rekordbox XML を取り込む
            </button>
            <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>
              Rekordbox: ファイル → ライブラリを書き出す → xml形式。解析済みのBPMとキーがそのまま入ります。
            </p>
          </div>
          <div className="px-4 pb-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleImport}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="w-full flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium disabled:opacity-50"
              style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
            >
              {importing ? (
                <>
                  <svg className="w-4 h-4 spin" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth={2}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  {importProgress
                    ? `Importing… ${importProgress.albums}/${importProgress.total}`
                    : 'Importing…'}
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                    className="w-4 h-4">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Select JSON File
                </>
              )}
            </button>
            {importMsg && (
              <p style={{ fontSize: 12, color: '#4ade80', marginTop: 8 }}>{importMsg}</p>
            )}
            {importError && (
              <p style={{ fontSize: 12, color: '#f87171', marginTop: 8 }}>{importError}</p>
            )}
          </div>
        </Section>

        {/* ── SAVE ────────────────────────────────────────────────────────── */}
        <button
          onClick={handleSave}
          disabled={saving || !hasApiChanges}
          className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-300"
          style={{
            background: hasApiChanges ? 'var(--accent)' : 'var(--surface)',
            color: hasApiChanges ? 'var(--bg)' : 'var(--text-muted)',
            cursor: hasApiChanges ? 'pointer' : 'default',
          }}
        >
          {saving ? 'Saving…' : saveMsg || (hasApiChanges ? 'Save Changes' : 'No changes')}
        </button>

        {/* ── ABOUT ───────────────────────────────────────────────────────── */}
        <div
          className="rounded-2xl p-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>CrateAI</p>
          <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 3 }}>
            v2.0 · Built for analog DJs
          </p>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
            All data stored locally. No account required.
          </p>
        </div>

      </div>
    </div>
  );
}

function Section({ title, hint, badge, badgeOk, children }) {
  return (
    <div
      className="rounded-2xl overflow-hidden transition-colors duration-500"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div
        className="px-4 pt-3 pb-2 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
            {title}
          </p>
          {hint && (
            <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>{hint}</p>
          )}
        </div>
        {badge && (
          <span style={{ color: badgeOk ? '#4ade80' : '#f87171', fontSize: 14 }}>{badge}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function Row({ label, sub, last, children }) {
  return (
    <div
      className="flex items-center justify-between gap-3 px-4 py-3"
      style={{ borderBottom: last ? 'none' : '1px solid var(--border)' }}
    >
      <div className="flex-1 min-w-0">
        <p style={{ fontSize: 13, color: 'var(--text)' }}>{label}</p>
        {sub && <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 1 }}>{sub}</p>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ on, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className="relative flex-shrink-0 rounded-full transition-all duration-300"
      style={{ width: 44, height: 24, background: on ? 'var(--accent)' : 'var(--border)' }}
    >
      <div
        className="absolute rounded-full transition-all duration-300"
        style={{
          top: 3, left: 3, width: 18, height: 18,
          background: on ? '#fff' : 'var(--text-dim)',
          transform: on ? 'translateX(20px)' : 'translateX(0)',
        }}
      />
    </button>
  );
}
