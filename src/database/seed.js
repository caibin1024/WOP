/**
 * 预置数据：训练计划 + 动作教学
 * 每个动作都有完整的文字教学（步骤/常见错误/小贴士）
 * 图片和视频用本地 asset 路径或空（文字兜底）
 */

export const SEED_EXERCISES = [
  // ============ Push Day ============
  {
    id: 'dumbbell-shoulder-press',
    recommendedWeightKg: 6, // 单边（建议起始）
    name: '哑铃肩推（坐姿）',
    category: 'shoulder',
    isMachine: false,
    targetMuscle: '三角肌前束、中束、三头',
    instructions: '1. 坐姿，背靠椅背，双脚踩实地面\n2. 双手各持哑铃举至肩两侧，掌心朝前，手肘约90度\n3. 呼气，将哑铃向上推起至手臂接近伸直（手肘微曲不锁死）\n4. 顶端稍作停顿，吸气缓慢下放回起始位置\n5. 全程核心收紧，腰部不要过度反弓',
    commonMistakes: '1. 手肘过度外张，导致肩部压力大\n2. 腰部反弓借力\n3. 下降过低，肩部过度拉伸\n4. 耸肩，三角肌受力减弱',
    tips: '哑铃比杠铃活动范围更大，肩部舒适优先。若肩关节弹响，可用中立握（掌心相对）代替'
  },
  {
    id: 'machine-chest-press',
    recommendedWeightKg: 20, // 配重（建议起始）
    name: '坐姿器械推胸',
    category: 'chest',
    isMachine: true,
    targetMuscle: '胸大肌、三头、三角肌前束',
    instructions: '1. 调节座椅高度，手柄约在胸口高度\n2. 背靠垫板，双脚踩实，挺胸收肩胛\n3. 呼气，将手柄向前推出至手臂接近伸直\n4. 吸气，缓慢还原至胸肌有拉伸感，手肘略低于肩\n5. 全程胸肌持续发力，不要耸肩',
    commonMistakes: '1. 行程太短，没有推到手臂伸直\n2. 肩胛骨翘起，耸肩借力\n3. 快速下放，失去离心控制\n4. 座椅太低导致发力方向错误',
    tips: '固定器械对你来说已经熟悉，重点放在"挺胸+夹紧肩胛"的动作质量上，可以尝试递增重量'
  },
  {
    id: 'cable-lateral-raise',
    recommendedWeightKg: 5, // 配重（建议起始）
    name: '绳索侧平举',
    category: 'shoulder',
    isMachine: true,
    targetMuscle: '三角肌中束',
    instructions: '1. 单手持绳索把手，身体微微向对侧倾斜，另一手扶固定物\n2. 手肘微曲固定，向身体侧上方抬起至与肩齐平\n3. 顶端稍作停顿，控制缓慢下放\n4. 用三角肌发力，不要靠惯性甩动\n5. 每组做完换边',
    commonMistakes: '1. 用爆发力甩起，惯性借力\n2. 抬得过高超过肩部，斜方肌代偿\n3. 耸肩\n4. 手臂完全伸直，肘关节压力大',
    tips: '绳索比哑铃的优势是全程阻力恒定。重量宁轻勿重，感受三角肌的灼烧感'
  },
  {
    id: 'machine-fly',
    recommendedWeightKg: 15, // 配重（建议起始）
    name: '器械飞鸟（蝴蝶机）',
    category: 'chest',
    isMachine: true,
    targetMuscle: '胸大肌中缝',
    instructions: '1. 调整座椅，手肘约90度，掌心相对\n2. 挺胸收腹，胸肌发力带动手臂向前合拢\n3. 顶峰收缩1秒，感受胸部夹紧\n4. 缓慢张开还原，胸肌有拉伸感\n5. 全程手肘角度固定',
    commonMistakes: '1. 用手臂发力代替胸肌\n2. 展开太快，离心失去控制\n3. 含胸驼背\n4. 手肘角度变化，变成推举',
    tips: '这个动作的关键是"夹胸"而非"推"，顶峰停顿很重要。重量不宜过大'
  },
  {
    id: 'dumbbell-fly',
    recommendedWeightKg: 5, // 单边（建议起始，前期中束偏弱从轻起步）
    name: '哑铃飞鸟（仰卧）',
    category: 'chest',
    isMachine: false,
    targetMuscle: '胸大肌中缝',
    instructions: '1. 仰卧在平凳上，双脚踩实地面，双手各持哑铃举于胸部正上方\n2. 手肘微曲固定（约150度），掌心相对\n3. 吸气，控制哑铃沿弧线向身体两侧张开，感受胸部拉伸\n4. 呼气，用胸肌力量将哑铃沿弧线夹回胸前\n5. 全程手肘角度保持不变，不要做成推举',
    commonMistakes: '1. 手肘弯曲过多，变成哑铃卧推\n2. 下放过低，肩部过度拉伸，肩关节压力大\n3. 含胸，肩胛骨离开凳面\n4. 用惯性甩动，失去控制',
    tips: '这个动作的关键是"夹胸"而非重量。单边重量通常比卧推轻很多，用8kg左右起步找感觉，宁轻勿重'
  },
  {
    id: 'cable-triceps-pushdown',
    recommendedWeightKg: 12, // 配重（建议起始）
    name: '绳索三头下压',
    category: 'triceps',
    isMachine: true,
    targetMuscle: '肱三头肌',
    instructions: '1. 面对绳索机站立，双手握住直杠或绳索把手\n2. 上臂贴紧身体两侧，肘部固定不动\n3. 呼气，用三头力量将把手向下压至手臂伸直\n4. 稍作停顿，吸气缓慢还原至手肘约90度\n5. 身体不要前后晃动借力',
    commonMistakes: '1. 手肘向外张开\n2. 身体前倾用体重下压\n3. 肩部晃动\n4. 还原太高，肩部压力大',
    tips: '上臂全程夹紧是核心要点。想刺激内侧头可用绳索做"V字分开"下压'
  },

  // ============ Pull Day ============
  {
    id: 'wide-lat-pulldown',
    recommendedWeightKg: 25, // 配重（建议起始）
    name: '宽距高位下拉',
    category: 'back',
    isMachine: true,
    targetMuscle: '背阔肌、大圆肌',
    instructions: '1. 双手宽握横杆，握距约为肩宽1.5倍\n2. 挺胸坐稳，大腿固定，身体略后倾\n3. 呼气，背阔肌发力将横杆拉向锁骨下方\n4. 顶端收缩1秒，吸气缓慢还原至手臂伸直\n5. 感受"把肘往下压"而不是"用手拉"',
    commonMistakes: '1. 身体过度后仰借力\n2. 拉到脖子后面（压力大、效果差）\n3. 用手臂代偿，背没发力\n4. 还原时完全放松，失去张力',
    tips: '你已经在练这个动作。升级要点：想象肘尖朝下向后拉，下巴微收，胸口尽量靠近横杆'
  },
  {
    id: 'close-lat-pulldown',
    recommendedWeightKg: 20, // 配重（建议起始）
    name: '窄距高位下拉',
    category: 'back',
    isMachine: true,
    targetMuscle: '背阔肌下部、二头',
    instructions: '1. 双手反握或对握窄距横杆/V字把手\n2. 挺胸，身体直立微后倾\n3. 呼气，将把手拉至胸部上方\n4. 顶端收缩，缓慢还原\n5. 下背和下胸部有拉伸感',
    commonMistakes: '1. 反握时手腕压力大\n2. 拉到肚子位置（行程过大伤肩）\n3. 身体晃动\n4. 二头代偿过多',
    tips: '窄握更侧重背阔肌下部，让背显得更厚更倒三角'
  },
  {
    id: 'seated-cable-row',
    recommendedWeightKg: 25, // 配重（建议起始）
    name: '坐姿绳索划船',
    category: 'back',
    isMachine: true,
    targetMuscle: '背阔肌、斜方肌中下、菱形肌',
    instructions: '1. 坐于划船机，双脚踩稳踏板，膝盖微曲\n2. 双手握V字把手，挺胸直背\n3. 呼气，将把手拉向腹部，肩胛骨后收\n4. 顶峰收缩1秒，吸气缓慢还原\n5. 保持身体稳定，不要用腰借力',
    commonMistakes: '1. 身体前后摇摆借力\n2. 耸肩，斜方肌上部过度发力\n3. 含胸弓背\n4. 拉得太高（拉到胸口而非腹部）',
    tips: '这是增加背部厚度的核心动作。拉到底时把肩胛骨往中间夹，想象两个肩胛骨之间能夹住一支笔'
  },
  {
    id: 'machine-row',
    recommendedWeightKg: 30, // 配重（建议起始）
    name: '器械划船',
    category: 'back',
    isMachine: true,
    targetMuscle: '背阔肌、斜方肌中下、菱形肌',
    instructions: '1. 坐入划船机，胸口贴紧胸托垫，双脚踩实踏板，膝盖微曲\n2. 双手握把手，挺胸直背，肩胛骨自然前送\n3. 呼气，将把手拉向腹部，肩胛骨后收夹紧\n4. 顶峰收缩1秒，吸气缓慢还原至背部有拉伸感\n5. 全程胸口贴住胸托，不要用腰或惯性借力',
    commonMistakes: '1. 胸口离开胸托，身体后仰借力\n2. 耸肩，斜方肌上部代偿\n3. 拉得太高（拉到胸口而非腹部）\n4. 还原时完全放松，背肌失去张力',
    tips: '器械轨迹固定、重心稳，比绳索更容易孤立背部，适合堆重量。要点和坐姿绳索划船一样是顶峰夹紧肩胛骨，两个动作互补练'
  },
  {
    id: 'face-pull',
    recommendedWeightKg: 8, // 配重（建议起始）
    name: '面拉',
    category: 'shoulder',
    isMachine: true,
    targetMuscle: '三角肌后束、肩袖肌群、斜方肌中下',
    instructions: '1. 绳索调至面部高度，双手各握绳索一端\n2. 后退一步，让绳索有张力\n3. 呼气，将绳索拉向眉心，双手向两侧分开成"W"形\n4. 顶峰收缩1秒，缓慢还原\n5. 肩胛骨向后收紧',
    commonMistakes: '1. 拉的太靠近身体\n2. 用手臂发力而不是肩后束\n3. 耸肩\n4. 重量过大导致动作变形',
    tips: '这是对肩关节最友好的动作之一，对你的肩部弹响有很好的保护和强化作用，坚持练'
  },
  {
    id: 'dumbbell-curl',
    recommendedWeightKg: 6, // 单边（建议起始）
    name: '哑铃弯举',
    category: 'biceps',
    isMachine: false,
    targetMuscle: '肱二头肌',
    instructions: '1. 站立，双手持哑铃垂于体侧，掌心朝前\n2. 上臂夹紧身体，手肘固定\n3. 呼气，二头发力将哑铃弯举至肩前\n4. 顶峰收缩，缓慢下放至手臂伸直\n5. 不要晃动身体借力',
    commonMistakes: '1. 手肘向前移动，肩部代偿\n2. 甩腰借力\n3. 下放太快，离心失控\n4. 手腕弯曲，前臂代偿',
    tips: '新手可先用斜托板弯举减少借力。下放时要慢，感受二头的拉伸'
  },

  // ============ Legs + Core Day ============
  {
    id: 'leg-press',
    recommendedWeightKg: 40, // 配重（建议起始）
    name: '倒蹬机（腿举）',
    category: 'legs',
    isMachine: true,
    targetMuscle: '股四头肌、臀大肌、腘绳肌',
    instructions: '1. 坐于倒蹬机，背部紧贴靠垫，双脚踩在踏板与肩同宽\n2. 解开安全锁，膝盖微曲\n3. 吸气，控制下放至膝盖约90度（臀部不离垫）\n4. 呼气，用腿部力量将踏板推起，膝盖不完全锁死\n5. 全程下背部紧贴垫子',
    commonMistakes: '1. 膝盖内扣\n2. 下放过深，腰部离垫\n3. 推起时膝盖完全锁死\n4. 双脚位置过高，压力集中腰部',
    tips: '腿部安全入门动作。重心放脚后跟，推起时想象"把地板踩穿"。这是你第一次练腿，重量从轻开始'
  },
  {
    id: 'seated-leg-curl',
    recommendedWeightKg: 12, // 配重（建议起始）
    name: '坐姿腿弯举',
    category: 'legs',
    isMachine: true,
    targetMuscle: '腘绳肌（大腿后侧）',
    instructions: '1. 坐于腿弯举机，调整滚垫贴合小腿后侧\n2. 双手扶住把手保持稳定\n3. 呼气，将滚垫向臀部方向勾起\n4. 顶峰收缩1秒，吸气缓慢还原\n5. 全程大腿前侧不要抬离坐垫',
    commonMistakes: '1. 用惯性甩动\n2. 还原过快\n3. 臀部抬起\n4. 重量过大，只能做半程',
    tips: '腘绳肌容易忽略但对运动表现和膝部健康很重要。动作慢一点，感受大腿后侧收紧'
  },
  {
    id: 'prone-leg-curl',
    recommendedWeightKg: 10, // 配重（建议起始）
    name: '俯身腿弯举',
    category: 'legs',
    isMachine: true,
    targetMuscle: '腘绳肌（大腿后侧）',
    instructions: '1. 俯卧于腿弯举机，膝盖对准器械转轴，滚垫贴住脚踝后方\n2. 双手扶住把手或垫子，骨盆贴紧垫面\n3. 呼气，将小腿向臀部方向勾起，尽量让脚跟靠近臀部\n4. 顶峰收缩1秒，吸气缓慢还原\n5. 全程髋部不要抬起，避免借力',
    commonMistakes: '1. 髋部抬起，用臀部借力\n2. 速度太快\n3. 还原时完全放松\n4. 重量过大导致后半程靠甩动完成',
    tips: '俯身位对腘绳肌孤立更好。动作放慢，感受大腿后侧全程绷紧，膝盖全程对准转轴'
  },
  {
    id: 'leg-extension',
    recommendedWeightKg: 15, // 配重（建议起始）
    name: '腿伸展机（股四头）',
    category: 'legs',
    isMachine: true,
    targetMuscle: '股四头肌',
    instructions: '1. 坐于腿伸展机，调整滚垫在脚踝上方\n2. 背部贴紧靠垫，双手扶把\n3. 呼气，将小腿向上伸直至腿部接近全直\n4. 顶峰收缩1秒，缓慢下放\n5. 上抬时避免膝盖完全锁死',
    commonMistakes: '1. 用惯性摆动\n2. 抬得太快\n3. 下放时完全放松\n4. 膝盖压力大时仍在做大重量',
    tips: '这个动作对膝盖压力略大，你的膝盖目前无不适，可以正常练。若感觉膝盖前侧酸胀，减小重量'
  },
  {
    id: 'seated-calf-raise',
    recommendedWeightKg: 15, // 配重（建议起始）
    name: '坐姿提踵',
    category: 'legs',
    isMachine: true,
    targetMuscle: '小腿腓肠肌、比目鱼肌',
    instructions: '1. 坐于提踵机，前脚掌踩在踏板上，膝盖压住挡板\n2. 脚跟尽量下沉，感受小腿拉伸\n3. 呼气，踮起脚尖至最高点，顶峰收缩1秒\n4. 缓慢下放回最低点\n5. 全程匀速，不要弹跳',
    commonMistakes: '1. 用弹跳惯性\n2. 幅度太小\n3. 顶峰不收缩\n4. 身体前倾借力',
    tips: '小腿需要高次数刺激。顶峰停顿1秒效果更好，配合大重量低次数效果佳'
  },
  {
    id: 'cable-crunch',
    recommendedWeightKg: 12, // 配重（建议起始）
    name: '绳索卷腹',
    category: 'core',
    isMachine: true,
    targetMuscle: '腹直肌（上腹）',
    instructions: '1. 跪姿面对绳索机，双手握住绳索把手置于头两侧\n2. 呼气，用腹部力量将上体重心向下卷，肘部向膝盖方向收\n3. 顶峰收紧1-2秒\n4. 吸气，缓慢还原\n5. 用腹肌卷曲而非手臂下压',
    commonMistakes: '1. 用手臂拉绳代替腹肌\n2. 髋部过度前倾\n3. 速度太快\n4. 背部没有弯曲，只是弯腰',
    tips: '腹肌训练的重点是"卷腹"（让肋骨向骨盆靠近），重量适中，动作要慢。没有绳索机可用器械卷腹替代'
  },
  {
    id: 'crunch-machine',
    recommendedWeightKg: 20, // 配重（建议起始）
    name: '卷腹机（器械卷腹）',
    category: 'core',
    isMachine: true,
    targetMuscle: '腹直肌（上腹）',
    instructions: '1. 坐入卷腹机，调整靠垫位置，双手握住胸前把手\n2. 呼气，用腹肌带动上体向前卷，肋部向骨盆靠近\n3. 顶峰收紧1-2秒\n4. 吸气，缓慢还原至起始位\n5. 用腹肌卷曲发力，腰部不要过度弓起',
    commonMistakes: '1. 用手臂下压代替腹肌\n2. 还原过快，腹肌失去张力\n3. 幅度太小\n4. 腰部过度伸展，腰椎压力大',
    tips: '与绳索卷腹同理：重点是"卷"（肋骨向骨盆靠近），不是手臂发力。配重适中，动作要慢'
  },
  {
    id: 'plank',
    name: '平板支撑',
    recommendedSeconds: 45, // 计时动作（建议起始秒数）
    special: 'seconds', // 计时标记：历史/统计页按秒显示（TodayView 读计划引用上的 special，此标记供历史页判定）
    category: 'core',
    isMachine: false,
    targetMuscle: '腹横肌、核心整体',
    instructions: '1. 俯卧，前臂撑地，肘部在肩膀正下方\n2. 双脚并拢，身体呈一条直线\n3. 收紧腹部和臀部，不要塌腰或撅臀\n4. 自然呼吸，坚持目标时间\n5. 到力竭为止，可重复2-3组',
    commonMistakes: '1. 塌腰，腰椎压力大\n2. 撅臀，核心没收紧\n3. 抬头或憋气\n4. 时间过长但动作变形',
    tips: '质量比时间重要。动作变形就停下，休息后再来。这是很好的核心基础训练'
  },
  {
    id: 'machine-leg-raise',
    name: '器械举腿',
    category: 'core',
    isMachine: true,
    targetMuscle: '腹直肌（下腹）、髋屈肌',
    instructions: '1. 前臂撑在肘垫上，背贴靠垫，双手握住两侧把手\n2. 身体稳定，双腿并拢自然下垂，不要完全放松\n3. 呼气，用下腹力量将双腿向上抬起至与地面平行或略高\n4. 顶峰收紧1-2秒，吸气缓慢下放，但腿不触底（保持腹肌张力）\n5. 全程身体不前后摆动，用腹肌卷起而非靠惯性甩',
    commonMistakes: '1. 用惯性前后摆动，靠甩动把腿甩上去\n2. 身体后仰，用髋部借力\n3. 只抬大腿不卷腹，下腹没发力\n4. 下放太快、腿触底，腹肌失去张力',
    tips: '与卷腹机（上腹）互补，专攻下腹。这个器械是纯自重，重点在慢下放和顶峰停顿；动作慢、幅度完整，比次数重要'
  },
  {
    id: 'seated-torso-rotation',
    recommendedWeightKg: 15, // 配重（建议起始）
    name: '坐姿转体机',
    category: 'core',
    isMachine: true,
    targetMuscle: '腹斜肌（侧腹）',
    instructions: '1. 坐入转体机，调整座椅和胸垫位置，双腿夹紧固定柱\n2. 双手握住把手，上体挺直，核心收紧\n3. 呼气，用侧腹力量带动躯干向一侧旋转，顶峰收紧1秒\n4. 吸气，控制缓慢回正，再转向另一侧（或单侧做完换边）\n5. 全程用腹斜肌发力，不要用手臂硬拉或身体后仰借力',
    commonMistakes: '1. 用手臂发力代替腹斜肌\n2. 回弹过快，靠惯性甩\n3. 身体后仰借力\n4. 幅度太小，旋转不充分',
    tips: '转体机是侧腹最孤立的器械。重量宁轻勿重，感受侧腹全程收紧；左右两侧力量不平衡是正常的，先练弱侧多的一组'
  },

  // ============ 热身动作 ============
  {
    id: 'stick-shoulder-pass',
    name: '棍子绕肩（热身）',
    category: 'warmup',
    isMachine: false,
    targetMuscle: '肩关节、胸椎活动度',
    instructions: '1. 双手握棍（扫帚杆/空杆/木杆），握距略宽于肩\n2. 身体站直、收紧核心，手臂伸直，将棍从体前缓慢绕过头顶\n3. 绕到体后继续绕回前方，完成一次环绕\n4. 全程控制速度、不要借力，做8-12次\n5. 绕不过去就加宽握距，之后逐步收窄',
    commonMistakes: '1. 速度太快、借力甩动\n2. 弓背或塌腰\n3. 手臂弯曲\n4. 强行下压导致肩部弹响或疼痛',
    tips: '健身房没有弹力绳就用棍子代替，这是最经典的肩关节热身。练前做两组把肩部转开，减少训练中的弹响'
  },
  {
    id: 'stick-scapular-pull',
    name: '棍子绕肩·肩胛激活（热身）',
    category: 'warmup',
    isMachine: false,
    targetMuscle: '肩袖、菱形肌、肩胛骨',
    instructions: '1. 双手握棍与肩同宽，手臂伸直前举与肩同高\n2. 呼气，肩胛骨后收下沉，将棍水平向后拉开一小段\n3. 稍作停顿，缓慢还原\n4. 再顺势把棍绕过头顶做一次绕肩\n5. 交替进行8-12次，感受上背部发力',
    commonMistakes: '1. 耸肩\n2. 手肘弯曲\n3. 幅度太小\n4. 速度过快',
    tips: '替代弹力带拉开。拉背前用棍做肩胛后收+绕肩，让肩胛骨找到"后收下沉"的感觉'
  },
  {
    id: 'hip-swing',
    name: '髋部摆动（热身）',
    category: 'warmup',
    isMachine: false,
    targetMuscle: '髋关节',
    instructions: '1. 单手扶墙或固定物站立\n2. 摆动一条腿前后方向，幅度逐渐加大\n3. 再换侧向摆动\n4. 每侧10-15次\n5. 感受髋部活动开',
    commonMistakes: '1. 摆动过快\n2. 弯腰驼背\n3. 幅度太小\n4. 膝盖弯曲过度',
    tips: '腿部训练前的重要热身，让髋关节充分活动，减少膝盖压力'
  },
  {
    id: 'bodyweight-squat',
    name: '徒手深蹲（热身）',
    category: 'warmup',
    isMachine: false,
    targetMuscle: '下肢整体',
    instructions: '1. 双脚与肩同宽，脚尖略外展\n2. 吸气，屈髋屈膝下蹲，臀部向后坐\n3. 下蹲至大腿与地面平行或更低\n4. 呼气，站起还原\n5. 膝盖方向与脚尖一致',
    commonMistakes: '1. 膝盖内扣\n2. 脚跟离地\n3. 弯腰弓背\n4. 下蹲过浅',
    tips: '既是热身也是检验深蹲姿势的好机会，重点关注"膝盖对齐脚尖"'
  },

  // ============ 器械布局调整后的替代动作（哑铃区可调角度躺椅已撤）============
  {
    id: 'smith-shoulder-press',
    recommendedWeightKg: 15, // 配重（建议起始）
    name: '史密斯机肩推（坐姿）',
    category: 'shoulder',
    isMachine: true,
    targetMuscle: '三角肌前束、中束、三头',
    instructions: '1. 将史密斯机靠背调至接近垂直（约80°），坐在凳上，双脚踩实\n2. 双手略宽于肩握杆，杠位于锁骨上方\n3. 呼气，向上推起杠铃至手臂接近伸直（手肘微曲不锁死）\n4. 顶端稍作停顿，吸气缓慢下放至杠略低于下巴\n5. 全程核心收紧，背部贴实靠垫',
    commonMistakes: '1. 靠背放太斜，肩部压力增大\n2. 下放过深，肩关节过度拉伸\n3. 耸肩，三角肌受力减弱\n4. 手腕后仰受压',
    tips: '史密斯轨迹固定，可专注三角肌发力，替代哑铃肩推时重点调整靠背角度'
  },
  {
    id: 'machine-shoulder-press',
    recommendedWeightKg: 15, // 配重（建议起始）
    name: '坐姿器械肩推',
    category: 'shoulder',
    isMachine: true,
    targetMuscle: '三角肌前束、中束、三头',
    instructions: '1. 调节座椅高度，把手约与肩同高\n2. 背部贴实靠垫，双手握把手，双脚踩实\n3. 呼气，向上推起至手臂接近伸直\n4. 吸气，缓慢下放至手肘略低于肩\n5. 全程挺胸收肩胛，不要耸肩',
    commonMistakes: '1. 座椅太高或太低，发力方向错误\n2. 下放过深，肩部压力大\n3. 肩胛骨离开靠垫\n4. 快速下放失去控制',
    tips: '器械肩推轨迹固定、稳定好上手，配重从轻开始，先找到三角肌的发力感'
  },
  {
    id: 'barbell-overhead-press',
    recommendedWeightKg: 15, // 配重（建议起始）
    name: '杠铃站姿肩推',
    category: 'shoulder',
    isMachine: false,
    targetMuscle: '三角肌前束、中束、三头',
    instructions: '1. 站姿，双脚与肩同宽，杠铃置于锁骨前\n2. 双手略宽于肩握杆，收紧核心与臀部\n3. 呼气，垂直向上推起杠铃过头至手臂伸直\n4. 吸气，缓慢下放回锁骨前，保持躯干稳定\n5. 全程不要过度后仰，腰部保持中立',
    commonMistakes: '1. 腰椎过度后仰借力\n2. 杠铃轨迹向前偏移\n3. 手腕后仰受压\n4. 耸肩',
    tips: '站姿推举考验核心稳定，重量宁轻勿重；腰部不适可换史密斯机或坐姿器械'
  },
  {
    id: 'smith-bench-press',
    recommendedWeightKg: 25, // 配重（建议起始）
    name: '史密斯机卧推',
    category: 'chest',
    isMachine: true,
    targetMuscle: '胸大肌、三头、三角肌前束',
    instructions: '1. 平躺于卧推凳，双眼位于杠的正下方\n2. 双手略宽于肩握杆，双脚踩实地面\n3. 呼气，向上推起杠铃至手臂伸直\n4. 吸气，缓慢下放至杠轻触胸口\n5. 全程肩胛骨后收下沉，臀部不离凳',
    commonMistakes: '1. 下放时肘部过度外展，呈T型\n2. 臀部离开凳面\n3. 手腕后仰\n4. 下放速度失控',
    tips: '史密斯轨迹固定，可专注胸肌发力；安全钩让大重量也能独立完成'
  },
  {
    id: 'barbell-bench-press',
    recommendedWeightKg: 25, // 配重（建议起始）
    name: '杠铃平板卧推',
    category: 'chest',
    isMachine: false,
    targetMuscle: '胸大肌、三头、三角肌前束',
    instructions: '1. 平躺，双眼在杠正下方，双手略宽于肩握杆\n2. 肩胛骨后收下压，双脚踩实\n3. 出杠后呼气，推起至手臂伸直\n4. 吸气，控制下放至杠轻触下胸位置\n5. 全程手腕中立，臀部不离凳',
    commonMistakes: '1. 没同伴保护时挑战过大重量\n2. 臀部离凳、腰部反弓\n3. 下放速度失控\n4. 肘部过度外展',
    tips: '自由杠铃需控制平衡与轨迹，务必有人保护或使用安全架；重量循序渐进'
  },
  {
    id: 'barbell-bentover-row',
    recommendedWeightKg: 30, // 配重（建议起始）
    name: '杠铃俯身划船',
    category: 'back',
    isMachine: false,
    targetMuscle: '背阔肌、斜方肌中下、菱形肌',
    instructions: '1. 屈髋俯身，躯干约与地面成45°，背部平直\n2. 双手与肩同宽握杠，自然下垂\n3. 呼气，将杠拉向腹部下缘，肩胛骨收紧\n4. 吸气，控制下放回起始位\n5. 全程核心绷紧，不要弯腰',
    commonMistakes: '1. 弯腰驼背\n2. 用腰部上下晃动借力\n3. 耸肩\n4. 幅度过大导致身体摆动',
    tips: '俯身角度越大对下背压力越大，核心绷紧；重量以能保持背部平直为准'
  },
  {
    id: 'dumbbell-row',
    recommendedWeightKg: 12, // 单边（建议起始）
    name: '单臂哑铃划船',
    category: 'back',
    isMachine: false,
    targetMuscle: '背阔肌、菱形肌、大圆肌',
    instructions: '1. 单侧手掌和同侧膝撑在平凳上，另一腿站地\n2. 另一手抓哑铃自然下垂，背部平直\n3. 呼气，将哑铃拉向髋部方向，肘部贴身\n4. 吸气，控制下放\n5. 每组做完换边',
    commonMistakes: '1. 身体旋转借力\n2. 耸肩\n3. 幅度过大导致肩前移\n4. 下放太快',
    tips: '单臂划船可独立训练两侧背肌，纠正不平衡；想象用肘部带动重量'
  },
  {
    id: 'cable-curl',
    recommendedWeightKg: 15, // 配重（建议起始）
    name: '绳索弯举',
    category: 'biceps',
    isMachine: true,
    targetMuscle: '肱二头肌、肱肌',
    instructions: '1. 面对龙门架，双手握绳头或直杆，大臂贴紧体侧\n2. 肘部固定，呼气，弯举至小臂与地面垂直\n3. 顶峰收缩1秒\n4. 吸气，控制下放至手臂接近伸直\n5. 全程肘部不离开身体',
    commonMistakes: '1. 大臂离开体侧\n2. 身体后仰借力\n3. 下放不完全\n4. 用爆发力甩动',
    tips: '绳索弯举全程保持张力，底部不借惯性；肘部固定是孤立二头的关键'
  },
  {
    id: 'barbell-curl',
    recommendedWeightKg: 15, // 配重（建议起始）
    name: '杠铃弯举',
    category: 'biceps',
    isMachine: false,
    targetMuscle: '肱二头肌、肱肌',
    instructions: '1. 站姿，双手与肩同宽握杆，大臂贴紧体侧\n2. 肘部固定，呼气，弯举至前臂接近垂直\n3. 顶峰稍作停顿\n4. 吸气，控制下放至手臂伸直\n5. 全程身体不晃动',
    commonMistakes: '1. 身体晃动借力\n2. 肘部前移\n3. 手腕过度弯曲\n4. 下放太快',
    tips: '杠铃弯举能上更大重量；若手腕不适可用曲杆或绳索替代'
  },
  {
    id: 'overhead-cable-triceps-extension',
    recommendedWeightKg: 10, // 配重（建议起始）
    name: '绳索过顶三头屈伸',
    category: 'triceps',
    isMachine: true,
    targetMuscle: '肱三头肌长头',
    instructions: '1. 背对龙门架，双手握绳头举过头顶，大臂贴近耳朵\n2. 肘部朝前固定，呼气，向下伸直手臂\n3. 三头收紧1秒\n4. 吸气，控制回放至手肘约90度\n5. 全程大臂保持稳定',
    commonMistakes: '1. 大臂外扩\n2. 用背发力\n3. 肘部打开\n4. 回放太快',
    tips: '过顶动作重点刺激三头长头；重量宁轻，保证肘部全程稳定'
  },
  {
    id: 'smith-squat',
    recommendedWeightKg: 30, // 配重（建议起始）
    name: '史密斯机深蹲',
    category: 'legs',
    isMachine: true,
    targetMuscle: '股四头肌、臀大肌、腘绳肌',
    instructions: '1. 调整杠高度至肩部，杠置于斜方肌上，解锁安全钩\n2. 双脚与肩同宽，脚尖略外展\n3. 吸气，下蹲至大腿与地面平行或略低，膝盖与脚尖方向一致\n4. 呼气，蹬地站起，膝盖不完全锁死\n5. 全程背部平直，脚跟踩实',
    commonMistakes: '1. 膝盖内扣\n2. 脚跟离地\n3. 弯腰弓背\n4. 下蹲过浅',
    tips: '史密斯固定轨迹，适合打磨深蹲动作；先空杆或轻重量找蹲姿，再逐步加重'
  },
  {
    id: 'hack-squat',
    recommendedWeightKg: 40, // 配重（建议起始）
    name: '哈克深蹲',
    category: 'legs',
    isMachine: true,
    targetMuscle: '股四头肌、臀大肌',
    instructions: '1. 肩背贴实哈克机靠垫，双脚踩在踏板上与肩同宽\n2. 解锁安全把手，腿部支撑重量\n3. 吸气，下蹲至大腿与小腿接近垂直\n4. 呼气，蹬回起始位，膝盖不完全锁死\n5. 全程臀部不离开靠垫',
    commonMistakes: '1. 下蹲过深伤膝\n2. 膝盖内扣\n3. 臀部离开靠垫\n4. 快速蹬回失去控制',
    tips: '哈克深蹲对下背压力小，可放心上量；调整脚尖位置可侧重不同腿部肌群'
  },
  {
    id: 'hanging-leg-raise',
    name: '悬垂举腿',
    category: 'core',
    isMachine: false,
    targetMuscle: '腹直肌下部、髂腰肌',
    instructions: '1. 悬垂于单杠，双手与肩同宽，身体自然下垂\n2. 收核心，呼气，卷腹将双腿抬至与地面平行或更高\n3. 顶峰稍作停顿\n4. 吸气，控制下放回起始位\n5. 全程不要摆动借力',
    commonMistakes: '1. 用摆动借力\n2. 耸肩\n3. 下放太快失控\n4. 只靠髋部上抬',
    tips: '直腿困难可先做屈膝抬腿；核心收紧、控制下放是刺激腹部的关键'
  },
  {
    id: 'dumbbell-lateral-raise',
    name: '哑铃侧平举',
    category: 'shoulder',
    isMachine: false,
    recommendedWeightKg: 6,
    targetMuscle: '三角肌中束',
    instructions: '1. 双手持哑铃于体侧，肘微屈\n2. 呼气，向两侧平举至与肩同高\n3. 顶峰稍作停顿\n4. 吸气，缓慢下放回起始位\n5. 不要耸肩借力',
    commonMistakes: '1. 耸肩\n2. 用惯性甩起\n3. 举得过高（超过肩线）\n4. 下放太快',
    tips: '小重量多次数更有效；肘部微屈保持张力，直立练中束，前倾略练前束'
  },
  {
    id: 'assisted-pull-up',
    name: '引体向上（辅助机）',
    category: 'back',
    isMachine: true,
    recommendedWeightKg: 20,
    targetMuscle: '背阔肌、大圆肌',
    instructions: '1. 跪在/站在辅助引体机垫板上，双手宽握把手（略宽于肩）\n2. 呼气，背部发力将身体向上拉起，至下巴过杠\n3. 顶峰收缩背阔肌1-2秒\n4. 吸气，控制身体缓慢下放至手臂接近伸直\n5. 保持核心收紧，不要摆动借力',
    commonMistakes: '1. 用二头猛拉、背没发力\n2. 身体前后摆动借力\n3. 半程拉一半就停\n4. 下放太快失控',
    tips: '配重越大辅助越多、越轻松。每完成一次就考虑减一点配重，向自重引体过渡；握距宽主攻背阔宽度'
  },
  {
    id: 'machine-crunch-lower',
    name: '下腹卷腹机',
    category: 'core',
    isMachine: true,
    recommendedWeightKg: 15,
    targetMuscle: '腹直肌（下腹）',
    instructions: '1. 坐入下腹卷腹机，固定上身，双脚踩在脚踏/膝垫上\n2. 呼气，用下腹力量带动大腿向胸部方向卷起，骨盆后倾\n3. 顶峰收紧1-2秒\n4. 吸气，控制缓慢还原至起始位\n5. 用下腹卷曲发力，不要用腿蹬或惯性甩',
    commonMistakes: '1. 用腿蹬地借力\n2. 只抬腿不卷骨盆\n3. 还原过快，下腹失去张力\n4. 幅度太小',
    tips: '与卷腹机（上腹）互补，专攻下腹。重点是骨盆后倾的"卷"而非抬腿，动作慢、幅度完整'
  }
]

// PPL 三分化训练计划
// dayType: push / pull / legs
export const SEED_WORKOUT_PLAN = [
  {
    dayType: 'push',
    label: 'Push · 推日',
    description: '胸 + 肩前中束 + 三头',
    exercises: [
      { exerciseId: 'stick-shoulder-pass', targetSets: 2, targetRepsMin: 8, targetRepsMax: 12, restSeconds: 30, sortOrder: 0 },
      { exerciseId: 'dumbbell-shoulder-press', targetSets: 4, targetRepsMin: 10, targetRepsMax: 12, restSeconds: 90, sortOrder: 1 },
      { exerciseId: 'machine-chest-press', targetSets: 4, targetRepsMin: 12, targetRepsMax: 12, restSeconds: 90, sortOrder: 2 },
      { exerciseId: 'cable-lateral-raise', targetSets: 4, targetRepsMin: 12, targetRepsMax: 12, restSeconds: 60, sortOrder: 3 },
      { exerciseId: 'machine-fly', targetSets: 4, targetRepsMin: 12, targetRepsMax: 12, restSeconds: 60, sortOrder: 4 },
      { exerciseId: 'cable-triceps-pushdown', targetSets: 4, targetRepsMin: 12, targetRepsMax: 12, restSeconds: 60, sortOrder: 5 },
      { exerciseId: 'dumbbell-lateral-raise', targetSets: 4, targetRepsMin: 12, targetRepsMax: 15, restSeconds: 60, sortOrder: 6 }
    ]
  },
  {
    dayType: 'pull',
    label: 'Pull · 拉日',
    description: '背 + 肩后束 + 二头',
    exercises: [
      { exerciseId: 'stick-scapular-pull', targetSets: 2, targetRepsMin: 8, targetRepsMax: 12, restSeconds: 30, sortOrder: 0 },
      { exerciseId: 'wide-lat-pulldown', targetSets: 4, targetRepsMin: 12, targetRepsMax: 12, restSeconds: 90, sortOrder: 1 },
      { exerciseId: 'close-lat-pulldown', targetSets: 4, targetRepsMin: 12, targetRepsMax: 12, restSeconds: 90, sortOrder: 2 },
      { exerciseId: 'seated-cable-row', targetSets: 4, targetRepsMin: 12, targetRepsMax: 12, restSeconds: 90, sortOrder: 3 },
      { exerciseId: 'face-pull', targetSets: 4, targetRepsMin: 12, targetRepsMax: 12, restSeconds: 60, sortOrder: 4 },
      { exerciseId: 'dumbbell-curl', targetSets: 4, targetRepsMin: 12, targetRepsMax: 12, restSeconds: 60, sortOrder: 5 },
      { exerciseId: 'machine-row', targetSets: 4, targetRepsMin: 12, targetRepsMax: 12, restSeconds: 90, sortOrder: 6 },
      { exerciseId: 'assisted-pull-up', targetSets: 4, targetRepsMin: 8, targetRepsMax: 12, restSeconds: 90, sortOrder: 7 }
    ]
  },
  {
    dayType: 'legs',
    label: 'Legs+Core · 腿核日',
    description: '腿 + 核心',
    exercises: [
      { exerciseId: 'hip-swing', targetSets: 2, targetRepsMin: 10, targetRepsMax: 15, restSeconds: 30, sortOrder: 0 },
      { exerciseId: 'bodyweight-squat', targetSets: 2, targetRepsMin: 12, targetRepsMax: 15, restSeconds: 30, sortOrder: 1 },
      { exerciseId: 'leg-press', targetSets: 4, targetRepsMin: 12, targetRepsMax: 12, restSeconds: 90, sortOrder: 2 },
      { exerciseId: 'prone-leg-curl', targetSets: 4, targetRepsMin: 12, targetRepsMax: 12, restSeconds: 60, sortOrder: 3 },
      { exerciseId: 'leg-extension', targetSets: 4, targetRepsMin: 12, targetRepsMax: 12, restSeconds: 60, sortOrder: 4 },
      { exerciseId: 'seated-calf-raise', targetSets: 4, targetRepsMin: 15, targetRepsMax: 15, restSeconds: 60, sortOrder: 5 },
      { exerciseId: 'crunch-machine', targetSets: 4, targetRepsMin: 15, targetRepsMax: 15, restSeconds: 45, sortOrder: 6 },
      { exerciseId: 'machine-leg-raise', targetSets: 3, targetRepsMin: 12, targetRepsMax: 15, restSeconds: 45, sortOrder: 7 },
      { exerciseId: 'seated-torso-rotation', targetSets: 3, targetRepsMin: 15, targetRepsMax: 15, restSeconds: 45, sortOrder: 8 },
      { exerciseId: 'cable-crunch', targetSets: 4, targetRepsMin: 15, targetRepsMax: 15, restSeconds: 45, sortOrder: 9 },
      { exerciseId: 'machine-crunch-lower', targetSets: 4, targetRepsMin: 12, targetRepsMax: 15, restSeconds: 45, sortOrder: 10 }
    ]
  }
]

// 日型展示信息（标签/描述为静态文案，不随计划编辑落库；计划动作以 workout_day_exercises 表为准）
export const PLAN_LABELS = SEED_WORKOUT_PLAN.reduce((acc, day) => {
  acc[day.dayType] = { label: day.label, description: day.description }
  return acc
}, {})

// PPL 练3休1 循环锚点：2026-08-11 = Push 日（本地时间）
const SCHEDULE_ANCHOR = new Date(2026, 7, 11)
const SCHEDULE_CYCLE = ['push', 'pull', 'legs', 'rest']

/**
 * 计算任意日期的计划类型
 * @param {Date|string} date  Date 对象（本地），或本地 YYYY-MM-DD 字符串
 * @param {number} offsetDays 已顺延的天数（整体后移 offsetDays 天）
 */
export function getDayTypeForDate(date, offsetDays = 0) {
  const d = date instanceof Date ? date : new Date(date)
  d.setHours(0, 0, 0, 0)
  const diffDays = Math.floor((d - SCHEDULE_ANCHOR) / (24 * 60 * 60 * 1000))
  return SCHEDULE_CYCLE[(((diffDays - offsetDays) % 4) + 4) % 4]
}

/**
 * 计算今天对应的 dayType
 */
export function getTodayDayType(offsetDays = 0) {
  return getDayTypeForDate(new Date(), offsetDays)
}

/**
 * 获取某训练日的动作列表（含动作详情）
 */
export function getWorkoutDayExercises(dayType) {
  const plan = SEED_WORKOUT_PLAN.find(p => p.dayType === dayType)
  if (!plan) return []
  return plan.exercises.map(wde => {
    const exercise = SEED_EXERCISES.find(e => e.id === wde.exerciseId)
    return { ...wde, exercise }
  })
}

/**
 * 首次初始化时把预置计划写入 workout_day_exercises（表空才写入）。
 * 此后计划以表为准，支持用户在设置页 换/增删/排序 自定义。
 * 注意：由 initDatabase 内部调用，必须传本地 db 对象（模块级 query 会重入 initDatabase）。
 */
export async function seedWorkoutDayExercises(db) {
  const res = await db.query('SELECT COUNT(*) AS n FROM workout_day_exercises', [])
  if ((res.values?.[0]?.n || 0) > 0) return
  for (const day of SEED_WORKOUT_PLAN) {
    for (const slot of day.exercises) {
      const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
      await db.run(
        `INSERT INTO workout_day_exercises (id, day_type, exercise_id, target_sets, target_reps_min, target_reps_max, rest_seconds, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, day.dayType, slot.exerciseId, slot.targetSets, slot.targetRepsMin, slot.targetRepsMax, slot.restSeconds, slot.sortOrder]
      )
    }
  }
}
