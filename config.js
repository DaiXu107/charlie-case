(function () {
  "use strict";

  // 前端访问门槛：仅用于沉浸式交互，不是真正的安全措施。
  // 任何前端口令都能被查看源码或本地存储绕过。
  window.APP_CONFIG = {
    password: "charlie0724",
    passwordHint: "英文名 + 生日（小写字母，无空格）",
    storageKey: "lianshanhui.charlie.v1",
    resetKeepsPassword: true, // true=重置进度时保留“记住密码”；false=一并清除
    cardWidth: 116,
    cardHeight: Math.round(116 * 1288 / 968), // 与档案照片 charlie.jpg 原始比例一致
    chat: {
      typingSpeed: 26,
      pauseBetweenMessages: 420,
      defaultReplies: [
        "这条线索我先记下了。",
        "有意思，看来调查方向没错。",
        "不要急，把线索拼起来再看。",
        "我这边会继续核对手上的资料。",
        "如果你发现了新的关键词，记得告诉我。"
      ]
    },
    toastDuration: 2300
  };

  // 卡面配置：id、名称、图片路径。
  // 图片请放入 public/assets/cards/，按下面 image 字段命名。
  window.CARDS = [
    { id: "gong-fan", name: "共犯", image: "public/assets/cards/共犯.jpg", fallback: "charlie.jpg" },
    { id: "huo-yan-xuan-yan", name: "火焰宣言", image: "public/assets/cards/火焰宣言.jpg", fallback: "charlie.jpg" },
    { id: "man-yuan-zhi-huo", name: "满愿之火", image: "public/assets/cards/满愿之火.jpg", fallback: "charlie.jpg" },
    { id: "pian-yu-fan-long", name: "片羽樊笼", image: "public/assets/cards/片羽樊笼.jpg", fallback: "charlie.jpg" },
    { id: "wo-xin-jiang-luo", name: "我心降落", image: "public/assets/cards/我心降落.jpg", fallback: "charlie.jpg" },
    { id: "zui-meng-jin-xiang", name: "醉梦金乡", image: "public/assets/cards/醉梦金乡.jpg", fallback: "charlie.jpg" }
  ];

  // 关键词配置：
  // position 用于组合：left/right/full；generated=true 表示组合生成后才会出现在档案中。
  window.KEYWORDS = [
    {
      id: "vacuum",
      name: "真空天赋",
      color: "#b9a7ff",
      shape: "circle",
      group: "talent",
      position: "full",
      cardId: "huo-yan-xuan-yan",
      generated: false,
      story: [
        "查理苏的真空天赋，并不只是物理学意义上的抽离空气。",
        "在几次近距离观察中，他可以让一片区域瞬间失去介质，声音、光线甚至部分能量都出现异常折损。",
        "档案组目前仍无法确认这种能力的上限。"
      ]
    },
    {
      id: "mixed-blood",
      name: "灵族混血",
      color: "#9f86ff",
      shape: "diamond",
      group: "blood",
      position: "full",
      cardId: "pian-yu-fan-long",
      generated: false,
      story: [
        "他的人族与灵族血脉，是很多异常现象被忽略的原因。",
        "母亲羲和来自灵族，这一支血脉在他成年后似乎仍在缓慢觉醒。",
        "医疗检查报告里的部分指标，并不符合普通人族标准。"
      ]
    },
    {
      id: "novaten",
      name: "NOVATEN 继承人",
      color: "#79b8ff",
      shape: "rect",
      group: "identity",
      position: "full",
      cardId: "gong-fan",
      generated: false,
      story: [
        "作为 NOVATEN 药业集团的唯一继承人，他拥有常人难以调动的资源。",
        "这层身份让很多调查只能绕开公开渠道进行。",
        "集团旗下部分实验室，至今仍拒绝连山会的例行问询。"
      ]
    },
    {
      id: "birthday",
      name: "07.24 · 生日",
      color: "#ffd166",
      shape: "circle",
      group: "date",
      position: "full",
      cardId: "man-yuan-zhi-huo",
      generated: false,
      story: [
        "7月24日，是查理苏的生日。",
        "这组数字也反复出现在与满愿之火相关的旧物记录里。",
        "它可能不是简单的日期，而是一把尚未完全打开的钥匙。"
      ]
    },
    {
      id: "real-estate",
      name: "房地产",
      color: "#7fd0b2",
      shape: "rect",
      group: "asset",
      position: "full",
      cardId: "zui-meng-jin-xiang",
      generated: false,
      story: [
        "查理苏名下产业众多，房地产只是其中一条线索。",
        "多处物业的登记信息并不完整，部分资金流向指向醉梦金乡相关项目。",
        "连山会仍在追查这些资产是否与地底势力有关。"
      ]
    },
    {
      id: "visiting-expert",
      name: "外聘专家",
      color: "#a6d5ff",
      shape: "diamond",
      group: "career",
      position: "full",
      cardId: "wo-xin-jiang-luo",
      generated: false,
      story: [
        "光启市第一人民医院烧伤整形科的外聘专家身份，让他能合法进出医疗重地。",
        "这份职业履历也与“我心降落”卡面中出现的场景存在交叉。",
        "他利用医疗资源接触过哪些特殊病例，仍在进一步比对。"
      ]
    },
    {
      id: "black-sand",
      name: "黑砂",
      color: "#ff5f6d",
      shape: "piece-left",
      group: "anomaly",
      position: "left",
      cardId: null,
      generated: false,
      story: [
        "能力展现时，空气中会析出细小的黑色颗粒，像砂，又像灰烬。",
        "这些黑砂不溶于常见液体，短时间后又会自行消散。",
        "目前没有证据表明它们具有实体攻击性，但作用仍未知。"
      ]
    },
    {
      id: "underworld",
      name: "地底势力",
      color: "#f4b860",
      shape: "piece-right",
      group: "anomaly",
      position: "right",
      cardId: null,
      generated: false,
      story: [
        "多份目击记录都指向同一类描述：他接触过来自地底的人。",
        "对方身份被刻意抹去，连山会只找到少量残缺通行记录。",
        "这部分情报被列为 S 级，暂不能向普通督查开放。"
      ]
    },
    {
      id: "heart-left",
      name: "红色爱心·左",
      color: "#ff4d6d",
      shape: "heart-left",
      group: "heart",
      position: "left",
      cardId: null,
      generated: false,
      story: [
        "这张左半爱心卡来自一张被撕开的旧照片。",
        "背面写着一行小字：只有拼齐，才能知道它指向谁。"
      ]
    },
    {
      id: "heart-right",
      name: "红色爱心·右",
      color: "#ff4d6d",
      shape: "heart-right",
      group: "heart",
      position: "right",
      cardId: null,
      generated: false,
      story: [
        "右半爱心卡是在旧档案夹里找到的。",
        "材质和左半张一致，边缘有明显撕痕。"
      ]
    },
    {
      id: "sand-ability",
      name: "黑砂契约",
      color: "#d6487f",
      shape: "piece-full",
      group: "anomaly",
      position: "full",
      cardId: null,
      generated: true,
      story: [
        "黑砂与地底势力的线索拼合后，档案自动解锁了新的结论。",
        "他可能并非单纯获得能力，而是与地底某个存在达成了契约。",
        "契约的具体内容仍被加密，但黑砂很可能是履约时的痕迹。"
      ]
    },
    {
      id: "heart-full",
      name: "完整红色爱心",
      color: "#ff4d6d",
      shape: "heart",
      group: "heart",
      position: "full",
      cardId: null,
      generated: true,
      story: [
        "两张碎片拼成了一个完整的爱心。",
        "照片中央出现了查理苏年轻时的侧影，背后还有一个模糊的女性轮廓。"
      ]
    },
    {
      id: "void-erosion",
      name: "虚空侵蚀",
      color: "#7f5af0",
      shape: "circle",
      group: "void",
      position: "full",
      cardId: null,
      generated: true,
      story: [
        "当真空天赋与黑砂契约被同时激活，记录仪捕捉到更危险的征兆。",
        "那片区域不是被抽空，而是在被缓慢侵蚀。",
        "连山会已将“虚空侵蚀”列为最高优先级调查项。"
      ]
    }
  ];

  // 组合表：inputs 为关键词 id 列表，output 为新关键词 id。
  window.COMBINATIONS = [
    { id: "combo-sand", inputs: ["black-sand", "underworld"], output: "sand-ability" },
    { id: "combo-heart", inputs: ["heart-left", "heart-right"], output: "heart-full" },
    { id: "combo-void", inputs: ["vacuum", "sand-ability"], output: "void-erosion" }
  ];
})();
