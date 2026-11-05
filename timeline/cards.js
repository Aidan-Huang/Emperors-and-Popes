/* ============================================================
   《Timeline：皇帝与教皇》卡牌数据
   基于 John Hirst《The Shortest History of Europe》第六章
   全部事件、年份与引文均出自该章原文。
   ------------------------------------------------------------
   字段说明
     id      唯一标识
     y       排序用年份（公元前为负数；同年事件用小数区分先后）
     dy      卡面显示年份
     approx  是否模糊年代（带「约」）
     zh/en   事件名（中/英）
     faction church 教权 | state 皇权 | local 地方 | both 双方
     act     所属幕 1-4
     diff    easy | medium | hard
     icon    无图卡的主视觉符号（白卡占位）
     img     卡图（cards/ 下为已定稿卡图，../images/ 为章内图）
     explain 判定后的一句讲解
     quote   书中原句（英 + 中译）
     src     书中原文段落（英 + 中译），反馈条里可展开
     audio   有声书切片（../audio/ 下，沿用姊妹作 15 段切片）
   ============================================================ */

const ACTS = [
  {
    id: 1,
    name: '帝国的余晖与重生',
    span: '公元前 27 年 — 800 年',
    desc: '罗马塌了，可中世纪的人并不这么想：在他们眼里，罗马一直活着。',
    after: '教皇造出了一个皇帝——从此欧洲有了两个太阳。'
  },
  {
    id: 2,
    name: '皇帝与教皇的绑定',
    span: '790 年代 — 1050 年代',
    desc: '查理曼的帝国靠一个人撑着，人一走，权力就漏给了伯爵、公爵和选帝侯。',
    after: '德意志国王一旦加冕即皇帝——名分从此握在教皇手里。'
  },
  {
    id: 3,
    name: '主教任免之争',
    span: '1073 — 1122',
    desc: '教会是最大的跨国机构，却被国王和诸侯掏空：谁当主教，谁就拿到土地与官职。',
    after: '卡诺莎的雪地里，教皇赢了面子，皇帝保住了里子。'
  },
  {
    id: 4,
    name: '双雄相争的遗产',
    span: '1066 — 1870',
    desc: '两强互斗千年，谁也没赢——真正长起来的，是夹缝里的那些小邦。',
    after: '中欧碎成一地拼图，文艺复兴与宗教改革就长在这条缝里。'
  }
];

const FACTIONS = {
  church: { name: '教权', en: 'CHURCH', color: '#378ADD', icon: '✝' },
  state:  { name: '皇权', en: 'STATE',  color: '#EF9F27', icon: '♛' },
  local:  { name: '地方', en: 'LOCAL',  color: '#a8a79f', icon: '⚔' },
  both:   { name: '双方', en: 'BOTH',   color: '#c8b271', icon: '⚖' }
};

const CARDS = [

  /* ================= 第一幕 · 帝国的余晖与重生 ================= */

  {
    id: 'augustus', y: -27, dy: '公元前 27', approx: false,
    zh: '奥古斯都开创罗马帝国',
    en: 'Augustus founds the Roman Empire',
    faction: 'state', act: 1, diff: 'easy', icon: '🏛',
    img: 'cards/augustus.jpg',
    explain: '故事的起点：十九世纪那位"最后的罗马皇帝"，仍把自己的世系一路追溯到奥古斯都。',
    quote: {
      en: 'The reign of Augustus began in 27 BC and in the west the empire he founded lasted for 500 years.',
      zh: '奥古斯都的统治始于公元前 27 年；他缔造的帝国，在西方延续了五百年。'
    },
    src: {
      en: 'There was in fact something called the Roman Empire existing into the nineteenth century. The last Roman emperor traced his line back to Augustus. How was this so?',
      zh: '事实上，一直到十九世纪，都还存在着一个叫"罗马帝国"的东西。最后一位罗马皇帝，把自己的血脉追溯到奥古斯都。这怎么可能呢？'
    }
  },
  {
    id: 'arch-constantine', y: 312, dy: '约 312', approx: true,
    zh: '君士坦丁凯旋门建成',
    en: 'The Arch of Constantine, Rome',
    faction: 'state', act: 1, diff: 'easy', icon: '🏛',
    img: 'cards/arch-of-constantine.jpg',
    explain: '罗马的凯旋门纪念的是内战胜利——帝国早已习惯用武力解决继承问题。',
    quote: {
      en: 'Arch of Constantine, Rome: commemorating his victory over a rival emperor in 312 AD.',
      zh: '罗马的君士坦丁凯旋门：纪念他于公元 312 年战胜另一位皇帝。'
    },
    src: {
      en: 'The Roman example was important to Napoleon… a light, open crown, like the laurel wreath that Romans gave to their victors.',
      zh: '罗马的先例对拿破仑至关重要……那是一顶轻巧的开口冠，就像罗马人献给胜利者的桂冠。'
    },
    audio: null
  },
  {
    id: 'empire-split', y: 400, dy: '约 400', approx: true,
    zh: '罗马帝国永久分为东西两半',
    en: 'The empire is permanently divided',
    faction: 'state', act: 1, diff: 'easy', icon: '🗺',
    img: 'cards/empire-split.jpg',
    explain: '西部活了五百年就散了，东部又活了一千年——直到 1453 年。',
    quote: {
      en: 'Around 400 AD the empire was permanently divided into east and west and the eastern empire survived another thousand years until 1453.',
      zh: '约公元 400 年，帝国被永久分为东西两部分；东半部分又延续了一千年，直到 1453 年。'
    },
    src: {
      en: 'The barbarians who invaded the western Roman Empire acknowledged the emperor of the eastern empire.',
      zh: '入侵西罗马帝国的蛮族，仍然承认东罗马皇帝的地位。'
    }
  },
  {
    id: 'clovis', y: 500, dy: '约 500', approx: true,
    zh: '法兰克王克洛维受洗归主',
    en: 'Clovis, first Christian king of the Franks',
    faction: 'state', act: 1, diff: 'medium', icon: '⛪',
    img: 'cards/clovis.jpg',
    explain: '蛮族新王用一场洗礼换来教会的支持，又向东罗马皇帝讨来"执政官"的头衔——名分这东西，中世纪最值钱。',
    quote: {
      en: 'Clovis, the first Christian king of the Franks, received the title ‘Consul’ from the emperor in the east.',
      zh: '法兰克人的第一位基督教国王克洛维，从东方的皇帝那里获得了"执政官"的头衔。'
    },
    src: {
      en: 'In their eyes the Roman Empire still survived… There was a pope in Rome and there was an emperor, a Christian Roman emperor, who now resided in Constantinople.',
      zh: '在他们眼里，罗马帝国依然存在……罗马有一位教皇，也有一位皇帝——一位基督教的罗马皇帝，此刻住在君士坦丁堡。'
    }
  },
  {
    id: 'lombards-ravenna', y: 751, dy: '751', approx: false,
    zh: '伦巴第人攻占拉文纳，罗马告急',
    en: 'The Lombards take Ravenna; Rome in danger',
    faction: 'church', act: 1, diff: 'medium', icon: '⚔',
    img: 'cards/ravenna.jpg',
    explain: '东罗马在意大利的统治中心陷落，教皇失去了最后的保护人——也失去了退路。',
    quote: {
      en: 'The danger to the pope came from the Lombards, who were a second wave of German invaders in the eighth century.',
      zh: '教皇面临的危险来自伦巴第人——他们是八世纪第二波日耳曼入侵者。'
    },
    src: {
      en: 'They were poised to make a complete takeover of Italy, including Rome and the lands around it… The popes have always feared that their independence would disappear if they were not sovereign in their own territory.',
      zh: '他们随时可能彻底接管意大利，包括罗马及其周边土地……教皇们一直担心：若不能在自己领土上行使主权，独立性就会消失。'
    },
    audio: '../audio/p1.mp3'
  },
  {
    id: 'pepin', y: 756, dy: '756', approx: false,
    zh: '丕平献土，"教皇国"诞生',
    en: 'Pepin’s Donation: the Papal States',
    faction: 'church', act: 1, diff: 'medium', icon: '🗝',
    img: 'cards/pepin.jpg',
    explain: '国王要神圣背书，教皇要一块自己的地——这笔交易，一直管到十九世纪。',
    quote: {
      en: 'King Pepin went south into Italy and subdued the Lombards. He made sure that the pope was left with a large belt of territory around Rome.',
      zh: '丕平南下意大利降服伦巴第人，并确保教皇保有罗马周边的大片领土。'
    },
    src: {
      en: 'With many changes of boundaries this territory survived as the pope’s until the nineteenth century.',
      zh: '尽管边界几经变化，这片领土一直属于教皇，直到十九世纪。'
    },
    audio: '../audio/p1.mp3'
  },
  {
    id: 'irene', y: 797, dy: '797', approx: false,
    zh: '拜占庭女帝伊琳妮篡位',
    en: 'Empress Irene seizes the throne',
    faction: 'state', act: 1, diff: 'hard', icon: '👑',
    img: 'cards/irene.jpg',   // Pala d'Oro 珐琅圣像 · 公有领域 · Wikimedia Commons
    explain: '君士坦丁堡出了个女皇帝——教皇正好拿它当借口：西方不再有皇帝了，所以我要另立一个。',
    quote: {
      en: 'A woman had become emperor in Constantinople; she had blinded her son, who was the emperor, got rid of him and put herself on the throne.',
      zh: '君士坦丁堡出了一个女皇帝：她弄瞎了自己的儿子——那位皇帝——把他赶下台，自己坐上宝座。'
    },
    src: {
      en: 'By the pope’s deed, she was no longer emperor over the west.',
      zh: '按教皇的说法，她从此不再是西方的皇帝。'
    }
  },
  {
    id: 'charlemagne-800', y: 800, dy: '800', approx: false,
    zh: '教皇为查理曼加冕"罗马皇帝"',
    en: 'The pope crowns Charlemagne',
    faction: 'church', act: 1, diff: 'easy', icon: '👑',
    img: 'cards/charlemagne-crowned.jpg',
    explain: '弥撒之后毫无预兆的一顶冠——教皇造出了自己的保护人，也造出了此后千年的对手。',
    quote: {
      en: 'After the mass, and seemingly with no prior warning, the pope placed a crown on Charlemagne’s head and declared him to be Roman emperor.',
      zh: '弥撒之后，似乎毫无预兆地，教皇把一顶冠戴在查理曼头上，宣布他为罗马皇帝。'
    },
    src: {
      en: 'Popes emphasised that it was the pope who put the crown on Charlemagne’s head, which indicated that the pope was superior to the emperor. But after the pope put the crown on Charlemagne’s head, he bowed to Charlemagne.',
      zh: '教皇们强调：是教皇把皇冠戴到查理曼头上，可见教皇高于皇帝。可教皇加冕之后，又向查理曼鞠躬行礼。'
    },
    audio: '../audio/p2.mp3'
  },
  {
    id: 'franks-850', y: 850, dy: '约 850', approx: true,
    zh: '法兰克王国版图鼎盛',
    en: 'The Frankish kingdom at its height',
    faction: 'state', act: 1, diff: 'medium', icon: '🗺',
    img: '../images/map-kingdom-of-the-franks-c850.jpg',
    explain: '自罗马陷落以来，欧洲再没有哪个国家这么大——除了希特勒和拿破仑那两个短命帝国。',
    quote: {
      en: 'Since the fall of Rome, there has been no single European state that was so extensive except for the short-lived empires of Hitler and Napoleon.',
      zh: '自罗马陷落以来，欧洲没有哪一个单一国家有过如此辽阔的疆域——除了希特勒与拿破仑那两个短命帝国。'
    },
    src: {
      en: 'His lands extended across the Pyrenees into Spain; halfway down Italy… in the east to Austria and well into modern Germany.',
      zh: '他的领土越过比利牛斯山进入西班牙；纵贯半个意大利……东至奥地利，并深入今天的德国。'
    }
  },

  /* ================= 第二幕 · 皇帝与教皇的绑定 ================= */

  {
    id: 'aachen', y: 795, dy: '约 790 年代', approx: true,
    zh: '查理曼建亚琛宫殿，罗马柱从意大利运回',
    en: 'The palace at Aachen, with Roman pillars',
    faction: 'state', act: 2, diff: 'hard', icon: '🏛',
    img: null,
    explain: '一个识字困难的蛮族国王，执意把罗马的柱子搬回北方——他要的是"罗马"这个样子。',
    quote: {
      en: 'The pillars supporting the arches were actually Roman; Charlemagne brought them back from Italy.',
      zh: '支撑拱门的柱子其实是罗马的——查理曼把它们从意大利运了回来。'
    },
    src: {
      en: 'Only the chapel survives. It is built in the Romanesque style, that is, after the style of Rome, with the rounded arches.',
      zh: '只有礼拜堂留存下来。它是罗马式建筑——也就是照罗马的样子、用圆拱建成的。'
    },
    audio: '../audio/e2.mp3'
  },
  {
    id: 'manuscripts', y: 805, dy: '约 800 年代', approx: true,
    zh: '查理曼命学者抄写古典手稿',
    en: 'The copying of the ancient manuscripts',
    faction: 'state', act: 2, diff: 'medium', icon: '📜',
    img: null,
    explain: '今天能读到的拉丁古典著作，几乎全靠这一次抄写——文明有时只悬于一个人的兴趣。',
    quote: {
      en: 'Nearly all the Latin works that have survived were copied in Charlemagne’s time. Without him the classical inheritance would have been very slim.',
      zh: '流传至今的拉丁著作，几乎全都抄成于查理曼的时代。没有他，古典遗产将所剩无几。'
    },
    src: {
      en: 'Charlemagne, though poorly educated himself, encouraged education and became the patron of learned men, who were ordered to find and copy the ancient manuscripts.',
      zh: '查理曼本人受教育不多，却鼓励教育、庇护学者，并命人搜寻和抄写古代手稿。'
    },
    audio: '../audio/e2.mp3'
  },
  {
    id: 'charlemagne-814', y: 814, dy: '814', approx: false,
    zh: '查理曼去世，帝国按日耳曼习俗分给子孙',
    en: 'Charlemagne dies; the empire to be subdivided',
    faction: 'state', act: 2, diff: 'medium', icon: '⚰',
    img: null,
    explain: '帝国靠一个人，而不是一套制度——没有官僚、没有财政、没有常备军，人亡则政息。',
    quote: {
      en: 'There was no institutional base to this empire; its government depended on the personal power of its leader.',
      zh: '这个帝国没有任何制度基础；它的统治完全依赖领袖个人的力量。'
    },
    src: {
      en: 'He had no bureaucracy; communications were poor; there was little trade; towns were tiny; there was a great amount of chaos.',
      zh: '他没有官僚机构；交通通讯糟糕；贸易稀少；城镇极小；到处是一片混乱。'
    },
    audio: '../audio/e1.mp3'
  },
  {
    id: 'verdun', y: 843, dy: '843', approx: false,
    zh: '查理曼之孙三分帝国',
    en: 'The empire falls into three parts',
    faction: 'state', act: 2, diff: 'easy', icon: '🗺',
    img: 'cards/verdun.jpg',
    explain: '西边成了法兰西，东边成了德意志——欧洲最要紧的一条国界，是一次家产分割画出来的。',
    quote: {
      en: 'The western part eventually became modern-day France; the eastern part became the basis of Germany.',
      zh: '西部的那一块最终成了今天的法国；东部那一块成了德意志的基础。'
    },
    src: {
      en: 'The grandsons fought among themselves and Charlemagne’s empire fell into three parts.',
      zh: '孙辈们彼此混战，查理曼的帝国一分为三。'
    },
    audio: '../audio/e1.mp3'
  },
  {
    id: 'viking', y: 875, dy: '约 850–900', approx: true,
    zh: '维京入侵乱世，伯爵公爵坐大',
    en: 'Norse invasions; counts and dukes entrench',
    faction: 'local', act: 2, diff: 'medium', icon: '🛡',
    img: null,
    explain: '中央一乱，地方就实：伯爵与公爵变成土皇帝，欧洲退回罗马陷落时的散装状态。',
    quote: {
      en: 'The counts and dukes established themselves as local strongmen with only very weak allegiance to whomever might be king.',
      zh: '伯爵与公爵把自己立为地方豪强，对不管哪位国王，只剩极淡的效忠。'
    },
    src: {
      en: 'Europe had reverted to what it was immediately after the fall of Rome: power was very much dispersed.',
      zh: '欧洲退回了罗马陷落之后的样子：权力极度分散。'
    }
  },
  {
    id: 'otto-962', y: 962, dy: '962', approx: false,
    zh: '教皇为德王奥托一世加冕',
    en: 'Otto I crowned Roman emperor',
    faction: 'church', act: 2, diff: 'easy', icon: '👑',
    img: null,
    explain: '"德意志国王 = 罗马皇帝"从此绑定：想要皇冠，就得去罗马低头。',
    quote: {
      en: 'Thereafter whoever became the king of Germany was, after being crowned by the pope, also Roman emperor and later Holy Roman emperor.',
      zh: '此后，凡成为德意志国王者，经教皇加冕之后，也就是罗马皇帝，后来称神圣罗马皇帝。'
    },
    src: {
      en: 'With the disappearance of Charlemagne’s empire, the pope had lost his strongman to protect him. For a while he made do with whatever local princes he could find and crowned them emperor.',
      zh: '查理曼帝国一消失，教皇就失去了保护他的强人。有一阵子他只能将就，找到哪个地方诸侯就给哪个加冕为皇帝。'
    },
    audio: '../audio/e3.mp3'
  },
  {
    id: 'electors', y: 1000, dy: '约 1000', approx: true,
    zh: '德意志国王由选举产生，选帝侯渐成',
    en: 'The German king is elected; the electors',
    faction: 'local', act: 2, diff: 'hard', icon: '🗳',
    img: null,
    explain: '别国都在世袭，唯独德意志坚持选举——于是皇帝不得不向选他的人让权。',
    quote: {
      en: 'Since the emperor had to curry favour with the electors to win his post, he was sometimes yielding power rather than claiming it from them.',
      zh: '既然皇帝必须讨好选帝侯才能得到位子，他有时就不是向他们收权，而是让权。'
    },
    src: {
      en: 'In Germany the kings were not so adept at producing good heirs so the system of election was maintained… eventually there were just seven who bore the name ‘elector’.',
      zh: '在德意志，国王们不太擅长生出出色的继承人，于是选举制保留下来……最后只剩七位享有"选帝侯"之名。'
    },
    audio: '../audio/e3.mp3'
  },
  {
    id: 'church-land', y: 1055, dy: '约 1050 年代', approx: true,
    zh: '教会土地占德意志近半，主教任免成战场',
    en: 'The church holds almost half of Germany',
    faction: 'church', act: 2, diff: 'hard', icon: '⛪',
    img: null,
    explain: '主教手里有土地、有官职、有收入——谁任命主教，谁就掌握了半个德意志。',
    quote: {
      en: 'Sometimes a third of the land was in the church’s hands; in Germany it was almost half.',
      zh: '有时三分之一的土地握在教会手里；在德意志，则几乎达到一半。'
    },
    src: {
      en: 'It was always being undermined because kings and local powerbrokers wanted to control who became bishops in their own territory.',
      zh: '教会始终被掏空，因为国王与地方权贵都想掌控自己地盘上谁来当主教。'
    },
    audio: '../audio/p3.mp3'
  },

  /* ================= 第三幕 · 主教任免之争 ================= */

  {
    id: 'gregory-1073', y: 1073, dy: '1073', approx: false,
    zh: '格里高利七世当选教皇，要收回主教任免权',
    en: 'Gregory VII becomes pope',
    faction: 'church', act: 3, diff: 'medium', icon: '✝',
    img: null,
    explain: '他要把教会从"各地老板说了算"，变回"罗马说了算"——冲突由此无可避免。',
    quote: {
      en: 'He declared that he would in future appoint bishops. The emperor Henry IV replied that he would continue to do so.',
      zh: '他宣布：今后主教由他任命。皇帝亨利四世回敬说：这事还得由他来。'
    },
    src: {
      en: 'The pope who wanted to upset all those cosy arrangements and bring authority more firmly back to Rome was Gregory VII, who became pope in 1073.',
      zh: '想要打翻这些舒服的安排、把权威更牢地收回罗马的教皇，就是 1073 年登位的格里高利七世。'
    },
    audio: '../audio/p3.mp3'
  },
  {
    id: 'dictatus-1075', y: 1075, dy: '1075', approx: false,
    zh: '格里高利宣布：主教只许罗马任命',
    en: 'Bishops to be appointed from Rome alone',
    faction: 'church', act: 3, diff: 'easy', icon: '📜',
    img: null,
    explain: '一句话废掉了国王们最值钱的一项专利——等于宣布各地主教的"老板"换了人。',
    quote: {
      en: 'From the eleventh century the two fell out because popes began to insist that the church should be run from Rome and kings and princes should not meddle in its affairs.',
      zh: '从十一世纪起双方翻脸，因为教皇开始坚持：教会应由罗马管理，国王与诸侯不得插手。'
    },
    src: {
      en: 'The bishops had many jobs in their gift… and they controlled large portions of land from which the church derived its income.',
      zh: '主教手里握着许多可以送人的职位……还控制着大片土地，教会的收入正来自这些土地。'
    }
  },
  {
    id: 'excommunication-1076', y: 1076, dy: '1076', approx: false,
    zh: '亨利四世被绝罚，臣民"可以不服从他"',
    en: 'Henry IV excommunicated',
    faction: 'church', act: 3, diff: 'easy', icon: '⚡',
    img: null,
    explain: '绝罚不杀皇帝本人，杀的是"臣民必须服从他"这条纽带——德意志诸侯大喜过望。',
    quote: {
      en: 'Having excommunicated a king, they told the people in his territories that they did not have to obey him.',
      zh: '绝罚一位国王之后，教皇便昭告其领地的臣民：你们可以不再服从他。'
    },
    src: {
      en: 'German dukes and princes, who always wanted to escape from the emperor’s control, were delighted to find that he was excommunicated and could be ignored.',
      zh: '德意志的公爵与诸侯，本来就总想摆脱皇帝的控制，此刻发现皇帝被绝罚、可以被无视，简直是喜出望外。'
    },
    audio: '../audio/e4.mp3'
  },
  {
    id: 'canossa-1077', y: 1077, dy: '1077', approx: false,
    zh: '卡诺莎之雪：亨利四世赤足雪地求恕三日',
    en: 'The Humiliation of Canossa',
    faction: 'church', act: 3, diff: 'easy', icon: '❄',
    img: 'cards/canossa.jpg',
    explain: '教皇赢了面子，皇帝保住了里子——一位基督徒教皇，很难拒绝一个跪着来求恕的人。',
    quote: {
      en: 'It was very hard for a Christian pope to refuse to grant forgiveness.',
      zh: '一位基督徒教皇，很难拒绝宽恕一个前来忏悔的人。'
    },
    src: {
      en: 'He waited outside for two or three days in the snow, begging the pope to see him. He had cast off all his royal regalia; he was dressed in humble clothes.',
      zh: '他在城堡外的雪地里等了两三天，恳求教皇见他一面。他已卸下全部王室装束，只穿粗衣。'
    },
    audio: '../audio/p4.mp3'
  },
  {
    id: 'pope-at-war', y: 1085, dy: '约 1080 年代', approx: true,
    zh: '教皇也是君主：征税、雇兵、结盟诸侯开战',
    en: 'The pope as warrior',
    faction: 'church', act: 3, diff: 'hard', icon: '⚔',
    img: '../images/statue-of-saint-peter-st-peters-basilica-rome.jpg',
    explain: '"上帝的事归上帝"——可要守住上帝的事，得有税、有兵、有盟友。',
    quote: {
      en: 'He is a monarch in his own right; he has his own territories from which he collects taxes which he then uses to hire soldiers.',
      zh: '他本身就是一位君主：他有自己的领土，从中征税，再用这些钱去雇士兵。'
    },
    src: {
      en: 'Sometimes the pope made an alliance with the German princes who did not want to be subject to the emperor and opened a front, as it were, in the emperor’s rear.',
      zh: '有时教皇会与不愿臣服皇帝的德意志诸侯结盟，等于在皇帝的后方开辟了一条战线。'
    }
  },
  {
    id: 'worm-concordat-1122', y: 1122, dy: '1122', approx: false,
    zh: '沃尔姆斯协定：皇帝提名、教皇授权',
    en: 'The Concordat of Worms',
    faction: 'both', act: 3, diff: 'medium', icon: '⚖',
    img: null,
    explain: '争了半个世纪，最后是各让一步：皇帝可以出主意，权杖和法衣仍由教皇授予。',
    quote: {
      en: 'The emperor was allowed to have some influence in choosing bishops but it was to be the pope who actually gave them their staff of office and their official robes.',
      zh: '皇帝可以在主教人选上保有一些影响力，但真正授予权杖与法衣的，必须是教皇。'
    },
    src: {
      en: 'The dispute dragged on for years and finally there was a compromise.',
      zh: '这场争执拖了许多年，最后达成妥协。'
    },
    audio: '../audio/p4.mp3'
  },

  /* ================= 第四幕 · 双雄相争的遗产 ================= */

  {
    id: 'william-1066', y: 1066, dy: '1066', approx: false,
    zh: '威廉征服英格兰，强行建立更强的王权',
    en: 'William conquers England',
    faction: 'state', act: 4, diff: 'medium', icon: '🏹',
    img: null,
    explain: '对照线：英格兰被武力一次性压平，反而比欧陆更早长出统一国家。',
    quote: {
      en: 'In England this was much helped by its conquest in 1066 by Duke William who, in seizing control of all parts of the country by force, established a stronger monarchy than in mainland Europe.',
      zh: '英格兰更是受益于 1066 年威廉公爵的征服：他以武力控制全国各地，建立起比欧陆更强的王权。'
    },
    src: {
      en: 'In the west, England, France and Spain have now emerged as unified countries… the king’s writ runs right through his territory.',
      zh: '在西方，英格兰、法兰西与西班牙已然成为统一国家……国王的政令可以直贯全境。'
    }
  },
  {
    id: 'hapsburg', y: 1450, dy: '约 1450 年代', approx: true,
    zh: '哈布斯堡家族开始垄断神圣罗马帝国皇位',
    en: 'The Hapsburgs monopolise the emperorship',
    faction: 'state', act: 4, diff: 'hard', icon: '🦅',
    img: null,
    explain: '皇帝这个位子本身没多少权力了，但名头依然抢手——哈布斯堡一包就是几百年。',
    quote: {
      en: 'From the late Middle Ages one family always provided the person who was elected Holy Roman emperor. This was the Hapsburgs.',
      zh: '从中世纪晚期开始，被选为神圣罗马皇帝的人总是出自同一个家族——哈布斯堡。'
    },
    src: {
      en: 'To them, holding the position of emperor added to their prestige; their power came from their own kingdoms.',
      zh: '对他们而言，皇帝这个位子增添的是声望；真正的权力来自他们自己的王国。'
    },
    audio: '../audio/i_voltaire.mp3'
  },
  {
    id: 'constantinople-1453', y: 1453, dy: '1453', approx: false,
    zh: '东罗马帝国（拜占庭）灭亡',
    en: 'The eastern empire ends',
    faction: 'state', act: 4, diff: 'medium', icon: '🕯',
    img: '../images/chart-roman-empire-continuity.jpg',
    explain: '从奥古斯都数起，这条线走了将近一千五百年才断——"罗马"这个词，到此才算真正落幕。',
    quote: {
      en: 'The eastern empire survived another thousand years until 1453.',
      zh: '东部的帝国又延续了一千年，直到 1453 年。'
    },
    src: {
      en: 'The last Roman emperor traced his line back to Augustus.',
      zh: '最后一位罗马皇帝，把自己的世系追溯到奥古斯都。'
    }
  },
  {
    id: 'italy-1494', y: 1494, dy: '约 1494', approx: true,
    zh: '意大利城邦并立——文艺复兴的土壤',
    en: 'The states of Italy, c. 1494',
    faction: 'local', act: 4, diff: 'easy', icon: '🎨',
    img: '../images/map-states-of-italy-renaissance-c1494.jpg',
    explain: '一群又小又富、谁也管不了谁的城邦，把最有才华的人挤在一处——重造古典世界的项目，只能由它们来干。',
    quote: {
      en: 'Because they were states as well as cities, they concentrated many talented people in one place.',
      zh: '因为它们既是一座城，又是一个国，于是把大批有才华的人聚在同一个地方。'
    },
    src: {
      en: 'The northern cities of Italy, where the Renaissance began, were small city-states such as had existed in classical Greece.',
      zh: '文艺复兴发端于意大利北部的城市——它们就像古典希腊那样，是一个个小型城邦。'
    },
    audio: '../audio/f2.mp3'
  },
  {
    id: 'worms-diet', y: 1521, dy: '1521', approx: false,
    zh: '沃尔姆斯议会：路德拒不让步，被判异端',
    en: 'Luther refuses to recant at Worms',
    faction: 'state', act: 4, diff: 'medium', icon: '🔥',
    img: null,
    explain: '皇帝有责任扑灭异端，可他的命令出了会场就不算数——德意志的权力是散的。',
    quote: {
      en: 'When Luther refused to recant, the emperor declared that he was a heretic, that no-one should support him and that he should be arrested.',
      zh: '路德拒绝撤回，皇帝便宣布他为异端：任何人不得支持他，并应将他逮捕。'
    },
    src: {
      en: 'Luther’s Reformation took root and flourished in Germany because secular power was dispersed.',
      zh: '路德的宗教改革之所以能在德意志扎根繁盛，是因为世俗权力是分散的。'
    },
    audio: '../audio/f1.mp3'
  },
  {
    id: 'luther-hidden', y: 1521.5, dy: '1521', approx: false,
    zh: '腓特烈选帝侯"劫走"路德，藏于城堡译经',
    en: 'Luther spirited away to Wartburg',
    faction: 'local', act: 4, diff: 'medium', icon: '🏰',
    img: null,
    explain: '皇帝的逮捕令第二天就被一位诸侯挫败——这正是"地方坐大"最生动的一幕。',
    quote: {
      en: 'His orders were immediately frustrated by Frederick the Elector of Saxony, who seized Luther and took him into hiding.',
      zh: '皇帝的诏令立刻被萨克森选帝侯腓特烈挫败——他"劫走"路德，把他藏了起来。'
    },
    src: {
      en: 'It was while Luther was hidden in his castle that he began to translate the Bible into German.',
      zh: '路德正是在被藏于城堡期间，开始把《圣经》译成德文。'
    },
    audio: '../audio/f1.mp3'
  },
  {
    id: 'lutheran', y: 1525, dy: '约 1520 年代', approx: true,
    zh: '路德宗诞生：德意志诸侯接管教会与土地',
    en: 'Lutheranism is born',
    faction: 'local', act: 4, diff: 'medium', icon: '✝',
    img: null,
    explain: '宗教改革同时是一次产权改革：诸侯接管了教会和教会的地，两头通吃。',
    quote: {
      en: 'They increased their own power at the expense of pope and emperor — and so Lutheranism was born.',
      zh: '他们以牺牲教皇与皇帝为代价壮大了自己——路德宗就此诞生。'
    },
    src: {
      en: 'Frederick and the other German princes who supported Luther saw the advantage of putting themselves in charge of the church and its lands.',
      zh: '腓特烈与支持路德的德意志诸侯，看到了由自己接管教会及其土地的好处。'
    },
    audio: '../audio/f1.mp3'
  },
  {
    id: 'cellini', y: 1527, dy: '约 1527', approx: true,
    zh: '切利尼在城墙上为教皇开炮',
    en: 'Cellini fires the cannon for the pope',
    faction: 'church', act: 4, diff: 'hard', icon: '💥',
    img: null,
    explain: '金匠、炮手、杀人者、忏悔者——教皇一句"我为教会杀的人我都赦了"，把中世纪教权说透了。',
    quote: {
      en: 'Yes, I forgive you; I forgive you all the homicides you commit in the service of the church.',
      zh: '我赦免你；你为教会效命所杀的一切人，我都赦免。'
    },
    src: {
      en: 'Cellini gave the order for the cannon to fire. It was a freakish shot; the ball hit the officer’s sword, which it pushed back, cutting him in half.',
      zh: '切利尼下令开炮。这一炮来得离奇：炮弹打在那军官的剑上，把剑推了回去，将他拦腰截断。'
    },
    audio: '../audio/p5.mp3'
  },
  {
    id: 'westphalia-1648', y: 1648, dy: '1648', approx: false,
    zh: '中欧散装地图：上百小邦',
    en: 'Central Europe in 1648',
    faction: 'local', act: 4, diff: 'medium', icon: '🗺',
    img: '../images/map-western-and-central-europe-1648.jpg',
    explain: '两强为了互斗，把自己在地方的权威一点点卖掉——结果小邦坐大，统一的民族国家反而没长出来。',
    quote: {
      en: 'In central Europe two great powers — emperor and pope — had been struggling, trading away their local authority in order to fight each other.',
      zh: '在中欧，皇帝与教皇这两大势力长期争斗，为了互相开战，把自己在地方的权威一点点交易掉了。'
    },
    src: {
      en: 'The result was that the smaller units gained power rather than lost it.',
      zh: '结果是：越小的单位，权力不减反增。'
    },
    audio: '../audio/i_voltaire.mp3'
  },
  {
    id: 'voltaire', y: 1750, dy: '约 1750 年代', approx: true,
    zh: '伏尔泰：既不神圣，也不罗马，更非帝国',
    en: 'Voltaire mocks the Holy Roman Empire',
    faction: 'both', act: 4, diff: 'hard', icon: '🖋',
    img: null,
    explain: '吐槽很准，可它偏偏一直活着——靠一个名字和一个念头，活成了一个魔法般的遗存。',
    quote: {
      en: 'Voltaire mocked the Holy Roman Empire as neither holy, nor Roman, nor an empire.',
      zh: '伏尔泰嘲讽神圣罗马帝国：既不神圣，也不罗马，更非帝国。'
    },
    src: {
      en: 'Its survival was always somewhat magical, carrying a name and an idea in a very odd form.',
      zh: '它能存续下去，总有几分魔法的意味——以一种非常古怪的形式，承载着一个名字和一个观念。'
    },
    audio: '../audio/i_voltaire.mp3'
  },
  {
    id: 'revolution', y: 1789, dy: '1789', approx: false,
    zh: '法国大革命爆发',
    en: 'The French Revolution begins',
    faction: 'local', act: 4, diff: 'easy', icon: '🚩',
    img: null,
    explain: '自由、平等、博爱开场，四年后是断头台——欧洲旧秩序的裂缝从这里撕开。',
    quote: {
      en: 'The revolution began by proclaiming liberty, equality and fraternity; within four years there was a Jacobin dictatorship ruling by the guillotine.',
      zh: '革命以宣布自由、平等、博爱开场；不出四年，就出现了靠断头台统治的雅各宾专政。'
    },
    src: {
      en: 'That was the task Napoleon set himself and his panel of experts.',
      zh: '这正是拿破仑交给自己与那班专家的任务。'
    }
  },
  {
    id: 'napoleon-1799', y: 1799, dy: '1799', approx: false,
    zh: '拿破仑接管法国',
    en: 'Bonaparte takes charge of France',
    faction: 'state', act: 4, diff: 'easy', icon: '⚔',
    img: null,
    explain: '革命十年后，法国人把"人民自治"这项自己搞砸了的权，交给了一个不相信它的将军。',
    quote: {
      en: 'He was a son of the Enlightenment, a believer in the principles of the revolution, except in the right of the people to govern themselves.',
      zh: '他是启蒙之子，信仰革命的原则，唯独不信人民有自治的权利。'
    },
    src: {
      en: 'He was Napoleon Bonaparte, who took charge of France in 1799, ten years after the revolution began.',
      zh: '他就是拿破仑·波拿巴——在革命爆发十年后的 1799 年，接管了法国。'
    }
  },
  {
    id: 'concordat-1801', y: 1801, dy: '1801', approx: false,
    zh: '拿破仑与教皇签《政教协定》',
    en: 'The Concordat: state nominates, pope invests',
    faction: 'both', act: 4, diff: 'hard', icon: '⚖',
    img: null,
    explain: '八百年前那一套又回来了：国家提名，教皇授权——卡诺莎吵出来的公式，被一个不信神的皇帝重新启用。',
    quote: {
      en: 'On the appointment of bishops the Concordat re-instated an old practice: the state would nominate bishops and the pope would invest them.',
      zh: '在主教任命上，《政教协定》恢复了一项老做法：国家提名主教，教皇授予职权。'
    },
    src: {
      en: 'He realised how firmly people were attached to their faith and how useful religion was in maintaining morality and good order.',
      zh: '他明白人们对信仰依恋之深，也明白宗教在维系道德与秩序上有多大用处。'
    }
  },
  {
    id: 'napoleon-self-crown', y: 1804, dy: '1804', approx: false,
    zh: '拿破仑在圣母院自己戴上皇冠',
    en: 'Napoleon crowns himself',
    faction: 'state', act: 4, diff: 'easy', icon: '👑',
    img: 'cards/napoleon-self-crown.jpg',
    explain: '教皇在场，只行祝祷；冠是查理曼那顶的复制品——但这一次，是自己戴上去的。',
    quote: {
      en: 'But Napoleon himself put the crown on his head. It was a replica of the crown the pope had placed on Charlemagne.',
      zh: '但拿破仑自己把皇冠戴上了头。那是一顶复刻教皇为查理曼所戴之冠的复制品。'
    },
    src: {
      en: 'He anointed Napoleon and his empress, Josephine; he blessed the imperial regalia: orb, hand of justice, sword and sceptre.',
      zh: '他为拿破仑及其皇后约瑟芬傅油，并祝圣了帝权象征：宝球、正义之手、剑与权杖。'
    },
    audio: '../audio/e5.mp3'
  },
  {
    id: 'code-napoleon', y: 1804.5, dy: '1804', approx: false,
    zh: '《拿破仑法典》颁布',
    en: 'The Napoleonic Code',
    faction: 'state', act: 4, diff: 'medium', icon: '📕',
    img: null,
    explain: '效法查士丁尼：一部书里写尽全部法律——罗马留给欧洲最耐用的遗产，是法典而不是帝国。',
    quote: {
      en: 'Their greatest work was the development of the Civil Code, an imitation of the great code of Emperor Justinian.',
      zh: '他们最伟大的成果是《民法典》的编纂——模仿的是查士丁尼皇帝那部伟大的法典。'
    },
    src: {
      en: 'What pleased him most, reflecting on his life in exile on Saint Helena, was the survival throughout Europe of his Napoleonic Code — which still survives.',
      zh: '在圣赫勒拿岛流放中回顾一生，最令他欣慰的是：他的《拿破仑法典》在整个欧洲留存了下来——至今犹存。'
    }
  },
  {
    id: 'hre-end', y: 1806, dy: '1806', approx: false,
    zh: '莱茵联邦成立，神圣罗马帝国终结',
    en: 'The Holy Roman Empire abolished',
    faction: 'state', act: 4, diff: 'medium', icon: '⚰',
    img: null,
    explain: '终结一个旧帝国的，是一个新帝国的头领——从查理曼算起，一千零六年。',
    quote: {
      en: 'Napoleon abolished it in 1806 when he regrouped several small states in Germany into the Confederation of the Rhine.',
      zh: '1806 年，拿破仑把德意志的若干小邦重组为莱茵联邦，就此废除了它。'
    },
    src: {
      en: 'It took the head of a new empire to abolish this strange survival of an old one.',
      zh: '要废除一个旧帝国这般古怪的遗存，得由一个新帝国的头来动手。'
    },
    audio: '../audio/e5.mp3'
  },
  {
    id: 'arc-1806', y: 1806.5, dy: '1806', approx: false,
    zh: '巴黎凯旋门动工',
    en: 'The Arc de Triomphe commissioned',
    faction: 'state', act: 4, diff: 'hard', icon: '🏛',
    img: '../images/arc-de-triomphe-paris.jpg',
    explain: '权力巅峰时下令造一座罗马式的凯旋门——他把自己放进君士坦丁那一脉的谱系里。',
    quote: {
      en: 'Arc de Triomphe, Paris: commissioned by Napoleon at the height of his power in 1806.',
      zh: '巴黎凯旋门：由拿破仑在权力巅峰的 1806 年下令建造。'
    },
    src: {
      en: 'The Roman example was important to Napoleon. At first he called himself Consul, then Emperor.',
      zh: '罗马的先例对拿破仑至关重要。他先称执政官，后称皇帝。'
    }
  },
  {
    id: 'italy-1870', y: 1870, dy: '1870', approx: false,
    zh: '意大利统一，教皇退居梵蒂冈',
    en: 'The pope confined to the Vatican',
    faction: 'church', act: 4, diff: 'hard', icon: '🕊',
    img: null,
    explain: '1114 年的教皇国，最后缩成一块"手帕大的王国"——教皇用一千年换来的独立，只剩这几步地。',
    quote: {
      en: 'It was only then, with the creation of a unified Italian state, that the pope was confined to the pocket-handkerchief kingdom he has today.',
      zh: '直到那时，随着统一的意大利国家诞生，教皇才被压缩进他今天那块"手帕大"的王国。'
    },
    src: {
      en: 'Even today, the pope still has his own individual plot of ground, Vatican City. It is tiny but it is his own state.',
      zh: '即使在今天，教皇仍拥有自己的一小块地——梵蒂冈城。它极小，却是他自己的国家。'
    }
  }
];

/* 冷知识卡：不参与排序，判定后随机掉落 */
const TRIVIA = [
  {
    id: 't-byz', title: '同一时代的东方',
    text: '君士坦丁堡的皇帝既管俗务，也管教会：牧首由皇帝任命、听命于皇帝。西方则是教会与国家两种权威分离、各自独立——这正是西欧与拜占庭最要紧的分野。',
    quote: { en: 'In the west the two authorities of church and state were separate and had independent authority.', zh: '在西方，教会与国家这两种权威是分离的，各自拥有独立的权力。' },
    audio: '../audio/i_byz.mp3'
  },
  {
    id: 't-boss', title: '老板与工人',
    text: '教皇与皇帝打到僵持，谁也没获得完胜。它更像老板与工人的冲突：有罢工，有解雇威胁，激烈而苦涩，但你知道总会有和解，也总会有老板和工人。',
    quote: { en: 'There will always be a settlement and that there will always be bosses and workers.', zh: '总会有和解，也总会有老板和工人。' },
    audio: '../audio/i_boss.mp3'
  },
  {
    id: 't-toyota', title: '丰田的比方',
    text: '教会像一家总部在东京的丰田：澳洲分公司老总由总理任命，厂长由市长任命。他们名义上效忠东京，实际上得先看总理和市长的脸色。中世纪的教会就是这样被地方权贵掏空的。',
    quote: { en: 'This is what the medieval church was like: it had been undermined, white-anted and plundered by local powerbrokers.', zh: '中世纪的教会就是这样：被地方权贵掏空、蛀空、瓜分。' },
    audio: null
  },
  {
    id: 't-augustine', title: '奥古斯丁的一句话',
    text: '查理曼最爱的作家之一奥古斯丁在《上帝之城》里写："如果没有正义，王国不过是大规模的抢劫。"这位识字困难的蛮族国王，偏偏读懂了这一句。',
    quote: { en: 'If there is no justice, what are kingdoms but great robberies?', zh: '如果没有正义，王国不过是大股的劫匪罢了。' },
    audio: '../audio/e2.mp3'
  }
];

if (typeof module !== 'undefined') module.exports = { CARDS, ACTS, FACTIONS, TRIVIA };
