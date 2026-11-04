/* ============================================================
   《权力的双人舞 · Emperors and Popes》游戏数据
   基于 John Hirst《The Shortest History of Europe》第六章
   供 app.js 使用；文案中的英文引句均为书中原文。
   ============================================================ */

const GAME_DATA = {

  lines: {
    pope: {
      id: 'pope', name: '教皇线', icon: '✝', color: '#378ADD',
      subtitle: '扮演教皇 · 5 个抉择 · 约 5 分钟',
      desc: '从伦巴第人兵临城下，到卡诺莎城堡外的漫天大雪——你来决定教会的命运。',
      recommended: true,
      flow: ['p1', 'p2', 'i_byz', 'p3', 'p4', 'p5', 'i_boss'],
      // 简易线：只走五个抉择，不带对照卡
      flowEasy: ['p1', 'p2', 'p3', 'p4', 'p5'],
      flavorTitle: '圣彼得的继承人',
      // 751 年开局：教会无领地、无军队；西罗马已亡，东边皇帝鞭长莫及；伦巴第诸侯横行
      start: { church: 40, state: 30, local: 55 },
      startNote: '751 年：教会没有自己的国土，罗马悬在伦巴第人刀下；西边没有皇帝，东边皇帝远在天边。'
    },
    emperor: {
      id: 'emperor', name: '皇帝线', icon: '♛', color: '#EF9F27',
      subtitle: '扮演皇帝 · 5 个抉择 · 约 10 分钟',
      desc: '从查理曼的庞大帝国，到拿破仑自己戴上的皇冠——你来执掌帝冠的沉浮。',
      recommended: false,
      flow: ['e1', 'e2', 'e3', 'e4', 'i_voltaire', 'e5'],
      flavorTitle: '帝冠的执掌者',
      // 814 年开局：查理曼武功巅峰，伯爵公爵尚被压住；教皇刚拿到领地，仍需皇帝保护
      start: { church: 45, state: 65, local: 40 },
      startNote: '814 年：查理曼的帝国如日中天，教皇刚有了领地、仍要靠你保护，地方豪强尚未成气候。'
    },
    local: {
      id: 'local', name: '地方线', icon: '⚔', color: '#888780',
      subtitle: '扮演地方诸侯 · 2 个抉择 · 约 4 分钟',
      desc: '教皇和皇帝斗了千年，真正的赢家另有其人——体验权力夹缝中的自由。',
      recommended: false,
      lockedUntilAnyLineDone: true,
      flow: ['f1', 'f2'],
      flavorTitle: '乱世的地方豪强',
      // 1521 年开局：教会在改革前夜看似鼎盛，皇帝强势却被法国与奥斯曼牵着走，诸侯正要起飞
      start: { church: 55, state: 50, local: 45 },
      startNote: '1521 年：教会表面上如日中天，查理五世强势却被法国与奥斯曼牵着走——诸侯的机会来了。'
    }
  },

  scenes: {

    /* ---------------- 教皇线 ---------------- */

    p1: {
      type: 'scene', lane: 'church', year: '751 年', where: '罗马 · 拉特兰宫',
      title: '伦巴第的阴影',
      img: 'images/map-kingdom-of-the-franks-c850.jpg',
      imgCaption: '法兰克王国 c. 850 —— 你求助的那个北方强权',
      audio: 'audio/p1.mp3',
      setup: [
        '你是 8 世纪的教皇。第二波日耳曼入侵者——伦巴第人——正步步吞并整个意大利，罗马危在旦夕。',
        '如果罗马失守，你将失去一切：教会的土地、财富与独立地位。教皇们始终相信：没有自己的领地，就没有独立的教会。',
        '你手里没有像样的军队，必须找一个大靠山。东边的罗马皇帝理论上仍是你的共主——但他此刻正被穆斯林的进攻缠得脱不开身。',
        '你把目光投向了……'
      ],
      setupShort: '伦巴第人兵临罗马城下。你没有军队，必须找一个靠山。',
      options: [
        { t: '继续指望东罗马皇帝出兵', isHistory: false,
          fb: '远水救不了近火。东边的皇帝正被穆斯林入侵搞得焦头烂额，舰队和军队都派不出来。等待的结果很可能是：伦巴第人拿下罗马，你从此变成他们治下的一个主教——教会的独立，就此终结。' },
        { t: '越过阿尔卑斯山，找法兰克王丕平', isHistory: true,
          fb: '丕平（Pepin）是西边最强的日耳曼国王，新近夺位，正需要一个神圣认可来证明自己名正言顺。你们一拍即合。' },
        { t: '和伦巴第人谈判求和', isHistory: false,
          fb: '谈判桌上你是弱势一方：没有军队做后盾，任何协议都只是延迟被吞并的时间。一旦住进伦巴第人的屋檐下，你将不再是独立的君主，只是他们辖区里的一个主教。' }
      ],
      historyText: '教皇先试过东边的皇帝，指望不上；于是越过阿尔卑斯山求助于法兰克王丕平。丕平出兵降服伦巴第人，并确保教皇拥有罗马周边的大片领土。这片领土几经变迁，一直延续到 19 世纪——今天梵蒂冈仍是教皇自己的小小国度。',
      quote: { en: 'So the pope looked north across the Alps to the Franks… King Pepin went south into Italy and subdued the Lombards. He made sure that the pope was left with a large belt of territory around Rome.',
               zh: '于是教皇越过阿尔卑斯山望向法兰克人……丕平南下意大利降服伦巴第人，并确保教皇拥有罗马周边的大片领土。' },
      point: '教皇「弃东投西」：一个以罗马为中心、不再听命于君士坦丁堡的西欧天主教世界，从此诞生。',
      truth: '后来：丕平献上的这片领土几经变迁，一直存续到 19 世纪——1870 年意大利军队开进罗马，教皇国才真正终结，只留下梵蒂冈这一小块。',
      delta: { church: 6, state: 0, local: 0 },
      source: [
        'The danger to the pope came from the Lombards, who were a second wave of German invaders in the eighth century. They were poised to make a complete takeover of Italy, including Rome and the lands around it. This represented a great threat to the pope.',
        'The pope in the eighth century likewise did not want to become subject to the control of the Lombards. He sought help from the eastern emperor, but he was too busy dealing with the Muslim invasions of his territory. So the pope looked north across the Alps to the Franks, the Germans who had made the strongest state in the west, in what is now France.',
        'King Pepin, the Christian Frankish king, went south into Italy and subdued the Lombards. He made sure that the pope was left with a large belt of territory around Rome, which was to be his. With many changes of boundaries this territory survived as the pope\u2019s until the nineteenth century.'
      ]
    },

    p2: {
      type: 'scene', lane: 'church', year: '800 年', where: '罗马 · 圣诞夜弥撒',
      title: '加冕之后',
      img: null, decoIcon: '👑',
      audio: 'audio/p2.mp3',
      setup: [
        '公元 800 年圣诞夜，罗马大教堂。弥撒进行到一半，你在众人毫无准备的情况下，把皇冠戴在了查理曼头上，宣布他为「罗马人的皇帝」。',
        '借口是现成的：君士坦丁堡如今坐龙椅的是个女皇——她弄瞎了作为皇帝的亲儿子、自己登基——正好借此宣布她「不再是西边的皇帝」。',
        '你亲手制造了一个能保护你的皇帝。加冕完成了。',
        '现在的问题是：仪式的最后一拍——你向不向查理曼行礼？'
      ],
      setupShort: '圣诞夜，你把皇冠戴在了查理曼头上。现在，要不要向他行礼？',
      options: [
        { t: '俯身向他行礼', isHistory: true,
          fb: '你俯身行礼。后世教皇们咬定：看，是教皇把皇冠戴上他的头——说明教权高于皇权。' },
        { t: '当场宣布教权永远高于皇权', isHistory: false,
          fb: '话说得太满，是要靠实力兑现的。此刻站在你面前的查理曼，是罗马帝国崩溃以来西欧最强大的君主——他的权威来自战无不胜的军队，不是来自你的祝圣。当场翻脸的代价，可能是「保护人」变成「主人」。' },
        { t: '让查理曼自己戴上皇冠', isHistory: false,
          fb: '那是 1804 年拿破仑干的事，意义是「我的权威不来自教会」。若你现在就让查理曼自己戴冠，等于亲手废掉教会在加冕这件事上的全部话语权——教皇手里最有分量的那张牌，还没打出去就作废了。' }
      ],
      historyText: '教皇行礼了。此后千年，双方为「到底谁高于谁」争执不休：教皇说，冠是我戴的；皇帝说，可你向我行了礼。皇帝们还有一条硬道理：查理曼的强大是他自己打出来的，并不依赖教皇的助力。',
      quote: { en: 'Popes emphasised that it was the pope who put the crown on Charlemagne\u2019s head… But after the pope put the crown on Charlemagne\u2019s head, he bowed to Charlemagne.',
               zh: '教皇们强调：是教皇把皇冠戴上了查理曼的头……但教皇加冕之后，向查理曼行了个礼。' },
      point: '加冕悖论：一场仪式，两种读法，谁也没说服谁——这正是此后千年拉锯的第一格。',
      truth: '后来：查理曼死后不到三十年，帝国就一分为三；而「教皇加冕才算法统」这套规矩，西欧却沿用了整整一千年。',
      delta: { church: 3, state: 3, local: 0 },
      source: [
        'In the year 800 Charlemagne visited Rome and attended mass on Christmas Day in the cathedral. After the mass, and seemingly with no prior warning, the pope placed a crown on Charlemagne\u2019s head and declared him to be Roman emperor. He made his own emperor in order to have a power that would protect him.',
        'There was later great dispute between popes and emperors about what had happened in the cathedral on Christmas Day 800. Popes emphasised that it was the pope who put the crown on Charlemagne\u2019s head, which indicated that the pope was superior to the emperor. But after the pope put the crown on Charlemagne\u2019s head, he bowed to Charlemagne. Emperors said that the pope was thus acknowledging the superior power of the emperor.'
      ]
    },

    p3: {
      type: 'scene', lane: 'church', year: '1073 年', where: '罗马 · 教廷',
      title: '主教是谁的？',
      img: null, decoIcon: '⚡',
      audio: 'audio/p3.mp3',
      setup: [
        '时间来到 11 世纪。你是教皇格里高利七世（Gregory VII）。',
        '让你忍无可忍的是：各地的国王与贵族都在自己任命领地上的主教。主教掌控着大片土地与无数职位——在德意志，近一半土地握在教会手里。',
        '想想丰田公司：如果澳洲分公司的 CEO 由澳洲总理任命、厂长由市长任命，那东京总部就名存实亡。中世纪的教会正是如此，被国王和地方豪强蛀得千疮百孔。',
        '你宣布：今后主教只许由罗马任命。德意志皇帝亨利四世公开顶了回来：「主教的任命，朕来继续。」你怎么办？'
      ],
      setupShort: '国王们自己任命主教，教会被一点点掏空。你宣布主教只由罗马任命——皇帝顶了回来。',
      options: [
        { t: '绝罚——把他开除出教籍', isHistory: true,
          fb: '绝罚的威力不在于诅咒，而在于政治宣言：教皇借此昭告皇帝的臣民——你们可以不再服从他。' },
        { t: '出兵讨伐', isHistory: false,
          fb: '你确实是个有领地、能收税、可以雇兵的君主——但此刻你的军力远不足以与皇帝正面开战。正面战争打不赢，反而会让「教会高于世俗」的宣言沦为笑柄。' },
        { t: '让步算了', isHistory: false,
          fb: '主教们继续由各地国王任命，教会继续被架空。你任内最响亮的改革宣言不了了之，罗马的权威还得等下一位强硬的教皇来重建。' }
      ],
      historyText: '格里高利七世绝罚了亨利四世：皇帝被逐出教会，不得参加弥撒、领受任何圣礼。更致命的是，教皇借此告诉皇帝领地内的臣民：他们不必再服从皇帝。本就想挣脱控制的德国诸侯，乐见其成。',
      quote: { en: 'Having excommunicated a king, they told the people in his territories that they did not have to obey him.',
               zh: '绝罚一位国王之后，教皇便昭告其领地的臣民：你们可以不再服从他。' },
      point: '绝罚是一把软刀子：它不杀皇帝本人，杀的是「臣民必须服从他」这条纽带。',
      truth: '后来：这场争斗拖了近半个世纪，1122 年才以《沃尔姆斯宗教协定》收场——皇帝提名人选，教皇授予权杖。谁也没赢，谁也没输。',
      delta: { church: 6, state: -6, local: 3 },
      source: [
        'The Catholic church was the great international institution of the Middle Ages, but it was always being undermined because kings and local powerbrokers wanted to control who became bishops in their own territory.',
        'When we say the church was an international body, think of it in this way. Toyota, which is run from Tokyo, is in the business of making motor cars. Say, in Australia, its chief executive was appointed by the prime minister and the plant manager was appointed by the local mayor\u2026 This is what the medieval church was like: it had been undermined, white-anted and plundered by local powerbrokers and the monarchs of Europe.',
        'The pope who wanted to upset all those cosy arrangements and bring authority more firmly back to Rome was Gregory VII, who became pope in 1073. He declared that he would in future appoint bishops. The emperor Henry IV replied that he would continue to do so. The emperor stood firm, so the pope excommunicated him; that is, he expelled him from the church.'
      ]
    },

    p4: {
      type: 'scene', lane: 'church', year: '1077 年 1 月', where: '意大利北部 · 卡诺莎城堡',
      title: '卡诺莎的雪',
      img: null, decoIcon: '❄',
      audio: 'audio/p4.mp3',
      setup: [
        '被绝罚的亨利四世，翻越了封冻的阿尔卑斯山，出现在卡诺莎城堡门外。',
        '他脱下王袍，只穿粗麻忏悔服，赤着脚在雪地里站了三天，只求你见他一面。',
        '城堡里很暖和。你的顾问们意见不一：门外那个人，既是忤逆你的皇帝，又是一个求你宽恕的忏悔者。',
        '开不开门？'
      ],
      setupShort: '被绝罚的亨利四世赤脚站在雪地里三天，只求你开门见他一面。',
      options: [
        { t: '开门赦免', isHistory: true,
          fb: '你最终还是开了门。亨利跪在你面前请求宽恕，你解除了绝罚——德国诸侯为此大为恼火。' },
        { t: '让他在雪里冻着', isHistory: false,
          fb: '教义要求你宽恕真诚的忏悔者。把一个赤足雪中站了三天的忏悔者拒之门外，「冷酷教皇」的名声将重创教会的道德威望——诸侯们反而会说：教皇怕的不是神，是权。' }
      ],
      historyText: '教皇熬了三天，终于心软开门。亨利四世跪地求恕，绝罚解除。但亨利并未真正放弃立场，争端又拖了多年，最终以妥协收场：主教由皇帝提名人选，但象征职权的手杖与法衣，必须由教皇授予。',
      quote: { en: 'It was very hard for a Christian pope to refuse to grant forgiveness.',
               zh: '一位基督徒教皇，很难拒绝宽恕一个前来忏悔的人。' },
      point: '卡诺莎：教皇赢了面子，皇帝保住了里子——面子与里子，正是这场千年双人舞的舞步。',
      truth: '后来：亨利四世稳住王位立刻翻脸，带兵杀回意大利，另立了一位「对立教皇」；格里高利七世死在流亡途中，再没回过罗马。',
      delta: { church: 4, state: -4, local: 0 },
      source: [
        'Henry IV then crossed the Alps in winter and found the pope in a castle at Canossa in northern Italy. He waited outside for two or three days in the snow, begging the pope to see him. He had cast off all his royal regalia; he was dressed in humble clothes.',
        'Finally the pope relented and the emperor knelt before him and asked for forgiveness. The pope lifted the excommunication, to the great annoyance of the German princes. This was very humbling for Henry, of course, but it was also quite a clever ploy. It was very hard for a Christian pope to refuse to grant forgiveness.',
        'The emperor did not completely abandon his position. The dispute dragged on for years and finally there was a compromise. The emperor was allowed to have some influence in choosing bishops but it was to be the pope who actually gave them their staff of office and their official robes.'
      ]
    },

    p5: {
      type: 'scene', lane: 'church', year: '文艺复兴时期', where: '罗马 · 城墙',
      title: '教皇的城墙',
      img: 'images/statue-of-saint-peter-st-peters-basilica-rome.jpg',
      imgCaption: '圣彼得铜像：中世纪的教皇就该像君主一样气派',
      audio: 'audio/p5.mp3',
      setup: [
        '你是文艺复兴时期的教皇。此刻你正站在罗马城墙上督战——没错，教皇也是君主：有领地、有税收、有军队，也会亲自打仗。',
        '敌军正在攻城。你身边的金匠兼炮手切利尼（Cellini）刚打出一发神炮：炮弹击中远处一位西班牙军官的佩剑，把剑顶了回去，将他拦腰斩成两半。',
        '切利尼自己吓坏了——那人死前连准备都没来得及。他跪到你面前，请求赦罪。',
        '你怎么说？'
      ],
      setupShort: '敌军正在攻城。你的炮手一炮把人拦腰打断，跪下来求你赦罪。',
      options: [
        { t: '「我赦免你；你为教会效命所杀的一切人，我都赦免。」', isHistory: true,
          fb: '你开怀大笑，说出了那句被切利尼郑重写进自传的话。教皇国里，教皇既是基督的代表，也是一位在城墙上督战的君主——这两个身份在教会鼎盛的年代毫不违和。' },
        { t: '拒绝赦免，命切利尼赎罪', isHistory: false,
          fb: '战事正酣，你最得力的炮手却背上了「渎神杀孽」的包袱，甚至可能被要求停手赎罪。在中世纪的战争伦理里，君主的宽恕也是一种统治工具——此刻的严厉，反而显得你不像个「国君」，倒像个纯粹的神职人员。' }
      ],
      historyText: '教皇大喜过望：「Yes, I forgive you; I forgive you all the homicides you commit in the service of the church.」教皇从来不只是精神领袖——他有国家、军队与城墙。',
      quote: { en: '\u201cYes, I forgive you; I forgive you all the homicides you commit in the service of the church.\u201d — Cellini, Autobiography',
               zh: '「我赦免你；你为教会效命所杀的一切人，我都赦免。」——切利尼《自传》' },
      point: '所谓「上帝的事归上帝」，在中世纪首先是一桩世俗的权力事业。',
      truth: '后来：切利尼效力的那位教皇，正是 1527 年「罗马之劫」里被困圣天使堡的克雷芒七世——皇帝的军队攻进罗马大掠八天，教皇的城墙到底没守住。',
      delta: { church: 0, state: 0, local: 0 },
      source: [
        'The pope as warrior is wonderfully described by the Renaissance artist Cellini in his autobiography. Like many Renaissance men, Cellini was multi-talented, not only a superb goldsmith but also good with weaponry. When an enemy was attacking Rome, he was on the battlements with the pope, giving instructions about the firing of the cannon.',
        'Cellini gave the order for the cannon to fire. It was a freakish shot; the ball hit the officer\u2019s sword, which it pushed back, cutting him in half. Cellini was very distressed at this: killing a man before he had time to prepare himself for death. He knelt before the pope to ask for absolution. But the pope was delighted at his deed. He said, \u2018Yes, I forgive you; I forgive you all the homicides you commit in the service of the church.\u2019'
      ]
    },

    /* ---------------- 教皇线对照卡 ---------------- */

    i_byz: {
      type: 'interlude', lane: 'church', year: '同一时代的东方', title: '对照卡 · 君士坦丁堡的一手遮天',
      img: 'images/arch-of-constantine-rome.jpg',
      imgCaption: '君士坦丁的凯旋门：皇帝的权力纪念碑（罗马）',
      audio: 'audio/i_byz.mp3',
      body: [
        '就在教皇和皇帝为「谁高于谁」吵得不可开交时，看看东边：拜占庭帝国里，皇帝不仅管国事，也管教会。',
        '牧首（Patriarch）由皇帝任命、对皇帝负责。一位皇帝说了算 vs 两位大人吵架——这就是东西欧的分野。',
        '西欧的特别之处，不在于谁赢了，而在于「永远吵不出个赢家」——这反倒让任何一方都无法一手遮天。'
      ],
      quote: { en: 'In the west the two authorities of church and state were separate and had independent authority.',
               zh: '在西方，教会与国家这两种权威是分离的，各自拥有独立的权力。' },
      source: [
        'The significance of the pope\u2013emperor struggle is that the pope never claimed to be emperor and the emperor never claimed to be pope. They both acknowledged that the other should exist; they were arguing about their relative powers. This is a very important characteristic of western Europe, which distinguishes it from the Byzantine Empire in the east.',
        'The practice in Constantinople was that the emperor was not only the ruler of the civil affairs of his empire but also of the church. There was a patriarch, but the patriarch was appointed by the emperor and under his control. In the west the two authorities of church and state were separate and had independent authority. This was a continuing bar to any universal claims by kings.'
      ]
    },

    i_boss: {
      type: 'interlude', lane: 'church', year: '千年拉锯的总结', title: '对照卡 · 老板与工人',
      img: null, decoIcon: '⚖',
      audio: 'audio/i_boss.mp3',
      body: [
        '教皇与皇帝斗了几个世纪，谁也没能彻底吃掉谁。',
        '这场斗争像极了老板与工人的拉锯：罢工、威胁解雇，有时斗得你死我活——但双方都心知肚明：谈判终会有结果，老板和工人都还得继续存在。',
        '教皇从不自称皇帝，皇帝从不自称教皇。他们争的从来只是「权力的边界」在哪里。'
      ],
      quote: { en: 'Their dispute was like conflict between bosses and workers… there will always be a settlement and that there will always be bosses and workers.',
               zh: '他们的争斗像老板与工人的冲突……总会有和解，也总会有老板和工人。' },
      source: [
        'Pope and emperor fought each other to a standstill. They never had a complete victory, one or the other. Their dispute was like conflict between bosses and workers. There are strikes and threats of sacking, often intense and bitter, but you know there will always be a settlement and that there will always be bosses and workers.'
      ]
    },

    /* ---------------- 皇帝线 ---------------- */

    e1: {
      type: 'scene', lane: 'state', year: '814 年前夕', where: '亚琛 · 王宫',
      title: '庞大的家业',
      img: null, decoIcon: '📜',
      audio: 'audio/e1.mp3',
      setup: [
        '你是查理曼（Charlemagne）。你把法兰克王国扩张成了罗马帝国崩溃以来西欧最大的国家：疆域跨过比利牛斯山进入西班牙，南抵意大利中部，东至奥地利。',
        '但这是个奇怪的帝国：没有官僚系统，道路稀烂，几乎没有像样的城市。全靠你派出的伯爵与公爵压着各地豪强——他们服你，只因为你能打。',
        '帝国系于你一身，而不系于任何制度。你驾崩之后，这份家业怎么分？'
      ],
      options: [
        { t: '按日耳曼习俗，分给子孙', isHistory: true,
          fb: '你按祖制把帝国分给儿子们——不巧只有一个儿子活了下来，真正的分裂发生在孙辈：三个孙子打了一场内战，帝国一分为三。' },
        { t: '长子独承，保持帝国完整', isHistory: false,
          fb: '好想法，但你没有执行它的机器。帝国本就系于你个人的威望；你一死，其他继承人各有兵马、各有支持者，谁也不服谁。没有官僚与制度做「长子」的爪牙，完整只是纸面愿望。' }
      ],
      historyText: '查理曼按日耳曼习俗把帝国分给后代；分裂在孙辈完成：三个孙子混战，帝国三分。西部后来演化成法国，东部成为德国的雏形。更糟的是，在孙辈混战与北欧海盗入侵中，查理曼的控制术失传——伯爵公爵蜕变为只认自己的地方豪强，欧洲退回了罗马崩溃后的散装状态。',
      quote: { en: 'Charlemagne decided in the customary German way that after his death it should be subdivided among his sons… The grandsons fought among themselves, and Charlemagne\u2019s empire fell into three parts.',
               zh: '查理曼按日耳曼人的惯例决定：死后帝国由诸子分领……孙辈们彼此混战，查理曼的帝国一分为三。' },
      point: '帝国靠一个人，而不是一套制度——人亡，政息。',
      truth: '后来：843 年《凡尔登条约》，三个孙子把帝国切成三块——西边长成法国，东边成了德国的雏形。这份分割线，一直画到今天的欧洲地图上。',
      delta: { church: 0, state: -6, local: 6 },
      source: [
        'Charlemagne faced huge handicaps. He had no bureaucracy; communications were poor; there was little trade; towns were tiny; there was a great amount of chaos. In all of this, his empire was most unlike the Roman. His mode of government was to appoint counts and dukes throughout his realm\u2026 There was no institutional base to this empire; its government depended on the personal power of its leader.',
        'After building up this huge empire with such great effort, Charlemagne decided in the customary German way that after his death it should be subdivided among his sons. But only one son of his survived, so the division of the empire occurred at the next generation, among his grandchildren. The grandsons fought among themselves and Charlemagne\u2019s empire fell into three parts. The western part eventually became modern-day France; the eastern part became the basis of Germany.'
      ]
    },

    e2: {
      type: 'scene', lane: 'state', year: '约 790 年', where: '亚琛 · 书房',
      title: '你晚年最大的心事',
      img: null, decoIcon: '✒',
      audio: 'audio/e2.mp3',
      setup: [
        '你还是查理曼。你能读拉丁文，但写字始终不得要领——到死床边都放着块练字的蜡板。',
        '你清楚地记得圣奥古斯丁在《上帝之城》里的话：「如果没有正义，王国算什么？不过是大型劫掠团伙。」你的日耳曼祖先正是靠劫掠起家的；你不想让帝国只是一台换了招牌的劫掠机器。',
        '你还隐隐担心：罗马那些伟大的书——西塞罗、维吉尔——正在虫蛀与遗忘中消失。',
        '你手里有一笔钱，花在哪？'
      ],
      options: [
        { t: '召集学者，找出并抄写古典手稿', isHistory: true,
          fb: '你资助学者四处搜罗古典手稿并重新抄写。此后千年，拉丁经典几乎全靠这批抄本传世——没有你，古典遗产将只剩下可怜的残片。' },
        { t: '修一座更豪华的宫殿', isHistory: false,
          fb: '宫殿能震慑使节，却留不住任何东西。你的子孙守不住它，战火更不会怜惜它——亚琛的宫殿今天只剩一座小教堂。石头会塌，抄本却会在千年后重新点亮欧洲。' },
        { t: '再征十万人扩军', isHistory: false,
          fb: '帝国的软肋从来不是兵不够，而是没有制度。十万大军只会多十万个需要供养的胃口，加速掏空这个连税收体系都没有的草台帝国。' }
      ],
      historyText: '查理曼大力赞助学问，命学者搜寻并抄写古代手稿。现存拉丁著作的绝大部分都抄成于他的时代。他对信奉异教的萨克森人残酷无情，可他们一旦皈依、成为治下之民，他便要求官吏公正待之——他要的是文明，不是更大的劫掠团伙。',
      quote: { en: 'Nearly all the Latin works that have survived were copied in Charlemagne\u2019s time. Without him the classical inheritance would have been very slim.',
               zh: '流传至今的拉丁著作，几乎全都抄成于查理曼的时代。没有他，古典遗产将所剩无几。' },
      point: '一位识字艰难的蛮族国王，成了古典文明的「人肉备份」——欧洲文明的存续点。',
      truth: '后来：亚琛的宫殿今天只剩一座小教堂，而他命人抄写的抄本，几乎就是拉丁古典著作存世版本的全部。石头会塌，抄本传了千年。',
      delta: { church: 3, state: 3, local: 0 },
      source: [
        'Saint Augustine, who lived in the last days of the Roman Empire in the west, wrote in his City of God: \u2018If there is no justice, what are kingdoms but great robberies?\u2019 Charlemagne knew of this work and understood this point; Saint Augustine was one of his favourite authors.',
        'Charlemagne, though poorly educated himself, encouraged education and became the patron of learned men, who were ordered to find and copy the ancient manuscripts. Nearly all the Latin works that have survived were copied in Charlemagne\u2019s time. Without him the classical inheritance would have been very slim.'
      ]
    },

    e3: {
      type: 'scene', lane: 'state', year: '962 年', where: '德意志 · 王帐',
      title: '教皇的邀请函',
      img: null, decoIcon: '✉',
      audio: 'audio/e3.mp3',
      setup: [
        '你是奥托一世（Otto I），德意志地区最强的新锐国王。',
        '教皇的处境回到了两百年前：老靠山查理曼的帝国早已散架，伦巴第与罗马各路诸侯虎视眈眈。他又需要一位保护人了——而他选中了你。',
        '教皇请你南下护驾，并为你加冕「罗马皇帝」。接不接这趟远门？'
      ],
      options: [
        { t: '南下接受加冕', isHistory: true,
          fb: '从此「德意志国王」与「罗马皇帝」绑在了一起：历任德王经教皇加冕，即为（后来的）神圣罗马皇帝。你获得了基督世界最高的名分——也把与教皇数百年的缠斗一并签收。' },
        { t: '拒绝，守住德意志就好', isHistory: false,
          fb: '名分这东西，你不拿，别人会拿。教皇转手就能加冕别的强势君主，把「罗马皇帝」的冠冕连同道义大旗一起送人。你省了一次远征，代价是让竞争者凭空多出一顶皇冠。' }
      ],
      historyText: '962 年，教皇为奥托一世加冕为罗马皇帝。此后谁成为德意志国王，经教皇加冕便也是神圣罗马皇帝。德意志国王是欧洲唯一由选举产生的王位——本意是确保选出能打的领袖，后来演化为七大选帝侯制度：皇帝为了当选，有时反而要向选帝侯让权。',
      quote: { en: 'In 962 a new, strong king, Otto the First, emerged… The pope crowned him as Roman emperor.',
               zh: '962 年，一位强有力的新国王奥托一世崛起……教皇为他加冕为罗马皇帝。' },
      point: '皇帝的名分来自教皇——从此教皇与皇帝，谁也离不开谁，谁也放不过谁。',
      truth: '后来：德意志国王成了欧洲唯一靠选举产生的王位；七大选帝侯拿选票做买卖，皇帝为了当选，反而一次次把权力让出去。',
      delta: { church: 3, state: 6, local: 0 },
      source: [
        'With the disappearance of Charlemagne\u2019s empire, the pope had lost his strongman to protect him. For a while he made do with whatever local princes he could find and crowned them emperor. Then in 962 a new, strong king, Otto the First, emerged in the German part of Charlemagne\u2019s old empire. The pope crowned him as Roman emperor and thereafter whoever became the king of Germany was, after being crowned by the pope, also Roman emperor and later Holy Roman emperor.',
        'The German kings were the only kings in Europe who were elected\u2026 eventually there were just seven who bore the name \u2018elector\u2019. The German king/emperor struggled like kings everywhere to exert his power over local strongmen, some of whom were his electors.'
      ]
    },

    e4: {
      type: 'scene', lane: 'state', year: '1077 年 1 月', where: '德意志 · 内堡',
      title: '被绝罚的皇帝',
      img: null, decoIcon: '⚔',
      audio: 'audio/e4.mp3',
      setup: [
        '你是亨利四世。三天前，教皇格里高利七世把你绝罚出了教会。',
        '坏消息正以惊人的速度变成现实：你的臣民被告知「可以不服从你」，德意志的公爵们已经开始串联，准备另立新王。',
        '现在是隆冬，翻越阿尔卑斯山的路比刀还险。但教皇此刻就在山那边——意大利北部的卡诺莎城堡。',
        '你怎么做？'
      ],
      options: [
        { t: '翻雪山，去卡诺莎向教皇求恕', isHistory: true,
          fb: '你脱下王袍、换上忏悔服、赤着脚，在雪地里站了三天求教皇开门。这当然屈辱至极——但你的王位保住了，诸侯失去了「抗旨」的借口。面子给了教皇，里子你拿了回来。' },
        { t: '硬扛到底，绝不低头', isHistory: false,
          fb: '你手里还有军队，凭什么低头？可「被绝罚的国王」这顶帽子会让诸侯的反叛变成「正义」。另立新王只是时间问题——等你在内战中出局，雪地里跪着求饶的，可能就是你的儿子。' }
      ],
      historyText: '亨利四世冬天翻越阿尔卑斯山，在卡诺莎城堡外的雪地里守了两三天，恳求教皇见他。教皇让步了：亨利跪地求恕，绝罚解除，德国诸侯大失所望。',
      quote: { en: 'He waited outside for two or three days in the snow, begging the pope to see him.',
               zh: '他在雪地里等了两三天，恳求教皇见他一面。' },
      point: '卡诺莎的另一面：跪下的皇帝未必输——能屈能伸，也是一种统治的艺术。',
      truth: '后来：跪下的亨利四世翻脸后攻入罗马，另立对立教皇，格里高利七世客死异乡。雪地里那三天的屈辱，一分钱也没白付。',
      delta: { church: 4, state: -4, local: 0 },
      source: [
        'In this case, German dukes and princes, who always wanted to escape from the emperor\u2019s control, were delighted to find that he was excommunicated and could be ignored.',
        'Henry IV then crossed the Alps in winter and found the pope in a castle at Canossa in northern Italy. He waited outside for two or three days in the snow, begging the pope to see him. He had cast off all his royal regalia; he was dressed in humble clothes. Finally the pope relented and the emperor knelt before him and asked for forgiveness.'
      ]
    },

    e5: {
      type: 'scene', lane: 'state', year: '1804 年 12 月 2 日', where: '巴黎 · 圣母院',
      title: '谁为皇帝戴冠？',
      img: 'images/arc-de-triomphe-paris.jpg',
      imgCaption: '巴黎凯旋门：1806 年，拿破仑在权力顶峰下令建造',
      audio: 'audio/e5.mp3',
      setup: [
        '你是拿破仑，法兰西第一帝国的皇帝。上一场加冕，距今已经整整一千年。',
        '教皇庇护七世就站在你身边：他刚刚为你和皇后约瑟芬涂了圣油，祝圣了权球、正义之手、佩剑与权杖。',
        '最后一步：那顶皇冠——特意复刻了当年查理曼戴的轻冠——该由谁戴上你的头？'
      ],
      options: [
        { t: '自己拿起皇冠，戴上头', isHistory: true,
          fb: '你转身自己拿起皇冠，戴在了头上。千年加冕之争在这一刻迎来终局：皇帝的权威不再来自教会，而来自他自己（和你打下的江山）。' },
        { t: '请身边的教皇为你戴上', isHistory: false,
          fb: '教皇若为你戴冠，你就回到了查理曼的老局：你的权威将打上「教会授予」的烙印——而教皇随时可以拿这层关系做文章。对一个靠大革命起家、自视为启蒙之子的统治者，这是自我矮化。' }
      ],
      historyText: '教皇在场，但拿破仑自己把皇冠戴上了头。那是一顶复刻查理曼之冠的轻冠，敞开如罗马人授予胜利者的桂冠。两年后的 1806 年，他干脆解散了神圣罗马帝国，把德意志诸邦重组为「莱茵邦联」。',
      quote: { en: 'But Napoleon himself put the crown on his head. It was a replica of the crown the pope had placed on Charlemagne… What did not survive was the Holy Roman Empire.',
               zh: '但拿破仑自己把皇冠戴上了头。那是一顶复刻教皇为查理曼所戴之冠……没能幸存下来的，是神圣罗马帝国。' },
      point: '教会加持的皇权，终结于一个不信神的皇帝——历史的幽默，莫过于此。',
      truth: '后来：仅仅两年后的 1806 年，拿破仑干脆解散了神圣罗马帝国——伏尔泰口中那块「既不神圣、也不罗马、更非帝国」的千年招牌，就此摘下。',
      delta: { church: -3, state: 6, local: 0 },
      source: [
        'The pope was present in Notre Dame cathedral when Napoleon was crowned as emperor. He anointed Napoleon and his empress, Josephine; he blessed the imperial regalia: orb, hand of justice, sword and sceptre. But Napoleon himself put the crown on his head. It was a replica of the crown the pope had placed on Charlemagne, a light, open crown, like the laurel wreath that Romans gave to their victors.',
        'What did not survive was the Holy Roman Empire. Napoleon abolished it in 1806 when he regrouped several small states in Germany into the Confederation of the Rhine.'
      ]
    },

    /* ---------------- 皇帝线对照卡 ---------------- */

    i_voltaire: {
      type: 'interlude', lane: 'state', year: '1648 → 1806', title: '冷知识 · 伏尔泰的吐槽',
      img: 'images/map-western-and-central-europe-1648.jpg',
      imgCaption: '1648 年的中西欧：一盘散沙的「 patchwork 」',
      audio: 'audio/i_voltaire.mp3',
      body: [
        '说到「神圣罗马帝国」这块千年老招牌，启蒙运动的精神导师伏尔泰有一句流传两百年的毒舌：它「既不神圣，也不罗马，更非帝国」。',
        '话虽刻薄，却大体属实：到了后期，帝国只剩一个名头，靠哈布斯堡家族自家的威风飘着。',
        '1648 年的中欧地图就是实况：英法西已是统一国家；而德意志到意大利，密密麻麻全是小邦、主教领地与自由市——教皇与皇帝互斗千年，斗出来的正是这幅散装图。'
      ],
      quote: { en: 'Voltaire mocked the Holy Roman Empire as neither holy, nor Roman, nor an empire.',
               zh: '伏尔泰嘲讽神圣罗马帝国：既不神圣，也不罗马，更非帝国。' },
      source: [
        'Though in itself the position of emperor carried little power, the Holy Roman Empire survived. From the late Middle Ages one family always provided the person who was elected Holy Roman emperor. This was the Hapsburgs, one of the great ruling dynasties of Europe.',
        'Voltaire, the guru of the Enlightenment, mocked the Holy Roman Empire as neither holy, nor Roman, nor an empire, which was true enough, but its survival was always somewhat magical, carrying a name and an idea in a very odd form. It took the head of a new empire to abolish this strange survival of an old one.'
      ]
    },

    /* ---------------- 地方线 ---------------- */

    f1: {
      type: 'scene', lane: 'local', year: '1521 年', where: '萨克森 · 瓦尔特堡附近',
      title: '皇帝要抓的人',
      img: null, decoIcon: '🏰',
      audio: 'audio/f1.mp3',
      setup: [
        '你是萨克森选帝侯「智者」腓特烈（Frederick the Wise）。',
        '1521 年，皇帝查理五世已经宣布：那个维滕贝格大学的神学教授马丁·路德是异端，任何人不得庇护，应当捉拿归案。路德刚在帝国议会上拒绝收回他的学说。',
        '你是德意志最有权势的诸侯之一，你的领地就在路德归途的必经之路上——皇帝的诏令就悬在你头顶。',
        '你的骑兵，就在附近。'
      ],
      options: [
        { t: '半路「劫走」路德，藏进你的城堡', isHistory: true,
          fb: '你的人马在半路把路德「劫走」——皇帝恰好无法指责你明着抗旨。路德藏在瓦尔特堡里闲得发慌，干了一件改变世界的事：把《圣经》译成德语。' },
        { t: '奉旨抓人', isHistory: false,
          fb: '路德一旦落网，宗教改革很可能胎死腹中。而你失去的，是一个摆脱皇帝与教会、自行其是的千载良机——选帝侯的真正实力，就在于皇帝的手伸不进你的领地。' }
      ],
      historyText: '皇帝的诏令立刻被萨克森选帝侯腓特烈挫败——他「劫走」路德并藏进自己的城堡。路德正是在那里开始把《圣经》译成德语。腓特烈与其他支持路德的诸侯看到了自己掌管教会及其土地的好处：以教皇和皇帝的损失为代价扩张权力——路德宗由此诞生。',
      quote: { en: 'His orders were immediately frustrated by Frederick the Elector of Saxony, who seized Luther and took him into hiding.',
               zh: '皇帝的诏令立刻被萨克森选帝侯腓特烈挫败——他「劫走」路德，把他藏了起来。' },
      point: '权力分散的德意志，意外成了新教生根的土壤——地方自治第一次改写了欧洲的信仰版图。',
      truth: '后来：路德躲在你的城堡里把《圣经》译成德语，诸侯顺势接管教会与土地——德意志在信仰上先一步分裂了，而这场分裂再没能弥合。',
      delta: { church: -3, state: -3, local: 6 },
      source: [
        'Luther\u2019s Reformation took root and flourished in Germany because secular power was dispersed. It was the duty of the emperor to put down Luther\u2019s heresy and rather belatedly he attempted to do so. When Luther refused to recant, the emperor declared that he was a heretic, that no-one should support him and that he should be arrested.',
        'His orders were immediately frustrated by Frederick the Elector of Saxony, who seized Luther and took him into hiding. It was while Luther was hidden in his castle that he began to translate the Bible into German. Frederick and the other German princes who supported Luther saw the advantage of putting themselves in charge of the church and its lands\u2026 and so Lutheranism was born.'
      ]
    },

    f2: {
      type: 'scene', lane: 'local', year: '文艺复兴时期', where: '意大利北部 · 你的城邦',
      title: '两大巨头之间',
      img: 'images/map-states-of-italy-renaissance-c1494.jpg',
      imgCaption: '文艺复兴时期的意大利（c. 1494）：城邦的天下',
      audio: 'audio/f2.mp3',
      setup: [
        '你是文艺复兴时期意大利北部的一位城邦君主。',
        '北方城邦是全欧洲最富的地方——贸易、银行、纺织让财富滚滚而来。问题也随之而来：名义上，你的城邦属于「神圣罗马帝国」；精神上，罗马的教皇就在隔壁。',
        '两尊大神都要你站队表态，也都拿你没办法。',
        '你的外交策略是？'
      ],
      options: [
        { t: '骑墙——两边下注，随时倒向划算的一方', isHistory: true,
          fb: '这正是北意城邦的生存智慧：时而联合教皇抗击皇帝，时而与皇帝眉来眼去，谁出价高帮谁。教皇与皇帝斗得两败俱伤，你们在夹缝里富得流油——还腾出手搞出了文艺复兴。' },
        { t: '死心塌地投靠教皇', isHistory: false,
          fb: '你得到了教会的祝福，代价是处处受制于罗马：主教任免、教产、司法权，教皇的手随时可以伸进你的城。北意的富庶恰恰证明：城邦的活力来自「谁也管不着我」。' },
        { t: '死心塌地投靠皇帝', isHistory: false,
          fb: '皇帝远在天边，除了收税与征兵帮不上什么忙；而教皇就在隔壁。得罪近邻、讨好远亲，是外交上的大忌——城邦时代的意大利，孤注一掷者出局最快。' }
      ],
      historyText: '北意的富庶城邦不喜欢听命于远道伸手的皇帝，时而与教皇结盟对抗皇帝，时而两边下注、哪边划算倒向哪边。教皇与皇帝的长期互斗把中欧拖成一盘散沙，城邦却借此自治自肥——文艺复兴正是在这样的土壤里生长出来的。',
      quote: { en: 'Often they played both sides, switching allegiance as was most advantageous.',
               zh: '他们常常两边下注，随时倒向最有利的一方。' },
      point: '教权皇权互斗的真正赢家，是「谁也管不了」的城邦——文艺复兴的财富与自由，都是权力真空地带结出的果实。',
      truth: '后来：这些城邦在夹缝里富了三百年，用真金白银喂出了文艺复兴；直到 1494 年法国大军翻过阿尔卑斯山，意大利才从主角变成别人的战场。',
      delta: { church: 0, state: 0, local: 6 },
      source: [
        'The towns in northern Italy, which in the Middle Ages became the richest towns in Europe, did not like being subject to the emperor, whose realm extended this far south. Sometimes the towns allied themselves with the pope to fight off the emperor. Often they played both sides, switching allegiance as was most advantageous.',
        'The northern cities of Italy, where the Renaissance began, were small city-states such as had existed in classical Greece. The Italian cities were rivals, militarily and culturally: they went to war with each other and they wanted to outdo each other with the splendour of their art\u2026 These were the places which could conceive and carry out the project of recreating the ancient world.'
      ]
    }
  },

  /* ---------------- 旅程复盘 ---------------- */

  puzzles: {
    pope: {
      title: '旅程复盘 · 教会的千年之路',
      intro: '下面是你这一路亲历的六件大事，顺序已经打乱。按住 ⋮⋮ 拖动（或用右侧箭头微调）排回应有的先后，再点「检查顺序」——错的地方会给提示。',
      items: [
        { label: '伦巴第人威胁罗马', hint: '一切的起点：教皇需要一个保护人。' },
        { label: '教皇求援丕平，获封教皇国', hint: '有了自己的领地，教会才有独立。' },
        { label: '教皇为查理曼加冕', hint: '教皇亲手制造了一个皇帝——也制造了千年的公案。' },
        { label: '格里高利宣布：主教只许罗马任命', hint: '加冕的旧账未了，任免的新争又起。' },
        { label: '亨利四世雪地求恕 · 卡诺莎', hint: '绝罚亮出了獠牙，皇帝亮出了膝盖。' },
        { label: '妥协：皇帝提名，教皇授权', hint: '斗争拖了多年，最终各让一步。' }
      ],
      // 简易线：不做排序，只按时间顺序回顾五步
      easy: {
        title: '旅程复盘 · 你走过的五步',
        intro: '这一路的五件事，已经按时间排好了。看完就去看结算。',
        items: [
          '伦巴第人威胁罗马，教皇没有军队',
          '教皇求援丕平，拿到罗马周边的领土',
          '教皇为查理曼加冕——也埋下千年公案',
          '格里高利七世宣布主教只由罗马任命，亨利四世被绝罚',
          '卡诺莎的雪：皇帝赤足三日，教皇开了门'
        ]
      }
    },
    emperor: {
      title: '旅程复盘 · 帝国的千年之路',
      intro: '下面是你这一路亲历的六件大事，顺序已经打乱。按住 ⋮⋮ 拖动（或用右侧箭头微调）排回应有的先后，再点「检查顺序」——错的地方会给提示。',
      items: [
        { label: '查理曼帝国系于个人威望', hint: '没有制度的帝国，全系于一人。' },
        { label: '帝国按日耳曼习俗分给子孙', hint: '人亡政息的第一步。' },
        { label: '帝国一分为三：法国与德国的雏形', hint: '孙辈混战，欧洲散装。' },
        { label: '奥托被教皇加冕为罗马皇帝', hint: '帝位借教皇之手还魂——从此绑定。' },
        { label: '亨利四世卡诺莎雪地求恕', hint: '皇帝与教皇的缠斗白热化。' },
        { label: '拿破仑自戴皇冠，老帝国落幕', hint: '千年公案，终局在此。' }
      ]
    }
  },

  /* ---------------- 结算 ---------------- */

  endings: {
    pope: {
      headline: '教会的千年之路',
      body: '你走完了教皇的一生：从雪中求存的罗马，到亲手加冕的皇帝，再到卡诺莎城堡外那扇终于打开的门。教权与皇权互斗千年、谁也没吃掉谁——而权力真空里的地方势力，正悄悄上扬。',
      closingQuote: { en: 'The pope never claimed to be emperor and the emperor never claimed to be pope.',
                     zh: '教皇从不自称皇帝，皇帝从不自称教皇。' }
    },
    emperor: {
      headline: '帝冠的千年沉浮',
      body: '你走完了皇帝的一生：从查理曼那台靠个人威望运转的帝国机器，到奥托手中借教皇还魂的帝位，再到拿破仑自己戴上的那顶轻冠。皇权与教权互斗千年、谁也没吃掉谁——而权力真空里的地方势力，正悄悄上扬。',
      closingQuote: { en: 'The pope never claimed to be emperor and the emperor never claimed to be pope.',
                     zh: '教皇从不自称皇帝，皇帝从不自称教皇。' }
    },
    local: {
      headline: '夹缝中的胜利者',
      body: '你走完了地方诸侯的一生：皇帝抓不走你庇护的路德，教皇和皇帝谁都拿你的城邦没办法。两大巨头的千年互斗，斗没了中欧的秩序，斗出了地方的自由——文艺复兴与宗教改革，就生长在这片权力的真空里。',
      closingQuote: { en: 'The result was that the smaller units gained power rather than lost it.',
                     zh: '结果是：小的单元赢得了权力，而非失去。' }
    }
  },

  ranks: [
    { min: 5, title: '你就是历史本人', note: '五个抉择，全部与千年前的当事人不谋而合。' },
    { min: 4, title: '权力的双人舞高手', note: '你的直觉已深谙这场千年的拉锯。' },
    { min: 3, title: '有模有样的君主', note: '大方向对了，细节里藏着历史的狡猾。' },
    { min: 0, title: '直觉学徒', note: '历史欢迎你常来——每换一种走法，都多看清一层。' }
  ],

  gallery: [
    { file: 'images/map-kingdom-of-the-franks-c850.jpg', caption: '法兰克王国 c. 850', note: '丕平与查理曼的基业：西欧最强国家的雏形。' },
    { file: 'images/statue-of-saint-peter-st-peters-basilica-rome.jpg', caption: '圣彼得铜像 · 圣彼得大教堂', note: '渔夫出身的第一代主教，穿上了中世纪教皇的华服——他的一只脚还赤着，没忘记卑微的出身。' },
    { file: 'images/arch-of-constantine-rome.jpg', caption: '君士坦丁凯旋门 · 罗马', note: '纪念 312 年君士坦丁战胜 rival 皇帝——罗马式权力纪念碑的原型。' },
    { file: 'images/map-western-and-central-europe-1648.jpg', caption: '1648 年的中西欧', note: '英法西已成统一国家；德意志到意大利密密麻麻全是小邦——教皇与皇帝互斗千年的遗产。' },
    { file: 'images/map-states-of-italy-renaissance-c1494.jpg', caption: '文艺复兴时期的意大利 c. 1494', note: '城邦的天下：互为对手的富庶城市，竞相用艺术的辉煌压倒彼此。' },
    { file: 'images/chart-roman-empire-continuity.jpg', caption: '罗马帝国的「延续」谱系图', note: '神圣罗马皇帝把自己的世系追溯回查理曼，再经拜占庭皇帝一路接到奥古斯都——「罗马帝国」的名号，一直撑到 1806 年才落幕。' },
    { file: 'images/arc-de-triomphe-paris.jpg', caption: '巴黎凯旋门', note: '1806 年，拿破仑在权力顶峰下令建造——罗马样式的又一轮回。' }
  ],

  /* ---------------- 史书模式（双轨时间线复习） ---------------- */

  historyMode: {
    title: '史书模式',
    intro: '通关后解锁的复习时间线：你亲历过的一切，按年份排开。',
    introFull: '通关后解锁的复习时间线：你亲历过的一切，按年份排开。教权在上、皇权在下、地方居中——看看这千年双人舞的全貌。',
    events: [
      { id: 'p1', year: 751, label: '教皇求援丕平', lane: 'church', detail: '伦巴第威胁罗马，教皇弃东投西；丕平献土，教皇国诞生。' },
      { id: 'p2', year: 800, label: '查理曼加冕', lane: 'church', detail: '圣诞夜，教皇为查理曼加冕「罗马皇帝」——随后行了个礼，千年公案就此埋下。' },
      { id: 'e2', year: 790, label: '抄写古典手稿', lane: 'state', detail: '查理曼命学者搜罗抄写古代手稿，古典文明赖此存世。', approx: true },
      { id: 'e1', year: 814, label: '帝国分给子孙', lane: 'state', detail: '查理曼死后，帝国按日耳曼习俗分裂；孙辈混战后一分为三。' },
      { id: 'e3', year: 962, label: '奥托加冕', lane: 'state', detail: '教皇为奥托一世加冕，德王与帝位从此绑定——选帝侯制度随后成形。' },
      { id: 'p3', year: 1073, label: '主教任免之争', lane: 'church', detail: '格里高利七世宣布主教只许罗马任命，亨利四世针锋相对。' },
      { id: 'p4', year: 1077, label: '卡诺莎之雪', lane: 'church', detail: '亨利四世赤足雪中三日求恕；教皇赦免，诸侯大失所望。', alsoId: 'e4' },
      { id: 'f2', year: 1494, label: '城邦的两边下注', lane: 'local', detail: '北意城邦骑墙于教皇与皇帝之间，文艺复兴在此生长。' },
      { id: 'f1', year: 1521, label: '腓特烈庇护路德', lane: 'local', detail: '选帝侯「劫走」路德；路德宗在权力分散的德意志诞生。', approx: true },
      { id: 'p5', year: 1527, label: '教皇的城墙', lane: 'church', detail: '切利尼一炮成名，教皇在城墙上赦免了他所有的杀孽。', approx: true },
      { id: 'e5', year: 1804, label: '拿破仑自戴皇冠', lane: 'state', detail: '巴黎圣母院，教皇在场，拿破仑自己戴上了复刻查理曼的轻冠。' },
      { id: 'end_hre', year: 1806, label: '神圣罗马帝国落幕', lane: 'state', detail: '拿破仑解散千年老店，重组德意志诸邦为莱茵邦联。' }
    ]
  },

  /* ============================================================
     每个选项独立的三方数值影响（教权 church / 皇权 state / 地方 local）
     原则：历史选项只保证「真实发生过」，不保证数值最优。
     玩家实际生效值 = 这里的数值 × 全局幅度（后台编辑器可调）。
     ============================================================ */
  deltas: {
    /* --- 教皇线 --- */
    p1: [
      { church: -6, state: 3, local: 0,   // 继续指望东罗马：救援落空，宗主权名分还在
        say: '东边皇帝自顾不暇。你没找到靠山，罗马仍悬在伦巴第人刀下——而君士坦丁堡的宗主权，反倒更实在了。' },
      { church: 10, state: 2, local: 0,   // ✔ 找丕平：换来罗马周边领土，丕平只得神圣背书
        say: '丕平出兵、献土：教会第一次有了自己的国土；丕平也拿到了神圣背书。两家各取所需。' },
      { church: -10, state: -3, local: 4, // 与伦巴第谈判：沦为治下主教，伦巴第诸侯坐大
        say: '没有军队的谈判等于投降：教会沦为伦巴第治下的一个主教区，伦巴第诸侯坐大。' }
    ],
    p2: [
      { church: 4, state: 6, local: 0,    // ✔ 俯身行礼：皇帝的实权被坐实，教皇记下这笔账
        say: '冠是你戴的，礼是你行的：教皇拿到了「授冠」的名分，皇帝拿到了「受礼」的实据。两边都记了一笔。' },
      { church: 10, state: -8, local: 0,  // 宣布教权高于皇权：提前引爆千年争论
        say: '话说得太满——查理曼的军队就在门外。名分抢到了，仇也当场结下。' },
      { church: -8, state: 10, local: 0,  // 查理曼自己戴冠：承认皇冠不需要教皇
        say: '皇冠不必教皇动手。教会在加冕这件事上的话语权，当场作废。' }
    ],
    p3: [
      { church: 10, state: -12, local: 4, // ✔ 绝罚：不杀皇帝，杀的是「臣民必须服从他」这条纽带
        say: '开除教籍不只是诅咒：教皇昭告皇帝的臣民「可以不服他」，早有二心的德意志诸侯乐得借势。' },
      { church: -8, state: 8, local: -4,  // 出兵讨伐：把道义优势换成一场必败的战争
        say: '以短击长：教皇的兵打不过皇帝的兵，「教会高于世俗」的宣言变成笑柄。' },
      { church: -12, state: 10, local: 0, // 让步：教会重新变回王权的附属机构
        say: '主教仍由国王任命。教会重新变回王权的附属机构，罗马的权威要等下一位强硬的教皇来重建。' }
    ],
    p4: [
      { church: 8, state: -4, local: -4,  // ✔ 开门赦免：赢面子输里子，诸侯失望
        say: '你赢了面子：皇帝赤足雪中三日，教会的道德权威登顶。可诸侯大失所望，皇帝的王位也保住了。' },
      { church: 6, state: -14, local: 8,  // 让他在雪里冻着：皇权崩塌，但教皇失道义
        say: '拒赦一个赤足忏悔的人，教会丢了道义；皇帝声望崩塌，诸侯趁乱自立。' }
    ],
    p5: [
      { church: 5, state: 0, local: -3,   // ✔ 赦免切利尼：教皇的世俗武力坐实，地方离心
        say: '教皇以君主身份赦免战争中的杀戮：教会的世俗武力被坐实，城邦也看清教皇离不开他们。' },
      { church: 1, state: 0, local: 3,    // 命他赎罪：守住道义，失去一个能打的人，地方看清教皇也需要他们
        say: '道义守住了，最得力的炮手却被捆住手脚；城邦发现，教皇也得看地方的脸色。' }
    ],

    /* --- 皇帝线 --- */
    e1: [
      { church: 0, state: -8, local: 10,  // ✔ 按日耳曼习俗分家：帝国碎成三块，诸侯变土皇帝
        say: '人亡政息：帝国一分为三，伯爵公爵变成只认自己的土皇帝。' },
      { church: -4, state: 10, local: -6, // 长子独承：中央集权，但违背传统、得罪诸侯
        say: '纸面上保住了完整，代价是违背祖制、同时得罪所有其他继承人。' }
    ],
    e2: [
      { church: 4, state: 6, local: 0,    // ✔ 召集学者抄书：文明声望是皇权最耐用的合法性
        say: '文明声望是皇权最耐用的合法性：刀剑会锈，抄本会传千年。' },
      { church: 0, state: 2, local: -4,   // 修豪华宫殿：劳役摊派落在诸侯身上
        say: '宫殿震慑了使节，劳役却摊在诸侯身上——出了人、出了钱，怨气也记下了。' },
      { church: -2, state: 9, local: -10, // 再扩军十万：军权一时最强，军费与征兵直接挖地方根基
        say: '军权一时最强，军费与征兵却直接挖了地方的根基——帝国连税收系统都没有。' }
    ],
    e3: [
      { church: 6, state: 8, local: -4,   // ✔ 南下加冕：德王=皇帝绑定，诸侯被压
        say: '德王与帝位就此绑定：你拿到了基督世界最高的名分，教皇也找回了他要的保护人。' },
      { church: -8, state: -2, local: 6,  // 拒绝加冕：你永远只是「德意志国王」
        say: '这顶冠你不拿，教皇转手就能送给别人。你省了一次远征，却永远只是「德意志国王」。' }
    ],
    e4: [
      { church: 8, state: -4, local: -5,  // ✔ 翻雪山求恕：丢尽面子保住位子
        say: '赤足三日，屈辱至极——但王位保住了，诸侯失去了「抗旨」的借口。' },
      { church: 2, state: -12, local: 10, // 硬扛到底：绝罚生效、诸侯反叛，皇权断崖
        say: '被绝罚的国王，让诸侯的反叛变成「正义」。另立新王只是时间问题。' }
    ],
    e5: [
      { church: -10, state: 12, local: -2,// ✔ 自己戴冠：教会加持的皇权在他手上终结
        say: '皇冠不再需要教会的手：千年的加冕权到此终结，皇权开始自己证明自己。' },
      { church: 10, state: -6, local: 0,  // 请教皇戴冠：回到查理曼的剧本，皇冠仍欠教皇一笔
        say: '回到查理曼的剧本：你的权威打上「教会授予」的烙印，教皇随时能拿这层关系做文章。' }
    ],

    /* --- 地方线 --- */
    f1: [
      { church: -6, state: -8, local: 12, // ✔ 半路劫走路德：诸侯接管教会与土地
        say: '诸侯接管教会与土地：皇帝的手伸不进你的领地，路德宗就在这道权力缝隙里生根。' },
      { church: 6, state: 8, local: -8,   // 奉旨抓人：教会统一保住，皇权伸进你的地盘
        say: '教会统一保住了，代价是皇帝的权力第一次伸进你的地盘。' }
    ],
    f2: [
      { church: -2, state: -2, local: 10, // ✔ 骑墙：两强被消耗，城邦拿到自由与财富
        say: '两边下注、谁出价高帮谁：两大巨头被互相消耗，城邦在夹缝里富得流油。' },
      { church: 8, state: -6, local: -4,  // 投靠教皇：你成了教皇的附庸
        say: '祝福拿到了，主教任免与教产却都归了罗马——你成了教皇的附庸。' },
      { church: -6, state: 8, local: -4,  // 投靠皇帝：你成了皇帝的附庸
        say: '远亲帮不上忙，近邻却记了仇：你成了皇帝的附庸。' }
    ]
  },

  /* ============================================================
     隐藏要素（只在彩蛋浮窗里出现，正常游玩看不到）
     ============================================================ */
  secrets: {
    // 奖牌三击后的说明清单
    list: [
      { t: 'NORMAL · 普通教皇线', d: '通关简易教皇线后，选线页「教皇线」按钮的角落会浮出一个几乎融进背景的 NORMAL。点它，进入完整版教皇线（含两张对照卡）。' },
      { t: '复盘三击', d: '「旅程复盘」的大标题上连点三下，直接跳过排序环节进入结算。' },
      { t: '标题五击', d: '首页的「皇帝与教皇」标题（或天平）连点五下，打开后台数值编辑器；网址后加 ?edit=1 或按 Ctrl+Shift+E 也可以。' },
      { t: '喇叭静音', d: '首页 🔊 按钮点一下即静音，此后所有引文旁的朗读键都会消失；再点一次恢复。' },
      { t: '伏尔泰的吐槽', d: '皇帝线最后一幕（1804 · 拿破仑加冕）连点标题三下，能看到完整的英文原文。' },
      { t: '书中金句', d: '恭喜通关页的论点引文连点三下，随机掉落一句书里的原文。' }
    ],
    voltaire: {
      title: '伏尔泰的完整吐槽',
      en: 'Voltaire, the guru of the Enlightenment, mocked the Holy Roman Empire as neither holy, nor Roman, nor an empire, which was true enough, but its survival was always somewhat magical, carrying a name and an idea in a very odd form. It took the head of a new empire to abolish this strange survival of an old one.',
      zh: '启蒙运动的精神导师伏尔泰嘲讽神圣罗马帝国「既不神圣，也不罗马，更非帝国」——这话大体属实；可它偏偏活了下来，带着一个名字和一套观念，以极其古怪的形式延续着。最终，要由一个新帝国的首领，来废除这个旧帝国的奇怪遗存。'
    },
    quotes: [
      { en: 'In the west the two authorities of church and state were separate and had independent authority.',
        zh: '在西方，教会与国家这两种权威是分离的，各自拥有独立的权力。' },
      { en: 'Their dispute was like conflict between bosses and workers… there will always be a settlement and that there will always be bosses and workers.',
        zh: '他们的争斗像老板与工人的冲突……总会有和解，也总会有老板和工人。' },
      { en: 'Nearly all the Latin works that have survived were copied in Charlemagne\u2019s time. Without him the classical inheritance would have been very slim.',
        zh: '流传至今的拉丁著作，几乎全都抄成于查理曼的时代。没有他，古典遗产将所剩无几。' },
      { en: 'There was no institutional base to this empire; its government depended on the personal power of its leader.',
        zh: '这个帝国没有制度根基，它的统治依赖领袖个人的力量。' },
      { en: 'Often they played both sides, switching allegiance as was most advantageous.',
        zh: '他们常常两边下注，随时倒向最有利的一方。' },
      { en: 'If there is no justice, what are kingdoms but great robberies?',
        zh: '如果没有正义，王国算什么？不过是大型劫掠团伙。' }
    ]
  }
};
