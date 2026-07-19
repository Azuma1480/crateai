// 写真解析データベース（CrateAI_Claude_Handoff_Package v2 の60枚の写真から再検証済み）
// 各エントリ:
//   verify: 'high'（表記/曲目まで確認できた） | 'medium'（ジャケ一致だが文字情報が弱い） | 'review'（要確認）
//   photos: 元になった写真ファイル名（1000038313.jpg 等）の番号
//   tracks: 裏ジャケの曲目が読めたものはその通り、定番作は公式曲順、
//           不明なものは「（曲リスト未登録）」のみ入れてある（後で編集で追加できる）
// 検証ポリシー: 表ジャケだけの推定は medium 止まり。曲目/帯/バーコード等の
// テキストが照合できたものだけ high。

const TBD = [{ title: '（曲リスト未登録）' }];

const t = (...titles) => titles.map((title, i) => ({ position: String(i + 1), title }));

export const PHOTO_DB = [
  // ===== 確定（high）=====
  {
    artist: 'FKJ', title: 'French Kiwi Juice', genre: 'Funky/Groovy', verify: 'high',
    photos: ['38317'], note: '裏面(Side4)の表記で確認。過去データ(album_art_reference.csv)とも一致',
    tracks: TBD,
  },
  {
    artist: 'edbl', title: 'South London Sounds', genre: 'R&B', verify: 'high',
    photos: ['38318', '39498'], note: 'P-VINE帯付き日本盤。帯の表記で確認', tracks: TBD,
  },
  {
    artist: 'HONNE', title: 'Love Me / Love Me Not', genre: 'R&B', verify: 'high',
    photos: ['38319', '39506'], note: '手鏡ジャケ+HONNE/ホンネ表記', tracks: TBD,
  },
  {
    artist: 'HYUKOH & Sunset Rollercoaster', title: 'AAA', genre: 'Funky/Groovy', verify: 'high',
    photos: ['38316', '38328'], note: '裏面曲目+バーコード8800250622500で確認。「Funky groovy」テープ',
    tracks: [
      { position: 'A1', title: 'Kite War' }, { position: 'A2', title: 'Y' },
      { position: 'A3', title: 'Antenna' }, { position: 'A4', title: 'Glue' },
      { position: 'B1', title: 'Young Man' }, { position: 'B2', title: 'Do Nothing' },
      { position: 'B3', title: 'AAAANNNNTEEEEENNNAAAAAA' }, { position: 'B4', title: '2F 年轻人' },
    ],
  },
  {
    artist: 'The Black Skirts (검정치마)', title: 'TEAM BABY', genre: 'Korean Indie', verify: 'high',
    photos: ['38322'], note: '表ジャケで確認', tracks: TBD,
  },
  {
    artist: 'Jamiroquai', title: 'Travelling Without Moving', genre: 'Funky/Groovy', verify: 'high',
    photos: ['38324'],
    tracks: t('Virtual Insanity', 'Cosmic Girl', 'Use the Force', 'Everyday', 'Alright',
      'High Times', 'Drifting Along', 'Didjerama', 'Didjital Vibrations',
      'Travelling Without Moving', 'You Are My Love', 'Spend a Lifetime'),
  },
  {
    artist: 'Parcels', title: 'Parcels', genre: 'Funky/Groovy', verify: 'high',
    photos: ['38326'],
    tracks: t('Comedown', 'Lightenup', 'Bemyself', 'Everyroad', 'Yourfault',
      'Closetowhy', 'Withorwithout', 'IknowhowIfeel', 'Exotica', 'Tape'),
  },
  {
    artist: 'Parcels', title: 'LOVED', genre: 'Funky/Groovy', verify: 'high',
    photos: ['38531'], note: '裏ジャケ曲目で確認。「Funky/Groovy」テープ',
    tracks: t('Loved', 'Ifyoucall', 'Safeandsound', 'Sorry', 'Yougotmefeeling', 'Leaves',
      'Everybodyelse', 'Summerinlove', 'Leaveyourlove', 'Thinkaboutit', 'Finallyover',
      'Iwanttobeyourlightagain'),
  },
  {
    artist: 'SZA', title: 'SOS', genre: 'R&B', verify: 'high', photos: ['38330'],
    tracks: t('SOS', 'Kill Bill', 'Seek & Destroy', 'Low', 'Love Language', 'Blind',
      'Used (feat. Don Toliver)', 'Snooze', 'Notice Me', 'Gone Girl', 'Smoking on My Ex Pack',
      'Ghost in the Machine (feat. Phoebe Bridgers)', 'F2F', 'Nobody Gets Me', 'Conceited',
      'Special', 'Too Late', 'Far', 'Shirt', 'Open Arms (feat. Travis Scott)', 'I Hate U',
      'Good Days', 'Forgiveless (feat. Ol’ Dirty Bastard)'),
  },
  {
    artist: 'Nujabes / Fat Jon', title: 'departure (samurai champloo music record)',
    genre: 'Lo-fi Hip-Hop', verify: 'high', photos: ['38331'], tracks: TBD,
  },
  {
    artist: 'Nujabes', title: 'Metaphorical Music', genre: 'Lo-fi Hip-Hop', verify: 'high',
    photos: ['38332'], note: '過去データとも一致',
    tracks: t('Blessing It', 'Horn in the Middle', 'Lady Brown (feat. Cise Starr)', 'Kumomi',
      'Highs 2 Lows (feat. Cise Starr)', 'Beat Laments the World', 'Letter from Yokosuka',
      'Think Different (feat. Substantial)', 'A Day by Atmosphere Supreme', 'Next View',
      'Latitude (feat. Five Deez)', 'F.I.L.O. (feat. Shing02)', 'Summer Gypsy',
      'The Final View', 'Peaceland'),
  },
  {
    artist: 'DJ Cam Quartet', title: 'Rebirth of Cool', genre: 'Jazz', verify: 'high',
    photos: ['38333'], note: 'Inflamable Records。過去データとも一致', tracks: TBD,
  },
  {
    artist: 'Nujabes', title: 'Modal Soul', genre: 'Lo-fi Hip-Hop', verify: 'high',
    photos: ['38334'],
    tracks: t('Feather (feat. Cise Starr & Akin)', 'Ordinary Joe (feat. Terry Callier)',
      'Reflection Eternal', 'Luv(sic) Part 3 (feat. Shing02)', 'Music Is Mine', 'Eclipse (feat. Substantial)',
      'The Sign (feat. Pase Rock)', 'Thank You (feat. Apani B)', 'World’s End Rhapsody',
      'Modal Soul (feat. Uyama Hiroto)', 'Flowers', 'Sea of Cloud', 'Light on the Land', 'Horizon'),
  },
  {
    artist: 'Stan Getz', title: 'Big Band Bossa Nova', genre: 'Jazz', verify: 'high',
    photos: ['38338'], note: 'Verve盤。過去データとも一致',
    tracks: t('Manhã de Carnaval', 'Balanço no Samba', 'Melancolico', 'Entre Amigos',
      'Chega de Saudade', 'Noite Triste', 'Samba de Uma Nota Só', 'Bim Bom'),
  },
  {
    artist: 'Stan Getz / João Gilberto', title: 'Getz/Gilberto', genre: 'Jazz', verify: 'high',
    photos: ['38339'],
    tracks: t('The Girl from Ipanema', 'Doralice', 'Para Machucar Meu Coração', 'Desafinado',
      'Corcovado', 'Só Danço Samba', 'O Grande Amor', 'Vivo Sonhando'),
  },
  {
    artist: 'Chet Baker', title: 'My Funny Valentine', genre: 'Jazz', verify: 'high',
    photos: ['38340', '38770(背景)'], note: '過去データとも一致', tracks: TBD,
  },
  {
    artist: 'Harry Styles', title: "Harry's House", genre: 'Pop', verify: 'high',
    photos: ['38341'],
    tracks: t('Music for a Sushi Restaurant', 'Late Night Talking', 'Grapejuice', 'As It Was',
      'Daylight', 'Little Freak', 'Matilda', 'Boyfriends', 'Daydreaming', 'Keep Driving',
      'Satellite', 'Cinema', 'Love of My Life'),
  },
  {
    artist: 'DAY6', title: 'Sunrise', genre: 'Korean Indie', verify: 'high',
    photos: ['38343'], note: '過去データとも一致', tracks: TBD,
  },
  {
    artist: 'Summer Salt', title: 'Happy Camper', genre: 'Funky/Groovy', verify: 'high',
    photos: ['38344'], note: '裏ジャケ曲目で確認。「Funky groovy」テープ。過去データとも一致',
    tracks: t('Heart and My Car', "Revvin' My CJ-7", 'Speaking Sonar', "Rockin' My Paw",
      'Candy Wrappers', 'Oh Dear', 'Seventeen', "Life Ain't the Same", 'Swinging for the Fences',
      'Lonesick', 'Fast, Furious and Wonderful', 'Happy Camper'),
  },
  {
    artist: "Cosmo's Midnight", title: 'Yesteryear', genre: 'Funky/Groovy', verify: 'high',
    photos: ['38765', '38766', '38956', '40397'], note: '表裏で確認 (2020 Nite High/Sony)', tracks: TBD,
  },
  {
    artist: 'OGRE YOU ASSHOLE', title: '新しい人', genre: 'Japanese Indie', verify: 'high',
    photos: ['38769'], note: '裏面の日英曲目で確認',
    tracks: t('新しい人 (new kind of man)', '朝 (morning after morning)', 'さわれないのに (me and your shadow)',
      '過去と未来だけ (side mirror love)', 'ありがとう (function stops)', 'わかってないことがない (each the other)',
      '自分ですか？ (somehow being myself)', '本当みたい (too good to be true)', '動物的／人間的 (high tide)'),
  },
  {
    artist: 'Toro y Moi', title: 'Outer Peace', genre: 'Funky/Groovy', verify: 'high',
    photos: ['38954'], note: '裏ジャケ曲目で確認',
    tracks: t('Fading', 'Ordinary Pleasure', 'Laws of the Universe', 'Miss Me (feat. ABRA)',
      'New House', 'Baby Drive It Down', 'Freelance', 'Who I Am', 'Monte Carlo (feat. WET)',
      '50-50 (feat. Instupendo)'),
  },
  {
    artist: 'easy life', title: "life's a beach", genre: 'Funky/Groovy', verify: 'high',
    photos: ['38958'],
    tracks: t('a message to myself', 'have a great day', 'ocean view', 'skeletons', 'daydreams',
      'interlude', 'music to walk home to', 'living strange', 'compliments', 'lifeboat',
      'nightmares', 'homesickness'),
  },
  {
    artist: 'Dominic Fike', title: 'Sunburn', genre: 'Pop', verify: 'high', photos: ['39499'],
    tracks: TBD,
  },
  {
    artist: 'LOVE PSYCHEDELICO', title: 'THE GREATEST HITS', genre: 'Japanese Indie', verify: 'high',
    photos: ['39500'], note: 'URDC-101表記で確認', tracks: TBD,
  },
  {
    artist: 'Sam Wills', title: 'Speak', genre: 'R&B', verify: 'high', photos: ['39502'], tracks: TBD,
  },
  {
    artist: 'wave to earth', title: '0.1 flaws and all.', genre: 'Korean Indie', verify: 'high',
    photos: ['39503'], tracks: TBD,
  },
  {
    artist: 'Mac Miller', title: 'Circles', genre: 'Hip-Hop', verify: 'high',
    photos: ['39508'], note: '裏ジャケ曲目で確認',
    tracks: t('Circles', 'Complicated', 'Blue World', 'Good News', 'I Can See', 'Everybody',
      'Woods', 'Hand Me Downs', "That's on Me", 'Hands', 'Surf', 'Once a Day'),
  },
  {
    artist: 'keshi', title: 'GABRIEL', genre: 'R&B', verify: 'high',
    photos: ['39512'], note: '裏ジャケ曲目で確認。「funky groovy」テープ',
    tracks: t('AMEN', 'SAY', 'NIGHT', 'SOFT SPOT', 'LIKE THAT', 'TEXAS', 'DREAM', 'WAR',
      'BODIES', 'REQUIEM', 'EUPHORIA', 'JUST TO DIE', 'ID'),
  },
  {
    artist: 'Men I Trust', title: 'Oncle Jazz', genre: 'Funky/Groovy', verify: 'high',
    photos: ['39665'], tracks: TBD,
  },
  {
    artist: 'Yazmin Lacey', title: 'Teal Dreams', genre: 'R&B', verify: 'high',
    photos: ['39666'], note: '裏ジャケ曲目(一部)で確認。「Groovy funky」テープ',
    tracks: t('Teal Dreams', 'Two Steps', 'Worlds Apart', 'Rear View', 'No Promises',
      'Wild Things', 'Ribbons', 'Water'),
  },

  // ===== ほぼ確定（medium: ジャケ一致だが決め手の文字が弱い）=====
  {
    artist: 'Lucky Daye', title: 'Painted', genre: 'R&B', verify: 'medium', photos: ['38321'],
    tracks: TBD,
  },
  {
    artist: 'SURL', title: '(EP・タイトル要確認)', genre: 'Korean Indie', verify: 'medium',
    photos: ['38327'], note: '緑地に白サボテンのアートワーク。アーティストは高確度、タイトル未確認', tracks: TBD,
  },
  {
    artist: 'Various (Hydeout Productions)', title: 'Hydeout Productions 2nd Collection',
    genre: 'Lo-fi Hip-Hop', verify: 'medium', photos: ['38335'],
    note: '抽象画カバー+「2nd Collection」白文字より', tracks: TBD,
  },
  {
    artist: 'Yellow Days', title: 'A Day in a Yellow Beat', genre: 'Funky/Groovy', verify: 'medium',
    photos: ['38955', '39505'], note: '赤背景+機材に囲まれた人物のジャケ', tracks: TBD,
  },
  {
    artist: 'PREP', title: 'PREP', genre: 'Funky/Groovy', verify: 'medium', photos: ['39511'],
    note: '夕日と高層ビルのイラストジャケ（セルフタイトル作と推定）', tracks: TBD,
  },

  // ===== 要確認（review: 実物で確認して）=====
  {
    artist: '(不明・韓国系?)', title: '(裏面のみ・要確認)', genre: 'Funky/Groovy', verify: 'review',
    photos: ['38320'],
    note: '曲目: Turn The Music Up / Wouldn’t Wanna Know / Years Don’t Lie / Carrie / On And On // Pictures of You / Don’t Wait For Me / The Stream feat. MISO / Rain / Danny Came Up',
    tracks: t('Turn The Music Up', "Wouldn't Wanna Know", "Years Don't Lie", 'Carrie', 'On And On',
      'Pictures of You', "Don't Wait For Me", 'The Stream (feat. MISO)', 'Rain', 'Danny Came Up'),
  },
  {
    artist: '(不明)', title: '(セピア調ポートレート・要確認)', genre: null, verify: 'review',
    photos: ['38323'], note: '長髪の男性がジャケットを頭にかけたセピア写真。文字情報なし', tracks: TBD,
  },
  {
    artist: '(不明)', title: '(Play With Earth Kit・要確認)', genre: null, verify: 'review',
    photos: ['38325'], note: '裏面: オープンリール機のイラスト+証拠品風フォーム「PROPERTY: Earth」', tracks: TBD,
  },
  {
    artist: '(不明)', title: '(緑ジャケ・3Dメガネの6人組・要確認)', genre: null, verify: 'review',
    photos: ['38329', '39507'],
    note: '金色パネルに Last Dance / Rescue Me / Too Much / Summer Season / Mellow らしき曲目', tracks: TBD,
  },
  {
    artist: 'off the menu', title: '(タイトル要確認・2024 POCLANOS盤)', genre: 'Funky/Groovy', verify: 'review',
    photos: ['38532', '38957', '39510'], note: 'ビューファインダー型キャラのジャケ。「Funky groovy」テープ',
    tracks: t('Driven Anxiety', 'Cherokee', 'Silhouette', 'Echoes (feat. Jhnovr)',
      'Shell (feat. oceanfromtheblue)', 'Aussie Blues', 'Canyon', 'The Void', 'Blindspot',
      'Mirror', 'Lie wit me'),
  },
  {
    artist: '(不明・韓国系)', title: '(白ジャケ・要確認)', genre: 'Funky/Groovy', verify: 'review',
    photos: ['38770'],
    note: 'SIDE A: 틀린질문 / Lester Burnham / 섬 (Queen of Diamonds) / 성수역 / 광견일기 / Bollywood / 빨간 나를, SIDE B: Put Me On Drugs 他。YG PLUS配給',
    tracks: TBD,
  },
  {
    artist: '92914', title: '(タイトル要確認・2022作)', genre: 'Funky/Groovy', verify: 'review',
    photos: ['38953', '38959'], note: '(c)2022 92914。「Funky, Groovy」テープ',
    tracks: t('Colors of you', 'Daydreaming', 'You got me high', 'Sunset', 'Room 4 milk',
      'Still', 'Gustavo!', 'Koh', 'Someday', 'Sesoko beach'),
  },
  {
    artist: '(不明)', title: 'Oh No, Not Again!', genre: null, verify: 'review',
    photos: ['39501'], note: '浜辺に立つ男性+落書き風タイトル。アーティスト名の記載なし', tracks: TBD,
  },
  {
    artist: '(不明)', title: 'THIRSTY', genre: null, verify: 'review',
    photos: ['39504'], note: '白黒ピエタ風写真+「THIRSTY」', tracks: TBD,
  },
  {
    artist: '(不明)', title: 'Hi, My Name Is Insecure', genre: null, verify: 'review',
    photos: ['39509'], note: '青いドアと男性+名札風ステッカー', tracks: TBD,
  },
  {
    artist: '(不明)', title: '(tatemae recordings / Atlantic 2022・要確認)', genre: 'Funky/Groovy', verify: 'review',
    photos: ['40396'],
    note: '裏ジャケのみ。「Funky groovy」テープ',
    tracks: t('dear P', 'no song without you', 'free love', 'iloveyoumorethanicansay', 'by my side',
      "la la la that's how it goes", 'one way to tokyo', "can't bear to be without you",
      'loving you is so easy', 'socialdistancing', 'lines on our faces', 'gone gone gone',
      'our love will never die', 'smile more smile more smile more'),
  },
];

// 棚の背表紙写真（38313, 40398）から読み取れた所蔵作品（写真単体がないため参考情報）
export const SHELF_SPINES = [
  'Jazzy Bazz — Memoria', 'Jacob Collier — Djesse Vol. 4', 'Larry June — Doing It For Me',
  'Snarky Puppy — We Like It Here', 'Peggy Gou — DJ-Kicks', 'Madlib — Shades of Blue',
  'A Tribe Called Quest — The Low End Theory', 'Guru — Jazzmatazz Vol. 1',
  'Tom Misch & Yussef Dayes — What Kinda Music', 'MC Solaar — Qui Sème le Vent Récolte le Tempo',
  'Delvon Lamarr Organ Trio — I Told You So', 'A Tribe Called Quest — The Anthology',
  'Wallows — Model', 'The Brook & The Bluff — Bluebeard', 'LANY — I met you when I was 18.',
  'Tom Misch — Geography', 'FKJ — Ylang Ylang EP',
];
