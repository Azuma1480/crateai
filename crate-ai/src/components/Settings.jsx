import { useState, useEffect, useRef } from 'react';
import { getSetting, setSetting, getAllSettings } from '../lib/db.js';
import { testDiscogs } from '../lib/discogs.js';
import { testSpotify } from '../lib/spotify.js';
import { importLibraryFromFile } from '../lib/importExport.js';

const FIELDS = [
  {
    group: 'Discogs',
    hint: 'Get a token at discogs.com/settings/developers',
    fields: [
      { key: 'discogsToken', label: 'Personal Access Token', type: 'password', placeholder: 'your discogs token' },
    ],
    test: async (vals) => {
      if (!vals.discogsToken) throw new Error('Token required');
      return testDiscogs(vals.discogsToken);
    },
  },
  {
    group: 'Spotify',
    hint: 'Create an app at developer.spotify.com/dashboard',
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

export default function Settings({ onImportComplete }) {
  const [values, setValues] = useState({});
  const [saved, setSaved] = useState({});
  const [testing, setTesting] = useState({});
  const [testResults, setTestResults] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  const fileInputRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState('');
  const [importError, setImportError] = useState(null);
  const [importProgress, setImportProgress] = useState(null);

  useEffect(() => {
    getAllSettings().then((s) => {
      setValues(s);
      setSaved(s);
    });
  }, []);

  const handleChange = (key, val) => {
    setValues((prev) => ({ ...prev, [key]: val }));
    // Clear test result when user edits
    setTestResults((prev) => {
      const next = { ...prev };
      // Find which group this key belongs to and clear that group's result
      for (const g of FIELDS) {
        if (g.fields.some((f) => f.key === key)) delete next[g.group];
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const [key, val] of Object.entries(values)) {
        await setSetting(key, val);
      }
      setSaved({ ...values });
      setSaveMsg('Saved!');
      setTimeout(() => setSaveMsg(''), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (group) => {
    setTesting((prev) => ({ ...prev, [group.group]: true }));
    setTestResults((prev) => ({ ...prev, [group.group]: null }));
    try {
      const ok = await group.test(values);
      setTestResults((prev) => ({ ...prev, [group.group]: ok ? 'ok' : 'fail' }));
    } catch (err) {
      setTestResults((prev) => ({ ...prev, [group.group]: `error: ${err.message}` }));
    } finally {
      setTesting((prev) => ({ ...prev, [group.group]: false }));
    }
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportError(null);
    setImportMsg('');
    setImportProgress(null);

    try {
      const result = await importLibraryFromFile(file, (p) => setImportProgress(p));
      setImportMsg(`✓ ${result.albums}枚 / ${result.tracks}曲をライブラリに追加しました`);
      onImportComplete?.();
    } catch (err) {
      setImportError(err.message);
    } finally {
      setImporting(false);
      setImportProgress(null);
      e.target.value = '';
    }
  };

  const hasChanges = JSON.stringify(values) !== JSON.stringify(saved);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3 bg-[#0f0f0f]">
        <h1 className="text-xl font-bold text-gray-100">Settings</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          API keys are stored locally on your device only
        </p>
      </div>

      <div className="flex-1 scroll-area px-4 pb-6 space-y-6">
        {FIELDS.map((group) => {
          const result = testResults[group.group];
          const isOk = result === 'ok';
          const isFail = result && result !== 'ok';

          return (
            <div key={group.group} className="bg-[#1a1a1a] rounded-2xl overflow-hidden">
              {/* Group header */}
              <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-100">{group.group}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{group.hint}</p>
                </div>
                {isOk && (
                  <span className="text-green-400 text-lg">✓</span>
                )}
                {isFail && (
                  <span className="text-red-400 text-sm">✗</span>
                )}
              </div>

              {/* Fields */}
              <div className="px-4 pb-3 space-y-3">
                {group.fields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-xs text-gray-500 mb-1.5">{field.label}</label>
                    <input
                      type={field.type}
                      value={values[field.key] || ''}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      className="w-full bg-[#0f0f0f] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:border-violet-500 focus:outline-none font-mono"
                    />
                  </div>
                ))}
              </div>

              {/* Test result */}
              {isFail && result !== 'fail' && (
                <div className="px-4 pb-3">
                  <p className="text-xs text-red-400">{result}</p>
                </div>
              )}
              {result === 'fail' && (
                <div className="px-4 pb-3">
                  <p className="text-xs text-red-400">Connection failed — check your credentials</p>
                </div>
              )}

              {/* Test button */}
              <div className="px-4 pb-4 border-t border-[#2a2a2a] pt-3">
                <button
                  onClick={() => handleTest(group)}
                  disabled={testing[group.group]}
                  className="text-sm text-violet-400 flex items-center gap-1.5 disabled:opacity-50"
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
            </div>
          );
        })}

        {/* Import library from JSON */}
        <div className="bg-[#1a1a1a] rounded-2xl overflow-hidden">
          <div className="px-4 pt-4 pb-2">
            <p className="font-semibold text-gray-100">Import Library</p>
            <p className="text-xs text-gray-500 mt-0.5">
              JSONファイルから曲リストをまとめて読み込みます
            </p>
          </div>

          <div className="px-4 pb-4 space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleImportFile}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="w-full bg-[#0f0f0f] border border-[#2a2a2a] text-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {importing ? (
                <>
                  <svg className="w-4 h-4 spin" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth={2}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  {importProgress
                    ? `インポート中… ${importProgress.albums}/${importProgress.total}枚`
                    : 'インポート中…'}
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
                    className="w-4 h-4">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  JSONファイルを選択
                </>
              )}
            </button>

            {importMsg && (
              <p className="text-xs text-green-400 px-1">{importMsg}</p>
            )}
            {importError && (
              <p className="text-xs text-red-400 px-1">{importError}</p>
            )}
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-colors ${
            hasChanges
              ? 'bg-violet-600 text-white'
              : 'bg-[#1a1a1a] text-gray-500 cursor-default'
          }`}
        >
          {saving ? 'Saving…' : saveMsg || (hasChanges ? 'Save Changes' : 'No changes')}
        </button>

        {/* About */}
        <div className="bg-[#1a1a1a] rounded-2xl p-4 space-y-1">
          <p className="text-sm font-semibold text-gray-300">CrateAI</p>
          <p className="text-xs text-gray-500">v1.0 · Built for analog DJs</p>
          <p className="text-xs text-gray-600 mt-2">
            All data stored locally on your device. No account required.
          </p>
        </div>
      </div>
    </div>
  );
}
