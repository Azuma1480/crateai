// Lightweight i18n — Japanese / English UI strings.
// The selected language persists in settings ('lang'); Japanese is default.

import { createContext, useContext } from 'react';

export const STRINGS = {
  ja: {
    startPrompt: 'ライブラリから曲を選んでスタート',
    setPrompt: '曲をセットするとサジェストが表示される',
    noneInRange: '範囲内の曲なし — X2を試してみて',
    emptyLibLive: 'ライブラリが空 — Settingsからインポート',
    changeTrack: '曲を変える',
    searchLibrary: 'ライブラリを検索',
    reset: 'リセット',
    searchPh: '検索…',
    notFound: '見つからない',
    cancel: 'キャンセル',
    register: '登録',
    addRecordBtn: 'レコードを登録',
    crateEmpty: 'Your crate is empty',
    crateEmptySub: 'レコードを登録してクレートを作ろう',
    noMatch: 'No tracks match your search',
    edit: '編集',
    save: '保存',
    tracksUnit: '曲',
    verifyTab: '照合',
    playHistory: 'プレイ履歴',
    playHistorySub: '新しいセットを始めるときにリセット',
    historyCleared: '履歴をリセットしました',
    language: '言語 / Language',
    languageSub: 'アプリの表示言語',
    deleteConfirm: (t) => `「${t}」を削除しますか？`,
    slowToFast: '遅い → 速い',
    fastToSlow: '速い → 遅い',
  },
  en: {
    startPrompt: 'Pick a track from your Library to start',
    setPrompt: 'Set a track to see suggestions',
    noneInRange: 'No tracks in range — try X2',
    emptyLibLive: 'Library is empty — import via Settings',
    changeTrack: 'Change track',
    searchLibrary: 'Search library',
    reset: 'Reset',
    searchPh: 'Search…',
    notFound: 'Nothing found',
    cancel: 'Cancel',
    register: 'Add',
    addRecordBtn: 'Add a record',
    crateEmpty: 'Your crate is empty',
    crateEmptySub: 'Add records to build your crate',
    noMatch: 'No tracks match your search',
    edit: 'Edit',
    save: 'Save',
    tracksUnit: ' tracks',
    verifyTab: 'Verify',
    playHistory: 'Play History',
    playHistorySub: 'Reset when starting a new set',
    historyCleared: 'History cleared',
    language: 'Language / 言語',
    languageSub: 'App display language',
    deleteConfirm: (t) => `Delete “${t}”?`,
    slowToFast: 'Slow → Fast',
    fastToSlow: 'Fast → Slow',
  },
};

export const I18nContext = createContext('ja');

export function useT() {
  const lang = useContext(I18nContext);
  return (key, ...args) => {
    const v = STRINGS[lang]?.[key] ?? STRINGS.ja[key] ?? key;
    return typeof v === 'function' ? v(...args) : v;
  };
}
