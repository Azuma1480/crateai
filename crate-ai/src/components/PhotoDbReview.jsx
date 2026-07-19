import { useEffect, useState } from 'react';
import { PHOTO_DB, SHELF_SPINES } from '../lib/photoDb.js';
import { importLibraryFromJson } from '../lib/importExport.js';
import { getAllAlbums } from '../lib/db.js';

const VERIFY_META = {
  high: { label: '確認済み', color: '#52d98a' },
  medium: { label: 'ほぼ確定', color: '#e8b73d' },
  review: { label: '要確認', color: '#f2726b' },
};

function toImportAlbum(entry) {
  return {
    title: entry.title,
    artist: entry.artist,
    genre: entry.genre || undefined,
    tracks: entry.tracks.map((t) => ({ ...t })),
  };
}

export default function PhotoDbReview({ onImportComplete }) {
  const [importedKeys, setImportedKeys] = useState(new Set());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [openIdx, setOpenIdx] = useState(null);

  const keyOf = (e) => `${e.artist}__${e.title}`.toLowerCase();

  useEffect(() => {
    (async () => {
      try {
        const albums = await getAllAlbums();
        const have = new Set(albums.map((a) => `${a.artist}__${a.title}`.toLowerCase()));
        setImportedKeys(new Set(PHOTO_DB.filter((e) => have.has(keyOf(e))).map(keyOf)));
      } catch { /* DB not ready yet — leave badges off */ }
    })();
  }, []);

  const doImport = async (entries) => {
    setBusy(true);
    setMessage('');
    try {
      const result = await importLibraryFromJson({ albums: entries.map(toImportAlbum) });
      setImportedKeys((prev) => new Set([...prev, ...entries.map(keyOf)]));
      setMessage(`${result.albums}枚 / ${result.tracks}曲をライブラリに追加しました`);
      onImportComplete?.();
    } catch (err) {
      setMessage(`エラー: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const confident = PHOTO_DB.filter((e) => e.verify !== 'review');
  const notImported = confident.filter((e) => !importedKeys.has(keyOf(e)));

  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="font-semibold" style={{ color: 'var(--text)', fontSize: 14 }}>写真解析データベース</p>
        <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 2 }}>
          レコード写真60枚を再検証した結果 — 全{PHOTO_DB.length}作品
          （確認済み {PHOTO_DB.filter((e) => e.verify === 'high').length} ／
          ほぼ確定 {PHOTO_DB.filter((e) => e.verify === 'medium').length} ／
          要確認 {PHOTO_DB.filter((e) => e.verify === 'review').length}）
        </p>
        <button
          type="button"
          disabled={busy || notImported.length === 0}
          onClick={() => doImport(notImported)}
          className="mt-3 w-full py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
          style={{ background: 'var(--accent)', color: 'var(--bg)' }}
        >
          {busy ? '追加中…' : notImported.length === 0 ? '確認済み+ほぼ確定 はすべて追加済み' : `確認済み+ほぼ確定 (${notImported.length}枚) を一括追加`}
        </button>
        {message && (
          <p style={{ fontSize: 12, color: message.startsWith('エラー') ? '#f2726b' : '#52d98a', marginTop: 8 }}>{message}</p>
        )}
      </div>

      {PHOTO_DB.map((entry, i) => {
        const meta = VERIFY_META[entry.verify];
        const done = importedKeys.has(keyOf(entry));
        const hasRealTracks = entry.tracks.length > 1 || entry.tracks[0]?.title !== '（曲リスト未登録）';
        return (
          <div key={i} className="rounded-xl overflow-hidden" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <button
              type="button"
              onClick={() => setOpenIdx(openIdx === i ? null : i)}
              className="w-full px-3 py-2.5 flex items-center gap-2 text-left"
            >
              <span className="flex-shrink-0" style={{ fontSize: 10, fontWeight: 700, color: meta.color, background: `${meta.color}22`, padding: '2px 7px', borderRadius: 999 }}>
                {meta.label}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate" style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{entry.title}</span>
                <span className="block truncate" style={{ fontSize: 11, color: 'var(--text-dim)' }}>{entry.artist}</span>
              </span>
              {done && <span style={{ fontSize: 10, color: '#52d98a' }}>追加済み</span>}
            </button>
            {openIdx === i && (
              <div className="px-3 pb-3 flex flex-col gap-2" style={{ borderTop: '1px solid var(--border)' }}>
                <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 8 }}>
                  写真: {entry.photos.join(', ')}
                  {entry.genre ? ` ・ ジャンル: ${entry.genre}` : ''}
                  {hasRealTracks ? ` ・ ${entry.tracks.length}曲` : ' ・ 曲リスト未登録'}
                </p>
                {entry.note && <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>{entry.note}</p>}
                {hasRealTracks && (
                  <p style={{ fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.6 }}>
                    {entry.tracks.map((t) => t.title).join(' / ')}
                  </p>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => doImport([entry])}
                  className="py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
                  style={{ background: done ? 'var(--surface2)' : 'var(--accent)', color: done ? 'var(--text-dim)' : 'var(--bg)' }}
                >
                  {done ? 'もう一度追加（上書き）' : 'この1枚をライブラリに追加'}
                </button>
              </div>
            )}
          </div>
        );
      })}

      <div className="rounded-xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <p className="font-semibold" style={{ fontSize: 13, color: 'var(--text)' }}>棚の背表紙から確認できた所蔵（参考）</p>
        <p style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 6, lineHeight: 1.8 }}>
          {SHELF_SPINES.join(' ・ ')}
        </p>
      </div>
    </div>
  );
}
