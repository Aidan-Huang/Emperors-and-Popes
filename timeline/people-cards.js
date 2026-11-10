/* ============================================================
   《Timeline：皇帝与教皇》人物卡牌数据（39 张）
   底本：John Hirst《The Shortest History of Europe》第六章 50 段原文
   生卒：DBpedia SPARQL + 维基/大英百科交叉核查
   卡图：Wikimedia Commons 公版历史画作 / 雕像 / 手稿（见 cards/people/ATTRIBUTION.md）
   ------------------------------------------------------------
   ★ 本文件是独立模块：不进 CARDS、不参与引擎排序，不影响 41 张事件卡 / 四幕 / 终章。
     仅被 people-preview.html 引用；游戏本体不加载本文件。
   字段：
     kind      'person' 标记，与时间卡的 undefined 区分
     born/died 生卒年（公元前为负 / 生年不详为 null）
     bornTxt/diedTxt/bprec/dprec  显示文本与精度（day|year|approx|range|unknown）
     life     寿命（周岁或约年）
     faction  church|state|local|both —— 完全沿用现有 4 色（文士并入 local）
     cls      A 原文点名 | B 原文未点名、史实推定
     para     原文出处段号（P01–P50，口径同卡牌标注版）
     artPos   'portrait' —— 走 .art-top 同款 object-position:50% 15%
     axis     in 在时间轴内 | out 轴外（希特勒 1889–1945）
     explain  一句史实定位（已去掉旧的「与第 X–Y 张卡有年代重叠」半句）
     src      原文出处段中的一句英文（exact:false 表示取段落首句作节选）
     commons  Wikimedia Commons 原图链接
   ------------------------------------------------------------
   ★ 人物分层
     tier     'key' 关键人物（10 位）| 'normal' 普通人物（29 位）
              选人标准：强关联事件 ≥3 张的叙事主轴 / 某幕标题级冲突的直接
              一方 / 全书概念起点（罗马、教皇国、皇帝加冕制度）；并兼顾四幕
              覆盖，避免全挤在第四幕。名单见《关联数据审阅表》。
     aliases  多个外号 / 本名 / 异译（仅 key），中英混排
     bio      一句话定位（仅 key）
     highlights  参与的最重大事件（仅 key）：{ y 年代, t 事件, card? 对应卡 id }
              含卡外史实（亚克兴海战、九十五条论纲等），让玩家先认人再认卡。
     展示约定：normal 只显姓名 / 头衔 / 生卒 / 寿命 / 势力，不铺陈长说明；
              key 另显外号、大事记与人物关系。视觉上 key 只多一圈淡金描边
              与右上小角标，不改卡型尺寸 / 势力色 / hover 动效。
   ------------------------------------------------------------
   ★ 关联数据（仅数据，不含任何读取 / 布局 / 引擎代码）
     strongCards  人工判定的「史实强关联」事件卡 id 清单。
                  口径：事件落在人物在世期间，且人物本人是该事件的直接
                  当事人（行为者 / 直接对象 / 原文明确点名 / 以他命名）。
                  仅「同期发生」「背景前因」「类比」「身后影响」一律不收。
                  「生卒区间与事件年份重合」≠ 史实关联，两者不可互相替代。
                  当前为纯 id 数组；日后若要分级，可把元素升级为
                  { id, level }，读取侧需同步兼容。
     relations    人物之间的双向对称关系。每条 { to, type, note }；
                  一条边在两人身上各写一次，type / note 完全一致（无方向）。
                    father-son           父子
                    mother-son           母子
                    brother              兄弟
                    spouse               夫妻
                    grandfather-grandson 祖孙
                    rival                对手
                    counterpart          同一重大事件的双方（加冕者/受冕者、
                                         签约双方、庇护者与被庇护者等）
   ------------------------------------------------------------
   ★ 年代重叠（cover / coverRange / coverActs / coverCards）已移除
     原 141 条只是排版账本，现改为消费侧按 born/died + 事件卡 y 自动推算：
       cards 按 y 升序 → 筛 y ∈ [born, died]（born 为 null 视作 -Infinity）
     逐人逐条与原账本比对一致（见 people-preview.html 的校验输出）。
     事件 → 人物反向索引同理：加载时由 strongCards 反推，不在此文件重复维护。
   ============================================================ */

const PEOPLE = [
  {
    id: 'gibbon', kind: 'person', zh: '爱德华·吉本', en: 'Edward Gibbon',
    role: '历史学家', roleEn: 'Historian',
    born: 1737, died: 1794, bornTxt: '1737-05-08', diedTxt: '1794-01-16', life: '56 岁',
    bprec: 'day', dprec: 'day', faction: 'local', cls: 'A', para: 3,
    img: 'cards/people/gibbon.jpg', artPos: 'top',
    axis: 'in',
    explain: '仅以《罗马帝国衰亡史》书名被提及。',
    src: { en: 'The Decline and Fall of the Roman Empire, the title of Edward Gibbon\'s great history, is etched into our consciousness.', exact: true },
    commons: 'https://commons.wikimedia.org/wiki/File:Edward_Emily_Gibbon.jpg',
    tier: 'normal',
    strongCards: [],
    relations: []
  },
  {
    id: 'augustus', kind: 'person', zh: '奥古斯都', en: 'Augustus',
    role: '罗马皇帝', roleEn: 'Roman Emperor',
    born: -63, died: 14, bornTxt: '前 63-09-23', diedTxt: '14-08-19', life: '75 岁',
    bprec: 'day', dprec: 'day', faction: 'state', cls: 'A', para: 3,
    img: 'cards/people/augustus.jpg', artPos: 'top',
    axis: 'in',
    explain: '统治始于前 27 年；生卒确到日。',
    src: { en: 'The last Roman emperor traced his line back to Augustus.', exact: true },
    commons: 'https://commons.wikimedia.org/wiki/File:Augustus_of_Prima_Porta.jpg',
    tier: 'key',
    aliases: ["屋大维", "盖乌斯·屋大维 (Gaius Octavius)", "第一公民 (Princeps)", "神圣者之子 (Divi Filius)", "Imperator Caesar Augustus"],
    bio: "罗马第一位元首。共和国的壳子留着，权力却收进一人之手——「罗马皇帝」这个概念从这里开始。",
    highlights: [
      { y: "前 44", t: "恺撒遇刺，19 岁的屋大维被指定为继承人" },
      { y: "前 31", t: "亚克兴海战击败安东尼与克娄巴特拉，内战终结" },
      { y: "前 27", t: "交还大权、获尊号「奥古斯都」，元首制确立", card: "augustus" },
      { y: "前 27–14", t: "统治 41 年，开启「罗马和平」(Pax Romana)" },
      { y: "14", t: "去世；此后一千年，东西两头的皇帝都把世系追溯到他" }
    ],
    strongCards: ["augustus"],
    relations: []
  },
  {
    id: 'clovis', kind: 'person', zh: '克洛维一世', en: 'Clovis I',
    role: '法兰克国王', roleEn: 'King of the Franks',
    born: 466, died: 511, bornTxt: '约 466', diedTxt: '511-11-27', life: '约 45 年',
    bprec: 'approx', dprec: 'day', faction: 'state', cls: 'A', para: 4,
    img: 'cards/people/clovis.jpg', artPos: 'top',
    axis: 'in',
    explain: '受东罗马皇帝封『执政官』。',
    src: { en: 'Clovis, the first Christian king of the Franks, received the title \'Consul\' from the emperor in the east.', exact: true },
    commons: 'https://commons.wikimedia.org/wiki/File:Clovis-Moreau.jpg',
    tier: 'key',
    aliases: ["克洛德维希 (Chlodowech / Chlodwig)", "法兰克人的第一位基督徒国王", "墨洛温王朝的真正奠基者"],
    bio: "用一场受洗换来教会支持，又向东罗马皇帝讨来「执政官」名分——蛮族王权第一次同时挂上罗马教会与罗马名号。",
    highlights: [
      { y: "约 481", t: "继承萨利安法兰克王位" },
      { y: "486", t: "苏瓦松战役灭西阿格里乌斯，统一北高卢" },
      { y: "约 496–500", t: "率三千亲兵受洗，选择正统基督教而非阿里乌派", card: "clovis" },
      { y: "约 508", t: "受东罗马皇帝阿纳斯塔修斯一世授「执政官」头衔" },
      { y: "511", t: "去世，王国按法兰克习俗分给四子" }
    ],
    strongCards: ["clovis"],
    relations: [
      { to: 'anastasius1', type: 'counterpart', note: '约 508 年授克洛维执政官头衔' }
    ]
  },
  {
    id: 'pepin', kind: 'person', zh: '矮子丕平', en: 'Pepin the Short',
    role: '法兰克国王', roleEn: 'King of the Franks',
    born: 714, died: 768, bornTxt: '约 714', diedTxt: '768-09-24', life: '约 54 年',
    bprec: 'approx', dprec: 'day', faction: 'state', cls: 'A', para: 6,
    img: 'cards/people/pepin.jpg', artPos: 'top',
    axis: 'in',
    explain: '查理曼之父，754/756 两次进军意大利。',
    src: { en: 'King Pepin, the Christian Frankish king, went south into Italy and subdued the Lombards.', exact: true },
    commons: 'https://commons.wikimedia.org/wiki/File:Pepin_le_Bref.jpg',
    tier: 'key',
    aliases: ["丕平三世 (Pepin III)", "矮子丕平 (Pepin le Bref / the Short)", "加洛林王朝开创者"],
    bio: "废掉墨洛温王朝自己称王，又两次进军意大利把土地送给教皇——教皇国与「君权需教廷背书」都从他开始。",
    highlights: [
      { y: "751", t: "获教皇扎卡里认可，废希尔德里克三世，加冕为法兰克国王" },
      { y: "754 / 756", t: "两度越过阿尔卑斯，击退伦巴第人" },
      { y: "756", t: "「丕平献土」：拉文纳至罗马一带交予教皇，教皇国诞生", card: "pepin" },
      { y: "768", t: "去世，王国分给查理曼与卡洛曼" }
    ],
    strongCards: ["pepin"],
    relations: [
      { to: 'charlemagne', type: 'father-son', note: '矮子丕平是查理曼之父' },
      { to: 'stephen2', type: 'counterpart', note: '756 年丕平献土' }
    ]
  },
  {
    id: 'charlemagne', kind: 'person', zh: '查理曼', en: 'Charlemagne',
    role: '法兰克国王 · 罗马皇帝', roleEn: 'King of the Franks & Emperor',
    born: 742, died: 814, bornTxt: '742-04-02', diedTxt: '814-01-28', life: '71 岁',
    bprec: 'day', dprec: 'day', faction: 'state', cls: 'A', para: 7,
    img: 'cards/people/charlemagne.jpg', artPos: 'top',
    axis: 'in',
    explain: '生年有 742 / 747 / 748 三说，卒年 814-01-28 无异。',
    src: { en: 'King Pepin\'s son was Charles the Great or Charlemagne.', exact: true },
    commons: 'https://commons.wikimedia.org/wiki/File:Bust_of_Charlemagne.png',
    tier: 'key',
    aliases: ["查理大帝", "卡尔大帝 (Karl der Große)", "Carolus Magnus", "欧洲之父 (Pater Europae)", "罗马皇帝 (Imperator Romanorum)"],
    bio: "全书最核心的人物。靠个人权威撑起一个没有官僚、没有财政、没有常备军的帝国；人一走，帝国就按日耳曼家产习俗裂开。",
    highlights: [
      { y: "768", t: "与弟卡洛曼共治，771 年独掌法兰克" },
      { y: "774", t: "灭伦巴第王国，自号「伦巴第人之王」" },
      { y: "约 795", t: "建亚琛宫殿，把罗马柱子从意大利运回北方", card: "aachen" },
      { y: "800", t: "圣诞弥撒后毫无预兆地被教皇利奥三世加冕为「罗马皇帝」", card: "charlemagne-800" },
      { y: "约 800 年代", t: "命学者抄写古典手稿，今天能读到的拉丁古典几乎全靠这一次", card: "manuscripts" },
      { y: "814", t: "去世于亚琛，帝国按日耳曼习俗分给子孙", card: "charlemagne-814" },
      { y: "身后 843", t: "孙辈《凡尔登条约》三分帝国，画出后来法德两国的边界", card: "verdun" }
    ],
    strongCards: ["aachen", "charlemagne-800", "manuscripts", "charlemagne-814"],
    relations: [
      { to: 'charlesbald', type: 'grandfather-grandson', note: '祖孙：孙辈三分帝国' },
      { to: 'leo3', type: 'counterpart', note: '800 年教皇为查理曼加冕' },
      { to: 'lothair1', type: 'grandfather-grandson', note: '祖孙：孙辈三分帝国' },
      { to: 'louis1', type: 'father-son', note: '虔诚者路易是查理曼唯一存活的儿子' },
      { to: 'louisgerman', type: 'grandfather-grandson', note: '祖孙：孙辈三分帝国' },
      { to: 'pepin', type: 'father-son', note: '矮子丕平是查理曼之父' }
    ]
  },
  {
    id: 'hitler', kind: 'person', zh: '希特勒', en: 'Adolf Hitler',
    role: '德国元首（轴外）', roleEn: 'Dictator (off-axis)',
    born: 1889, died: 1945, bornTxt: '1889-04-20', diedTxt: '1945-04-30', life: '56 岁',
    bprec: 'day', dprec: 'day', faction: 'state', cls: 'A', para: 7,
    img: 'cards/people/hitler.jpg', artPos: 'top',
    axis: 'out',
    explain: '仅作帝国疆域的类比，年代已超出时间线终点 1870。整段生卒都落在时间线终点 1870 年之外，属「轴外人物」。',
    src: { en: 'Since the fall of Rome, there has been no single European state that was so extensive except for the short-lived empires of Hitler and Napoleon.', exact: true },
    commons: 'https://commons.wikimedia.org/wiki/File:Hitler_portrait_crop.jpg',
    tier: 'normal',
    strongCards: [],
    relations: []
  },
  {
    id: 'napoleon', kind: 'person', zh: '拿破仑', en: 'Napoleon Bonaparte',
    role: '法兰西皇帝', roleEn: 'Emperor of the French',
    born: 1769, died: 1821, bornTxt: '1769-08-15', diedTxt: '1821-05-05', life: '51 岁',
    bprec: 'day', dprec: 'day', faction: 'state', cls: 'A', para: 40,
    img: 'cards/people/napoleon.jpg', artPos: 'top',
    axis: 'in',
    explain: '1799 执政、1804 加冕、1806 废神圣罗马帝国。',
    src: { en: 'He was Napoleon Bonaparte, who took charge of France in 1799, ten years after the revolution began.', exact: true },
    commons: 'https://commons.wikimedia.org/wiki/File:Jacques-Louis_David_-_The_Emperor_Napoleon_in_His_Study_at_the_Tuileries_-_Google_Art_Project.jpg',
    tier: 'key',
    aliases: ["拿破仑·波拿巴 (Napoléon Bonaparte)", "拿破仑一世", "Buonaparte（科西嘉旧姓）", "科西嘉怪物", "革命之子"],
    bio: "革命十年后，法国人把「人民自治」这项自己搞砸了的权交给一个不相信它的将军。他终结了神圣罗马帝国，却把查士丁尼的法典留在了整个欧洲。",
    highlights: [
      { y: "1799", t: "雾月政变，接管法国", card: "napoleon-1799" },
      { y: "1801", t: "与庇护七世签《政教协定》，恢复「国家提名、教皇授权」", card: "concordat-1801" },
      { y: "1804", t: "圣母院自己戴上皇冠（查理曼冠的复制品），教皇只行祝祷", card: "napoleon-self-crown" },
      { y: "1804", t: "《拿破仑法典》颁布，效法查士丁尼《民法大全》", card: "code-napoleon" },
      { y: "1806", t: "组建莱茵联邦，终结存在 1006 年的神圣罗马帝国", card: "hre-end" },
      { y: "1806", t: "下令建巴黎凯旋门，把自己接进君士坦丁那一脉", card: "arc-1806" },
      { y: "1815 / 1821", t: "滑铁卢败亡；六年后死于圣赫勒拿岛" }
    ],
    strongCards: ["napoleon-1799", "concordat-1801", "napoleon-self-crown", "code-napoleon", "hre-end", "arc-1806"],
    relations: [
      { to: 'francis2', type: 'rival', note: '1806 年终结神圣罗马帝国' },
      { to: 'josephb', type: 'brother', note: '拿破仑分封兄弟于欧洲各王国' },
      { to: 'josephine', type: 'spouse', note: '1804 年加冕礼上与其一同受膏' },
      { to: 'pius7', type: 'counterpart', note: '1801 政教协定 / 1804 加冕祝祷' }
    ]
  },
  {
    id: 'augustine', kind: 'person', zh: '圣奥古斯丁', en: 'Augustine of Hippo',
    role: '教父 · 神学家', roleEn: 'Church Father',
    born: 354, died: 430, bornTxt: '354-11-13', diedTxt: '430-08-28', life: '75 岁',
    bprec: 'day', dprec: 'day', faction: 'church', cls: 'A', para: 12,
    img: 'cards/people/augustine.jpg', artPos: 'top',
    axis: 'in',
    explain: '《上帝之城》引文，查理曼最爱读的作者。',
    src: { en: 'Saint Augustine, who lived in the last days of the Roman Empire in the west, wrote in his City of God: \'If there is no justice, what are kingdoms but great robberies?\' Charlemagne knew of this work and understood this point; Saint Augustine was one of his favourite authors.', exact: true },
    commons: 'https://commons.wikimedia.org/wiki/File:Saint_Augustine_by_Philippe_de_Champaigne.jpg',
    tier: 'normal',
    strongCards: [],
    relations: []
  },
  {
    id: 'otto1', kind: 'person', zh: '奥托一世', en: 'Otto I',
    role: '神圣罗马皇帝', roleEn: 'Holy Roman Emperor',
    born: 912, died: 973, bornTxt: '912-11-23', diedTxt: '973-05-07', life: '60 岁',
    bprec: 'day', dprec: 'day', faction: 'state', cls: 'A', para: 17,
    img: 'cards/people/otto1.jpg', artPos: 'top',
    axis: 'in',
    explain: '962 年由教皇加冕为罗马皇帝。',
    src: { en: 'Then in 962 a new, strong king, Otto the First, emerged in the German part of Charlemagne\'s old empire.', exact: true },
    commons: 'https://commons.wikimedia.org/wiki/File:Meissner-dom-stifter.jpg',
    tier: 'key',
    aliases: ["奥托大帝 (Otto der Große / Otto the Great)", "奥托王朝开创者"],
    bio: "962 年那次加冕把「德意志国王 = 罗马皇帝」绑成一条制度：此后一千年，想戴皇冠就得去罗马低头。",
    highlights: [
      { y: "936", t: "继任德意志国王，靠诸侯选举而非单纯世袭" },
      { y: "955", t: "莱希菲尔德之战击溃马扎尔人，终结其西侵" },
      { y: "951 / 961", t: "两度进军意大利，介入教廷与伦巴第政局" },
      { y: "962", t: "教皇约翰十二世在罗马加冕为皇帝", card: "otto-962" },
      { y: "962 后", t: "《奥托特权》确立皇帝对教皇选举的影响力，埋下后来叙任权之争的伏笔" }
    ],
    strongCards: ["otto-962"],
    relations: []
  },
  {
    id: 'gregory7', kind: 'person', zh: '格里高利七世', en: 'Pope Gregory VII',
    role: '教皇', roleEn: 'Pope',
    born: 1015, died: 1085, bornTxt: '约 1015', diedTxt: '1085-05-25', life: '约 70 年',
    bprec: 'approx', dprec: 'day', faction: 'church', cls: 'A', para: 24,
    img: 'cards/people/gregory7.jpg', artPos: 'top',
    axis: 'in',
    explain: '1073 年即位，与亨利四世争主教任免权。',
    src: { en: 'The pope who wanted to upset all those cosy arrangements and bring authority more firmly back to Rome was Gregory VII, who became pope in 1073.', exact: true },
    commons: 'https://commons.wikimedia.org/wiki/File:Ritratto_di_Papa_San_Gregorio_VII.png',
    tier: 'key',
    aliases: ["希尔德布兰德 (Hildebrand)", "Ildebrando di Soana", "圣额我略七世", "克吕尼改革派的教皇"],
    bio: "要把教会从「各地老板说了算」变回「罗马说了算」，为此第一次把绝罚这件武器砸在在位的君主头上。",
    highlights: [
      { y: "约 1015", t: "生于托斯卡纳，本名希尔德布兰德，克吕尼改革派核心" },
      { y: "1073", t: "当选教皇，要收回主教任免权", card: "gregory-1073" },
      { y: "1075", t: "《教皇敕令》(Dictatus Papae)：主教只许罗马任命，废黜世俗叙任", card: "dictatus-1075" },
      { y: "1076", t: "绝罚亨利四世，宣布臣民无须服从他", card: "excommunication-1076" },
      { y: "1077", t: "卡诺莎：亨利四世赤足雪地求恕三日，教皇难以拒绝", card: "canossa-1077" },
      { y: "1085", t: "亨利四世反攻罗马，他流亡萨莱诺去世；1122 年双方各让一步收场" }
    ],
    strongCards: ["gregory-1073", "dictatus-1075", "excommunication-1076", "canossa-1077"],
    relations: [
      { to: 'henry4', type: 'rival', note: '主教任免之争：绝罚与卡诺莎' }
    ]
  },
  {
    id: 'henry4', kind: 'person', zh: '亨利四世', en: 'Henry IV',
    role: '神圣罗马皇帝', roleEn: 'Holy Roman Emperor',
    born: 1050, died: 1106, bornTxt: '1050-11-11', diedTxt: '1106-08-07', life: '55 岁',
    bprec: 'day', dprec: 'day', faction: 'state', cls: 'A', para: 24,
    img: 'cards/people/henry4.jpg', artPos: 'top',
    axis: 'in',
    explain: '1077 年卡诺莎雪地请罪。',
    src: { en: 'The emperor Henry IV replied that he would continue to do so.', exact: true },
    commons: 'https://commons.wikimedia.org/wiki/File:Heinrich_4_g.jpg',
    tier: 'key',
    aliases: ["海因里希四世 (Heinrich IV)", "萨利安王朝的亨利四世", "卡诺莎的请罪者"],
    bio: "叙任权之争的另一半。在雪地里跪了三天，赢回的不是面子，是「皇帝还能继续当」这件事本身。",
    highlights: [
      { y: "1056", t: "六岁即位，母后摄政，诸侯趁机坐大" },
      { y: "1073", t: "回敬格里高利七世：主教任免照旧由皇帝来", card: "gregory-1073" },
      { y: "1076", t: "被绝罚，德意志诸侯大喜，威胁另选国王", card: "excommunication-1076" },
      { y: "1077", t: "卡诺莎雪地求恕三日，保住皇位", card: "canossa-1077" },
      { y: "1084", t: "反过来攻入罗马、扶立对立教皇，格里高利七世流亡而死" },
      { y: "1106", t: "去世；1122 年其子亨利五世签《沃尔姆斯协定》收场" }
    ],
    strongCards: ["gregory-1073", "excommunication-1076", "canossa-1077"],
    relations: [
      { to: 'gregory7', type: 'rival', note: '主教任免之争：绝罚与卡诺莎' }
    ]
  },
  {
    id: 'cellini', kind: 'person', zh: '本韦努托·切利尼', en: 'Benvenuto Cellini',
    role: '金匠 · 雕塑家', roleEn: 'Goldsmith & Sculptor',
    born: 1500, died: 1571, bornTxt: '1500-11-03', diedTxt: '1571-02-13', life: '70 岁',
    bprec: 'day', dprec: 'day', faction: 'local', cls: 'A', para: 27,
    img: 'cards/people/cellini.jpg', artPos: 'top',
    axis: 'in',
    explain: '自传里教皇炮击 anecdote 的讲述者。',
    src: { en: 'The pope as warrior is wonderfully described by the Renaissance artist Cellini in his autobiography.', exact: true },
    commons: 'https://commons.wikimedia.org/wiki/File:CelliniBust.jpg',
    tier: 'normal',
    strongCards: ["cellini"],
    relations: [
      { to: 'clement7', type: 'counterpart', note: '1527 年罗马之劫，城墙上并肩' }
    ]
  },
  {
    id: 'peter', kind: 'person', zh: '圣彼得', en: 'Saint Peter',
    role: '使徒 · 首任罗马主教', roleEn: 'Apostle',
    born: null, died: 66, bornTxt: '不详', diedTxt: '约 66', life: '不详',
    bprec: 'unknown', dprec: 'range', faction: 'church', cls: 'A', para: 28,
    img: 'cards/people/peter.jpg', artPos: 'top',
    axis: 'in',
    explain: '生年不详，殉道约 64–68；『首任罗马主教』。',
    src: { en: 'Here is a sculpture of Saint Peter, the supposed first bishop of Rome, dressed as a medieval pope, with gorgeous cloak and great crown.', exact: true },
    commons: 'https://commons.wikimedia.org/wiki/File:Saint_Peter-Sinai_%286th_Century%29_Crop.jpg',
    tier: 'normal',
    strongCards: [],
    relations: []
  },
  {
    id: 'william1', kind: 'person', zh: '征服者威廉', en: 'William the Conqueror',
    role: '英格兰国王', roleEn: 'King of England',
    born: 1028, died: 1087, bornTxt: '约 1028', diedTxt: '1087-09-09', life: '约 59 年',
    bprec: 'approx', dprec: 'day', faction: 'state', cls: 'A', para: 34,
    img: 'cards/people/william1.jpg', artPos: 'top',
    axis: 'in',
    explain: '1066 年征服英格兰，原文一笔带过。',
    src: { en: 'In England this was much helped by its conquest in 1066 by Duke William who, in seizing control of all parts of the country by force, established a stronger monarchy than in mainland Europe.', exact: true },
    commons: 'https://commons.wikimedia.org/wiki/File:William_the_Conqueror_%28TFA%29.jpg',
    tier: 'normal',
    strongCards: ["william-1066"],
    relations: []
  },
  {
    id: 'luther', kind: 'person', zh: '马丁·路德', en: 'Martin Luther',
    role: '宗教改革家', roleEn: 'Reformer',
    born: 1483, died: 1546, bornTxt: '1483-11-10', diedTxt: '1546-02-18', life: '62 岁',
    bprec: 'day', dprec: 'day', faction: 'church', cls: 'A', para: 38,
    img: 'cards/people/luther.jpg', artPos: 'top',
    axis: 'in',
    explain: '沃尔姆斯拒不退让，被腓特烈藏于城堡译经。',
    src: { en: 'Luther\'s Reformation took root and flourished in Germany because secular power was dispersed.', exact: true },
    commons: 'https://commons.wikimedia.org/wiki/File:Lucas_Cranach_d.%C3%84._-_Martin_Luther%2C_1528_%28Veste_Coburg%29.jpg',
    tier: 'key',
    aliases: ["马丁·路德 (Martin Luther)", "奥斯定会修士马丁", "维滕贝格的论纲作者", "瓦特堡的「容克约尔格」"],
    bio: "一个修士拒不退让之所以能长成宗教改革，靠的不是他本人，而是德意志散装的权力——没人真能把皇帝的命令执行下去。",
    highlights: [
      { y: "1517", t: "维滕贝格张贴《九十五条论纲》" },
      { y: "1521", t: "沃尔姆斯议会拒不让步，被查理五世判为异端", card: "worms-diet" },
      { y: "1521", t: "被智者腓特烈「劫走」藏于瓦特堡，化名容克约尔格译出德文新约", card: "luther-hidden" },
      { y: "1525", t: "路德宗成型：诸侯接管教会与土地，宗教改革同时是一次产权改革", card: "lutheran" },
      { y: "1546", t: "去世；1648 年《威斯特伐利亚和约》才把这场分裂固定下来" }
    ],
    strongCards: ["worms-diet", "luther-hidden", "lutheran"],
    relations: [
      { to: 'charles5', type: 'rival', note: '1521 年沃尔姆斯议会判为异端' },
      { to: 'frederick3', type: 'counterpart', note: '1521 年劫走藏于瓦特堡' }
    ]
  },
  {
    id: 'frederick3', kind: 'person', zh: '智者腓特烈（萨克森选帝侯）', en: 'Frederick III of Saxony',
    role: '萨克森选帝侯', roleEn: 'Elector of Saxony',
    born: 1463, died: 1525, bornTxt: '1463-01-17', diedTxt: '1525-05-05', life: '62 岁',
    bprec: 'day', dprec: 'day', faction: 'local', cls: 'A', para: 38,
    img: 'cards/people/frederick3.jpg', artPos: 'top',
    axis: 'in',
    explain: '把路德『劫走』藏起来，路德宗由此落地。',
    src: { en: 'His orders were immediately frustrated by Frederick the Elector of Saxony, who seized Luther and took him into hiding.', exact: true },
    commons: 'https://commons.wikimedia.org/wiki/File:Lucas_Cranach_d.%C3%84._-_Friedrich_III._von_Sachsen%2C_genannt_der_Weise_%28Liechtenstein_Collection%29.jpg',
    tier: 'normal',
    strongCards: ["luther-hidden", "lutheran"],
    relations: [
      { to: 'luther', type: 'counterpart', note: '1521 年劫走藏于瓦特堡' }
    ]
  },
  {
    id: 'voltaire', kind: 'person', zh: '伏尔泰', en: 'Voltaire',
    role: '启蒙思想家', roleEn: 'Philosopher',
    born: 1694, died: 1778, bornTxt: '1694-11-21', diedTxt: '1778-05-30', life: '83 岁',
    bprec: 'day', dprec: 'day', faction: 'local', cls: 'A', para: 40,
    img: 'cards/people/voltaire.jpg', artPos: 'top',
    axis: 'in',
    explain: '『既不神圣、也不罗马、更非帝国』。',
    src: { en: 'Voltaire, the guru of the Enlightenment, mocked the Holy Roman Empire as neither holy, nor Roman, nor an empire, which was true enough, but its survival was always somewhat magical, carrying a name and an idea in a very odd form.', exact: true },
    commons: 'https://commons.wikimedia.org/wiki/File:Atelier_de_Nicolas_de_Largilli%C3%A8re%2C_portrait_de_Voltaire%2C_d%C3%A9tail_%28mus%C3%A9e_Carnavalet%29_-002.jpg',
    tier: 'normal',
    strongCards: ["voltaire"],
    relations: []
  },
  {
    id: 'robespierre', kind: 'person', zh: '罗伯斯庇尔', en: 'Maximilien Robespierre',
    role: '革命家', roleEn: 'Revolutionary',
    born: 1758, died: 1794, bornTxt: '1758-05-06', diedTxt: '1794-07-28', life: '36 岁',
    bprec: 'day', dprec: 'day', faction: 'local', cls: 'A', para: 42,
    img: 'cards/people/robespierre.jpg', artPos: 'top',
    axis: 'in',
    explain: '雅各宾专政与热月政变，革命叙事配角。',
    src: { en: 'The revolution began by proclaiming liberty, equality and fraternity; within four years there was a Jacobin dictatorship ruling by the guillotine; when Robespierre looked like continuing to rule in the same way, even though the war crisis was passed, he was overthrown and executed.', exact: true },
    commons: 'https://commons.wikimedia.org/wiki/File:Robespierre.jpg',
    tier: 'normal',
    strongCards: ["revolution"],
    relations: []
  },
  {
    id: 'justinian', kind: 'person', zh: '查士丁尼一世', en: 'Justinian I',
    role: '东罗马皇帝', roleEn: 'Eastern Roman Emperor',
    born: 482, died: 565, bornTxt: '约 482', diedTxt: '565-11-14', life: '约 83 年',
    bprec: 'approx', dprec: 'day', faction: 'state', cls: 'A', para: 45,
    img: 'cards/people/justinian.jpg', artPos: 'top',
    axis: 'in',
    explain: '《民法大全》作为拿破仑法典的古典范本被提及。',
    src: { en: 'Their greatest work was the development of the Civil Code, an imitation of the great code of Emperor Justinian, a single document in which the law on every subject was laid down.', exact: true },
    commons: 'https://commons.wikimedia.org/wiki/File:Mosaic_of_Justinianus_I_-_Basilica_San_Vitale_%28Ravenna%29.jpg',
    tier: 'normal',
    strongCards: [],
    relations: []
  },
  {
    id: 'josephine', kind: 'person', zh: '约瑟芬', en: 'Joséphine de Beauharnais',
    role: '法兰西皇后', roleEn: 'Empress of the French',
    born: 1763, died: 1814, bornTxt: '1763-06-23', diedTxt: '1814-05-29', life: '50 岁',
    bprec: 'day', dprec: 'day', faction: 'local', cls: 'A', para: 50,
    img: 'cards/people/josephine.jpg', artPos: 'top',
    axis: 'in',
    explain: '1804 年加冕礼上与拿破仑一同受膏。',
    src: { en: 'He anointed Napoleon and his empress, Josephine; he blessed the imperial regalia: orb, hand of justice, sword and sceptre.', exact: true },
    commons: 'https://commons.wikimedia.org/wiki/File:Jos%C3%A9phine_de_Beauharnais_vers_1809_Gros.jpg',
    tier: 'normal',
    strongCards: ["napoleon-self-crown"],
    relations: [
      { to: 'napoleon', type: 'spouse', note: '1804 年加冕礼上与其一同受膏' }
    ]
  },
  {
    id: 'constantine1', kind: 'person', zh: '君士坦丁大帝', en: 'Constantine the Great',
    role: '罗马皇帝', roleEn: 'Roman Emperor',
    born: 272, died: 337, bornTxt: '272-02-27', diedTxt: '337-05-22', life: '65 岁',
    bprec: 'day', dprec: 'day', faction: 'state', cls: 'A', para: 44,
    img: 'cards/people/constantine1.jpg', artPos: 'top',
    axis: 'in',
    explain: '仅见于君士坦丁凯旋门图注（312 年战胜对手）。',
    src: { en: 'Arch of Constantine, Rome: commemorating his victory over a rival emperor in 312 AD.', exact: true },
    commons: 'https://commons.wikimedia.org/wiki/File:Statua_di_Costantino_ai_musei_capitolini.jpg',
    tier: 'normal',
    strongCards: ["arch-constantine"],
    relations: [
      { to: 'maxentius', type: 'rival', note: '312 年米尔维安桥之战' }
    ]
  },
  {
    id: 'irene', kind: 'person', zh: '伊琳娜女皇', en: 'Irene of Athens',
    role: '东罗马女皇', roleEn: 'Byzantine Empress',
    born: 752, died: 803, bornTxt: '约 752', diedTxt: '803-08-09', life: '约 51 年',
    bprec: 'approx', dprec: 'day', faction: 'state', cls: 'B', para: 10,
    img: 'cards/people/irene.jpg', artPos: 'top',
    axis: 'in',
    explain: '797 年刺瞎其子自立，正是 800 年加冕的『借口』。',
    src: { en: 'A woman had become emperor in Constantinople; she had blinded her son, who was the emperor, got rid of him and put herself on the throne.', exact: true },
    commons: 'https://commons.wikimedia.org/wiki/File:Iren_and_Constantin2.jpg',
    tier: 'normal',
    strongCards: ["irene", "charlemagne-800"],
    relations: [
      { to: 'constantine6', type: 'mother-son', note: '797 年刺瞎并废黜亲子自立' }
    ]
  },
  {
    id: 'constantine6', kind: 'person', zh: '君士坦丁六世', en: 'Constantine VI',
    role: '东罗马皇帝', roleEn: 'Byzantine Emperor',
    born: 771, died: 802, bornTxt: '771-01-14', diedTxt: '约 802', life: '约 31 年',
    bprec: 'day', dprec: 'approx', faction: 'state', cls: 'B', para: 10,
    img: 'cards/people/constantine6.jpg', artPos: 'top',
    axis: 'in',
    explain: '被母亲伊琳娜刺瞎废黜，卒年约 802（805 年前）。',
    src: { en: 'A woman had become emperor in Constantinople; she had blinded her son, who was the emperor, got rid of him and put herself on the throne.', exact: true },
    commons: 'https://commons.wikimedia.org/wiki/File:Menologion_of_Basil_024.jpg',
    tier: 'normal',
    strongCards: ["irene"],
    relations: [
      { to: 'constantine5', type: 'grandfather-grandson', note: '君士坦丁五世之孙，利奥四世之子' },
      { to: 'irene', type: 'mother-son', note: '797 年刺瞎并废黜亲子自立' }
    ]
  },
  {
    id: 'leo3', kind: 'person', zh: '教皇利奥三世', en: 'Pope Leo III',
    role: '教皇', roleEn: 'Pope',
    born: 750, died: 816, bornTxt: '约 750', diedTxt: '816-06-12', life: '约 66 年',
    bprec: 'approx', dprec: 'day', faction: 'church', cls: 'B', para: 10,
    img: 'cards/people/leo3.jpg', artPos: 'top',
    axis: 'in',
    explain: '把皇冠戴到查理曼头上的人。',
    src: { en: 'After the mass, and seemingly with no prior warning, the pope placed a crown on Charlemagne\'s head and declared him to be Roman emperor.', exact: true },
    commons: 'https://commons.wikimedia.org/wiki/File:Pope_Leo_III_portrait_%E2%80%93_Triclinium_Leoninum.jpg',
    tier: 'normal',
    strongCards: ["charlemagne-800"],
    relations: [
      { to: 'charlemagne', type: 'counterpart', note: '800 年教皇为查理曼加冕' }
    ]
  },
  {
    id: 'stephen2', kind: 'person', zh: '教皇斯蒂芬二世', en: 'Pope Stephen II',
    role: '教皇', roleEn: 'Pope',
    born: 714, died: 757, bornTxt: '约 714', diedTxt: '757-04-26', life: '约 43 年',
    bprec: 'approx', dprec: 'day', faction: 'church', cls: 'B', para: 6,
    img: 'cards/people/stephen2.jpg', artPos: 'top',
    axis: 'in',
    explain: '越过阿尔卑斯向丕平求援，换来『丕平献土』。',
    src: { en: 'The pope in the eighth century likewise did not want to become subject to the control of the Lombards.', exact: true },
    commons: 'https://commons.wikimedia.org/wiki/File:La_donacion_de_Pipino_el_Breve_al_Papa_Esteban_II.jpg',
    tier: 'normal',
    strongCards: ["lombards-ravenna", "pepin"],
    relations: [
      { to: 'constantine5', type: 'counterpart', note: '751 年求援东罗马皇帝不得' },
      { to: 'pepin', type: 'counterpart', note: '756 年丕平献土' }
    ]
  },
  {
    id: 'anastasius1', kind: 'person', zh: '阿纳斯塔修斯一世', en: 'Anastasius I Dicorus',
    role: '东罗马皇帝', roleEn: 'Eastern Roman Emperor',
    born: 431, died: 518, bornTxt: '约 431', diedTxt: '518-07-09', life: '约 87 年',
    bprec: 'approx', dprec: 'day', faction: 'state', cls: 'B', para: 4,
    img: 'cards/people/anastasius1.jpg', artPos: 'top',
    axis: 'in',
    explain: '约 508 年授克洛维『执政官』称号。',
    src: { en: 'Clovis, the first Christian king of the Franks, received the title \'Consul\' from the emperor in the east.', exact: true },
    commons: 'https://commons.wikimedia.org/wiki/File:Solidus_Anastasius.jpg',
    tier: 'normal',
    strongCards: ["clovis"],
    relations: [
      { to: 'clovis', type: 'counterpart', note: '约 508 年授克洛维执政官头衔' }
    ]
  },
  {
    id: 'constantine5', kind: 'person', zh: '君士坦丁五世', en: 'Constantine V',
    role: '东罗马皇帝', roleEn: 'Byzantine Emperor',
    born: 718, died: 775, bornTxt: '718', diedTxt: '775-09-14', life: '约 57 年',
    bprec: 'year', dprec: 'day', faction: 'state', cls: 'B', para: 6,
    img: 'cards/people/constantine5.jpg', artPos: 'top',
    axis: 'in',
    explain: '8 世纪忙于应付穆斯林入侵，教皇求援不得。',
    src: { en: 'He sought help from the eastern emperor, but he was too busy dealing with the Muslim invasions of his territory.', exact: true },
    commons: 'https://commons.wikimedia.org/wiki/File:48-manasses-chronicle.jpg',
    tier: 'normal',
    strongCards: ["lombards-ravenna"],
    relations: [
      { to: 'constantine6', type: 'grandfather-grandson', note: '君士坦丁五世之孙，利奥四世之子' },
      { to: 'stephen2', type: 'counterpart', note: '751 年求援东罗马皇帝不得' }
    ]
  },
  {
    id: 'zachary', kind: 'person', zh: '教皇扎卡里', en: 'Pope Zachary',
    role: '教皇', roleEn: 'Pope',
    born: 679, died: 752, bornTxt: '679', diedTxt: '752-03-15', life: '约 73 年',
    bprec: 'year', dprec: 'day', faction: 'church', cls: 'B', para: 6,
    img: 'cards/people/zachary.jpg', artPos: 'top',
    axis: 'in',
    explain: '751 年认可丕平取代墨洛温王朝，丕平献土的前因。',
    src: { en: 'The pope in the eighth century likewise did not want to become subject to the control of the Lombards.', exact: true },
    commons: 'https://commons.wikimedia.org/wiki/File:Et%C3%A0_di_papa_Zaccaria%2C_cappella_del_primicerius_Teodoro%2C_Madonna_in_trono_con_Theodoto_e_la_moglie%2C_741-752_%2809%29.jpg',
    tier: 'normal',
    strongCards: ["lombards-ravenna"],
    relations: []
  },
  {
    id: 'louis1', kind: 'person', zh: '虔诚者路易', en: 'Louis the Pious',
    role: '法兰克国王 · 皇帝', roleEn: 'King & Emperor',
    born: 778, died: 840, bornTxt: '778-04-16', diedTxt: '840-06-20', life: '62 岁',
    bprec: 'day', dprec: 'day', faction: 'state', cls: 'B', para: 16,
    img: 'cards/people/louis1.jpg', artPos: 'top',
    axis: 'in',
    explain: '查理曼唯一存活的儿子，帝国未在他手里立刻三分。',
    src: { en: 'But only one son of his survived, so the division of the empire occurred at the next generation, among his grandchildren.', exact: true },
    commons: 'https://commons.wikimedia.org/wiki/File:Ludwik_I_Pobo%C5%BCny.jpg',
    tier: 'normal',
    strongCards: ["charlemagne-814"],
    relations: [
      { to: 'charlemagne', type: 'father-son', note: '虔诚者路易是查理曼唯一存活的儿子' },
      { to: 'charlesbald', type: 'father-son', note: '虔诚者路易之子，843 年得西法兰克' },
      { to: 'lothair1', type: 'father-son', note: '虔诚者路易之子，843 年得中法兰克' },
      { to: 'louisgerman', type: 'father-son', note: '虔诚者路易之子，843 年得东法兰克' }
    ]
  },
  {
    id: 'lothair1', kind: 'person', zh: '洛泰尔一世', en: 'Lothair I',
    role: '中法兰克国王', roleEn: 'King of Middle Francia',
    born: 795, died: 855, bornTxt: '795', diedTxt: '855-09-29', life: '约 60 年',
    bprec: 'year', dprec: 'day', faction: 'state', cls: 'B', para: 16,
    img: 'cards/people/lothair1.jpg', artPos: 'top',
    axis: 'in',
    explain: '孙辈三分帝国：中法兰克。',
    src: { en: 'But only one son of his survived, so the division of the empire occurred at the next generation, among his grandchildren.', exact: true },
    commons: 'https://commons.wikimedia.org/wiki/File:Lothar_I.jpg',
    tier: 'normal',
    strongCards: ["verdun"],
    relations: [
      { to: 'charlemagne', type: 'grandfather-grandson', note: '祖孙：孙辈三分帝国' },
      { to: 'charlesbald', type: 'brother', note: '843 年凡尔登三分帝国' },
      { to: 'louis1', type: 'father-son', note: '虔诚者路易之子，843 年得中法兰克' },
      { to: 'louisgerman', type: 'brother', note: '843 年凡尔登三分帝国' }
    ]
  },
  {
    id: 'louisgerman', kind: 'person', zh: '日耳曼人路易', en: 'Louis the German',
    role: '东法兰克国王', roleEn: 'King of East Francia',
    born: 806, died: 876, bornTxt: '约 806', diedTxt: '876-08-28', life: '约 70 年',
    bprec: 'approx', dprec: 'day', faction: 'state', cls: 'B', para: 16,
    img: 'cards/people/louisgerman.jpg', artPos: 'top',
    axis: 'in',
    explain: '孙辈三分帝国：东法兰克 → 德国。',
    src: { en: 'But only one son of his survived, so the division of the empire occurred at the next generation, among his grandchildren.', exact: true },
    commons: 'https://commons.wikimedia.org/wiki/File:Psalter_Ludwigs_des_Deutschen_-_f120r.jpg',
    tier: 'normal',
    strongCards: ["verdun"],
    relations: [
      { to: 'charlemagne', type: 'grandfather-grandson', note: '祖孙：孙辈三分帝国' },
      { to: 'charlesbald', type: 'brother', note: '843 年凡尔登三分帝国' },
      { to: 'lothair1', type: 'brother', note: '843 年凡尔登三分帝国' },
      { to: 'louis1', type: 'father-son', note: '虔诚者路易之子，843 年得东法兰克' }
    ]
  },
  {
    id: 'charlesbald', kind: 'person', zh: '秃头查理', en: 'Charles the Bald',
    role: '西法兰克国王', roleEn: 'King of West Francia',
    born: 823, died: 877, bornTxt: '823-06-13', diedTxt: '877-10-06', life: '54 岁',
    bprec: 'day', dprec: 'day', faction: 'state', cls: 'B', para: 16,
    img: 'cards/people/charlesbald.jpg', artPos: 'top',
    axis: 'in',
    explain: '孙辈三分帝国：西法兰克 → 法国。',
    src: { en: 'But only one son of his survived, so the division of the empire occurred at the next generation, among his grandchildren.', exact: true },
    commons: 'https://commons.wikimedia.org/wiki/File:Biblioth%C3%A8que_nationale_de_France_-_Bible_de_Vivien_Ms._Latin_1_folio_423r_d%C3%A9tail_Le_comte_Vivien_offre_le_manuscrit_de_la_Bible_faite_%C3%A0_l%27abbaye_de_Saint-Martin_de_Tours_%C3%A0_Charles_le_Chauve.jpg',
    tier: 'normal',
    strongCards: ["verdun"],
    relations: [
      { to: 'charlemagne', type: 'grandfather-grandson', note: '祖孙：孙辈三分帝国' },
      { to: 'lothair1', type: 'brother', note: '843 年凡尔登三分帝国' },
      { to: 'louis1', type: 'father-son', note: '虔诚者路易之子，843 年得西法兰克' },
      { to: 'louisgerman', type: 'brother', note: '843 年凡尔登三分帝国' }
    ]
  },
  {
    id: 'charles5', kind: 'person', zh: '查理五世', en: 'Charles V',
    role: '神圣罗马皇帝', roleEn: 'Holy Roman Emperor',
    born: 1500, died: 1558, bornTxt: '1500-02-24', diedTxt: '1558-09-21', life: '58 岁',
    bprec: 'day', dprec: 'day', faction: 'state', cls: 'B', para: 38,
    img: 'cards/people/charles5.jpg', artPos: 'top',
    axis: 'in',
    explain: '1521 年宣布路德为异端，命令被诸侯架空。',
    src: { en: 'It was the duty of the emperor to put down Luther\'s heresy and rather belatedly he attempted to do so.', exact: true },
    commons: 'https://commons.wikimedia.org/wiki/File:Portrait_of_Charles_V%2C_Holy_Roman_Emperor%2C_seated_%281500%E2%80%931558%29%2C_formerly_attributed_to_Titian_%28Alte_Pinakothek%2C_Munich%29.jpg',
    tier: 'normal',
    strongCards: ["worms-diet", "luther-hidden"],
    relations: [
      { to: 'luther', type: 'rival', note: '1521 年沃尔姆斯议会判为异端' }
    ]
  },
  {
    id: 'clement7', kind: 'person', zh: '教皇克莱门特七世', en: 'Pope Clement VII',
    role: '教皇', roleEn: 'Pope',
    born: 1478, died: 1534, bornTxt: '1478-05-26', diedTxt: '1534-09-25', life: '56 岁',
    bprec: 'day', dprec: 'day', faction: 'church', cls: 'B', para: 27,
    img: 'cards/people/clement7.jpg', artPos: 'top',
    axis: 'in',
    explain: '1527 年罗马之劫，切利尼在城墙上与之并肩。',
    src: { en: 'The pope as warrior is wonderfully described by the Renaissance artist Cellini in his autobiography.', exact: true },
    commons: 'https://commons.wikimedia.org/wiki/File:El_papa_Clemente_VII%2C_por_Sebastiano_del_Piombo.jpg',
    tier: 'normal',
    strongCards: ["cellini"],
    relations: [
      { to: 'cellini', type: 'counterpart', note: '1527 年罗马之劫，城墙上并肩' }
    ]
  },
  {
    id: 'pius7', kind: 'person', zh: '教皇庇护七世', en: 'Pope Pius VII',
    role: '教皇', roleEn: 'Pope',
    born: 1742, died: 1823, bornTxt: '1742-08-14', diedTxt: '1823-08-20', life: '81 岁',
    bprec: 'day', dprec: 'day', faction: 'church', cls: 'B', para: 50,
    img: 'cards/people/pius7.jpg', artPos: 'top',
    axis: 'in',
    explain: '为拿破仑与约瑟芬傅油，皇冠却由拿破仑自己戴上。',
    src: { en: 'The pope was present in Notre Dame cathedral when Napoleon was crowned as emperor.', exact: true },
    commons: 'https://commons.wikimedia.org/wiki/File:Sir_Thomas_Lawrence_-_Portrait_of_Pope_Pius_VII.jpg',
    tier: 'key',
    aliases: ["庇护七世 (Pius VII)", "本名巴尔纳巴·基亚拉蒙蒂 (Barnaba Chiaramonti)", "被拿破仑押走的教皇"],
    bio: "在同一场加冕礼上为拿破仑与约瑟芬傅油，却眼看着皇冠由拿破仑自己戴上——教权与新兴帝国之间那点微妙的平衡，全写在这一幕里。",
    highlights: [
      { y: "1800", t: "威尼斯秘密会议当选教皇" },
      { y: "1801", t: "与拿破仑签《政教协定》，法国与罗马复交", card: "concordat-1801" },
      { y: "1804", t: "赴巴黎圣母院为拿破仑与约瑟芬傅油，皇冠却被拿破仑自取", card: "napoleon-self-crown" },
      { y: "1809", t: "拒绝承认拿破仑吞并教皇国，被押往萨沃纳、枫丹白露软禁" },
      { y: "1814", t: "返罗马，恢复耶稣会，并在维也纳会议后重建教皇国" }
    ],
    strongCards: ["concordat-1801", "napoleon-self-crown"],
    relations: [
      { to: 'napoleon', type: 'counterpart', note: '1801 政教协定 / 1804 加冕祝祷' }
    ]
  },
  {
    id: 'francis2', kind: 'person', zh: '弗朗茨二世', en: 'Francis II',
    role: '末代神圣罗马皇帝', roleEn: 'Last Holy Roman Emperor',
    born: 1768, died: 1835, bornTxt: '1768-02-12', diedTxt: '1835-03-02', life: '67 岁',
    bprec: 'day', dprec: 'day', faction: 'state', cls: 'B', para: 3,
    img: 'cards/people/francis2.jpg', artPos: 'top',
    axis: 'in',
    explain: '末代神圣罗马皇帝，1806 年退位，帝号一脉上溯奥古斯都。',
    src: { en: 'The last Roman emperor traced his line back to Augustus.', exact: true },
    commons: 'https://commons.wikimedia.org/wiki/File:Francis_II%2C_Holy_Roman_Emperor_at_age_25%2C_1792.png',
    tier: 'normal',
    strongCards: ["hre-end"],
    relations: [
      { to: 'napoleon', type: 'rival', note: '1806 年终结神圣罗马帝国' }
    ]
  },
  {
    id: 'constantine11', kind: 'person', zh: '君士坦丁十一世', en: 'Constantine XI',
    role: '东罗马末代皇帝', roleEn: 'Last Byzantine Emperor',
    born: 1404, died: 1453, bornTxt: '1404-02-08', diedTxt: '1453-05-29', life: '49 岁',
    bprec: 'day', dprec: 'day', faction: 'state', cls: 'B', para: 4,
    img: 'cards/people/constantine11.jpg', artPos: 'top',
    axis: 'in',
    explain: '东罗马撑到 1453 年终章的最后一位皇帝。',
    src: { en: 'Around 400 AD the empire was permanently divided into east and west and the eastern empire survived another thousand years until 1453.', exact: true },
    commons: 'https://commons.wikimedia.org/wiki/File:Konstantinos_XI_Palaiologos_fresco_%28less_edited%29.jpg',
    tier: 'normal',
    strongCards: ["constantinople-1453"],
    relations: []
  },
  {
    id: 'maxentius', kind: 'person', zh: '马克森提乌斯', en: 'Maxentius',
    role: '罗马皇帝（竞争者）', roleEn: 'Rival Emperor',
    born: 283, died: 312, bornTxt: '约 283', diedTxt: '312-10-28', life: '约 29 年',
    bprec: 'approx', dprec: 'day', faction: 'state', cls: 'B', para: 44,
    img: 'cards/people/maxentius.jpg', artPos: 'top',
    axis: 'in',
    explain: '312 年米尔维安桥之败，凯旋门所纪念的对手。',
    src: { en: 'Arch of Constantine, Rome: commemorating his victory over a rival emperor in 312 AD.', exact: true },
    commons: 'https://commons.wikimedia.org/wiki/File:Portrait_of_Maxentius_%28SK_Dresden_Hm_406%29_03.jpg',
    tier: 'normal',
    strongCards: ["arch-constantine"],
    relations: [
      { to: 'constantine1', type: 'rival', note: '312 年米尔维安桥之战' }
    ]
  },
  {
    id: 'josephb', kind: 'person', zh: '约瑟夫·波拿巴', en: 'Joseph Bonaparte',
    role: '那不勒斯 · 西班牙国王', roleEn: 'King of Naples & Spain',
    born: 1768, died: 1844, bornTxt: '1768-01-07', diedTxt: '1844-07-28', life: '76 岁',
    bprec: 'day', dprec: 'day', faction: 'state', cls: 'B', para: 48,
    img: 'cards/people/josephb.jpg', artPos: 'top',
    axis: 'in',
    explain: '拿破仑分封兄弟于欧洲各王国的代表。',
    src: { en: 'He extended the boundaries of France and beyond France he reshaped principalities and kingdoms and put his brothers in charge of them.', exact: true },
    commons: 'https://commons.wikimedia.org/wiki/File:Joseph-Bonaparte.jpg',
    tier: 'normal',
    strongCards: [],
    relations: [
      { to: 'napoleon', type: 'brother', note: '拿破仑分封兄弟于欧洲各王国' }
    ]
  }
];

if (typeof module !== 'undefined') module.exports = { PEOPLE };
