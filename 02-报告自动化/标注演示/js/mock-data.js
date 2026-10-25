/*!
 * ScaleMark 静态演示 · 虚构样例数据
 * ------------------------------------------------------------
 * 说明：
 * 1. 本文件内的学生姓名、学校、年龄、日期、分数等全部为虚构数据；
 * 2. 图片只引用同级目录 screenshots/ 下已脱敏的错题截图，不在本目录复制；
 * 3. 演示层会在读取时把相对路径解析为 ../screenshots/<路径>。
 */
(function () {
    'use strict';

    // 量表面板中参与“最终得分总分”汇总的字段（与实际后端统计口径保持一致）
    const LOW_FINAL_SCORE_FIELDS = [
        '1_1_得分', '1_2_得分', '1_3_得分', '1_4_得分', '1_5_得分', '1_6_得分',
        '2_1_得分', '2_2_得分', '3_1_最终得分', '3_2_最终得分',
        '4_1_1_得分', '4_2_1_最终得分', '4_2_2_得分', '4_2_3_得分',
        '5_最终得分', '6_得分'
    ];
    const HIGH_FINAL_SCORE_FIELDS = [
        '1_1_得分', '1_2_得分', '1_3_得分', '1_4_得分', '1_5_得分', '1_6_得分',
        '2_1_最终得分', '2_2_最终得分', '3_1_最终得分', '3_2_最终得分',
        '4_1_1_得分', '4_1_2_得分', '4_2_1_得分', '4_2_2_最终得分', '4_2_3_得分',
        '5_得分'
    ];

    // 两个量表版本的真实满分为 42 分，演示页按百分制展示，便于讲解。
    const SCALE_MAX_SCORE = 42;

    /**
     * 计算演示用的原始总分（满分 42 分，保留一位小数）。
     * 与真实后端一致：写入“最终得分总分”的是原始分，不是百分制分数。
     * @param {Object} fields 某一等级的表单字段
     * @param {'low'|'high'} gradeType
     * @returns {string}
     */
    function calcScaleRawTotal(fields, gradeType) {
        const keys = gradeType === 'low' ? LOW_FINAL_SCORE_FIELDS : HIGH_FINAL_SCORE_FIELDS;
        const raw = keys.reduce(function (sum, key) {
            const value = parseFloat(fields[key]);
            return sum + (Number.isFinite(value) ? value : 0);
        }, 0);
        return raw.toFixed(1);
    }

    /**
     * 计算演示用的百分制总分（保留一位小数）。
     * @param {Object} fields 某一等级的表单字段
     * @param {'low'|'high'} gradeType
     * @returns {string}
     */
    function calcScalePercent(fields, gradeType) {
        const raw = parseFloat(calcScaleRawTotal(fields, gradeType)) || 0;
        const percent = Math.min(100, Math.max(0, raw / SCALE_MAX_SCORE * 100));
        return percent.toFixed(1);
    }

    // 用于“单字标注”页的识字量逐字状态；为避免伪造真实作答，数据按固定规则生成。
    function buildCharScores(count) {
        const scores = {};
        const readNotes = ['声调有误', '读音不稳定', '未读准'];
        const wordNotes = ['组词不准确', '近义词混淆', '未完成组词'];

        for (let index = 1; index <= count; index += 1) {
            let readScore = 1;
            let wordScore = 1;

            // 仅在第 2、3 个字保留错误输入示例，避免加载时页面自动滚动到列表末尾。
            if (index === 2) readScore = -1;
            else if (index % 8 === 0) readScore = 0;
            if (index === 3) wordScore = -1;
            else if (index % 10 === 0) wordScore = 0;

            scores[`q${index}_read_score`] = String(readScore);
            scores[`q${index}_read_val`] = readScore === -1 ? readNotes[index % readNotes.length] : '';
            scores[`q${index}_word_score`] = String(wordScore);
            scores[`q${index}_word_val`] = wordScore === -1 ? wordNotes[index % wordNotes.length] : '';
            scores[`q${index}_other_val`] = index % 23 === 0 ? '书写速度略慢' : '';
        }

        return scores;
    }

    function makeLowGradeData() {
        return Object.assign({
            // 一、根据题目填涂正确的选项
            '1_1_选项': 'B', '1_2_选项': 'D', '1_3_选项': 'A',
            '1_4_选项': 'A', '1_5_选项': 'B', '1_6_选项': 'NULL',
            '1_1_得分': '2', '1_2_得分': '2', '1_3_得分': '0',
            '1_4_得分': '2', '1_5_得分': '2', '1_6_得分': '0',

            // 二、看图选句
            '2_1_选项': 'C', '2_2_选项': 'A',
            '2_1_得分': '2', '2_2_得分': '2',

            // 三、书写汉字
            '3_1_得分': '3', '3_1_最终得分': '3',
            '3_1_总计字数': '12', '3_1_错字个数': '2',
            '3_1_增漏字数': '1', '3_1_请情混淆个数': '1',
            '3_2_得分': '2', '3_2_最终得分': '2',
            '3_2_总计字数': '18', '3_2_错字个数': '3',
            '3_2_提取失败': '0', '3_2_主住混淆个数': '1',

            // 四、阅读理解
            '4_1_1_选项': 'B', '4_1_1_得分': '2',
            '4_2_1_得分': '2', '4_2_1_最终得分': '2',
            '4_2_1_总计字数': '24', '4_2_1_错字个数': '3',
            '4_2_1_增漏字数': '1', '4_2_1_提取失败': '0',
            '4_2_2_选项': 'C', '4_2_2_得分': '2',
            '4_2_3_选项': 'A', '4_2_3_得分': '2',

            // 五、选词填空 / 六、连线题
            '5_得分': '4', '5_最终得分': '4',
            '5_总计字数': '15', '5_错字个数': '2', '5_增漏字数': '1',
            '6_得分': '5',

            // 汉字书写整体评判
            '汉字书写整体质量': '1',

            // 句段书写评判
            '句段书写_单字大小均匀': '0.5',
            '句段书写_行水平': '1',
            '句段书写_行倾斜': '1',
            '句段书写_字间距': '1',
            '句段书写_行间距': '0.5',
            '句段书写_左对齐': '1',
            '句段书写_无超格或超线': '0.5',
            '句段书写_文字匹配格线': '1'
        }, buildCharScores(36));
    }

    function makeHighGradeData() {
        return Object.assign({
            // 一、根据题目填涂正确的选项
            '1_1_选项': 'C', '1_2_选项': 'A', '1_3_选项': 'D',
            '1_4_选项': 'B', '1_5_选项': 'C', '1_6_选项': 'MULTI',
            '1_1_得分': '2', '1_2_得分': '2', '1_3_得分': '2',
            '1_4_得分': '2', '1_5_得分': '2', '1_6_得分': '0',

            // 二、书写汉字
            '2_1_得分': '4', '2_1_最终得分': '4',
            '2_1_总计字数': '20', '2_1_错字个数': '2',
            '2_1_增漏字数': '0', '2_1_混淆个数': '1',
            '2_2_得分': '5', '2_2_最终得分': '5',
            '2_2_总计字数': '25', '2_2_错字个数': '1', '2_2_提取失败': '0',

            // 三、连词成句
            '3_1_得分': '1.5', '3_1_最终得分': '1.5',
            '3_1_总计字数': '18', '3_1_错字个数': '2',
            '3_1_增漏字数': '1', '3_1_标点错误': '1',
            '3_2_得分': '2', '3_2_最终得分': '2',
            '3_2_总计字数': '22', '3_2_错字个数': '1',
            '3_2_增漏字数': '0', '3_2_标点错误': '0',

            // 四、阅读理解
            '4_1_1_选项': 'B', '4_1_1_得分': '2',
            '4_1_2_选项': 'C', '4_1_2_得分': '2',
            '4_2_1_选项': 'A', '4_2_1_得分': '2',
            '4_2_2_得分': '2', '4_2_2_最终得分': '2',
            '4_2_2_总计字数': '32', '4_2_2_错字个数': '2',
            '4_2_2_增漏字数': '0', '4_2_2_提取失败': '0',
            '4_2_3_选项': 'D', '4_2_3_得分': '2',

            // 五、书写（六个维度合计 5 分）
            '5_语量得分': '1', '5_卷面得分': '1', '5_相关性得分': '0.5',
            '5_篇章逻辑得分': '1', '5_语义得分': '1', '5_形式得分': '0.5',
            '5_得分': '5',
            '5_总计字数': '86', '5_句子个数': '6', '5_错字个数': '3',
            '5_增漏字数': '1', '5_提取失败': '0', '5_语法错误': '1', '5_标点错误': '2',

            // 汉字书写整体评判
            '汉字书写整体质量': '1',

            // 句段书写评判
            '句段书写_单字大小均匀': '1',
            '句段书写_行水平': '0.5',
            '句段书写_行倾斜': '1',
            '句段书写_字间距': '1',
            '句段书写_行间距': '0.5',
            '句段书写_左对齐': '1',
            '句段书写_无超格或超线': '1',
            '句段书写_文字匹配格线': '0.5'
        }, buildCharScores(45));
    }

    const studentDefinitions = [
        {
            id: '001_7d6dbcfe',
            name: '001',
            gender: '女',
            age: '8',
            grade: '二年级',
            gradeType: 'low',
            className: '二年级（1）班',
            school: 'xx公立小学',
            tester: '李老师',
            annotator: '演示员',
            testDate: '2026-04-15',
            timeTaken: '725'
        },
        {
            id: '004_ca4dccdf',
            name: '004',
            gender: '男',
            age: '9',
            grade: '三年级',
            gradeType: 'high',
            className: '三年级（2）班',
            school: 'xx公立小学',
            tester: '周老师',
            annotator: '演示员',
            testDate: '2026-04-03',
            timeTaken: '936'
        }
    ];

    function buildRecord(definition) {
        const isLow = definition.gradeType === 'low';
        const gradeData = isLow ? makeLowGradeData() : makeHighGradeData();
        const rawTotal = calcScaleRawTotal(gradeData, definition.gradeType);
        const percentTotal = calcScalePercent(gradeData, definition.gradeType);

        return {
            '姓名': definition.name,
            '性别': definition.gender,
            '年龄': definition.age,
            '民族': '汉族',
            '学校': definition.school,
            '年级': definition.grade,
            '班级': definition.className,
            '主试': definition.tester,
            '标注员': definition.annotator,
            '测试日期': definition.testDate,

            's_name': definition.name,
            's_gender': definition.gender,
            's_school': definition.school,
            's_grade': definition.grade,
            's_class': definition.className,
            's_tester': definition.tester,
            's_time': definition.timeTaken,

            'suggested_type': definition.gradeType,
            '最终得分总分': rawTotal,
            '百分制总分': percentTotal,
            'low_data': isLow ? gradeData : {},
            'high_data': isLow ? {} : gradeData
        };
    }

    // 页面左侧的“试卷页”复用已脱敏错题截图作为演示素材，所有路径均真实存在。
    const studentImages = {
        '001_7d6dbcfe': [
            '001_7d6dbcfe/句子_空间分布异常/雷声大作点燃木屋_1776247182196.png',
            '001_7d6dbcfe/单字_增添笔画/情_1776246958890.png',
            '001_7d6dbcfe/单字_字形结构错误/已_1776246908714.png',
            '001_7d6dbcfe/单字_其他错误（字）/请_1776246945720.png'
        ],
        '004_ca4dccdf': [
            '004_ca4dccdf/句子_空间分布不均/句子2_1775213329802.png',
            '004_ca4dccdf/句子_字序颠倒/句子1_1775213215020.png',
            '004_ca4dccdf/句子_空间分布不均/句子3_1775213365089.png'
        ]
    };

    // 截图管理使用的完整脱敏截图清单（相对 screenshots/ 的路径）。
    const screenshotPaths = {
        '001_7d6dbcfe': [
            '001_7d6dbcfe/单字_其他错误（字）/请_1776246945720.png',
            '001_7d6dbcfe/单字_删减笔画/请_1776246945720.png',
            '001_7d6dbcfe/单字_删减笔画/雷_1776246990317.png',
            '001_7d6dbcfe/单字_增添笔画/情_1776246958890.png',
            '001_7d6dbcfe/单字_增添笔画/雷_1776246990317.png',
            '001_7d6dbcfe/单字_字形结构错误/屋_1776247049275.png',
            '001_7d6dbcfe/单字_字形结构错误/已_1776246908714.png',
            '001_7d6dbcfe/单字_字形结构错误/点_1776247230494.png',
            '001_7d6dbcfe/单字_形近字混淆/以_1776246879757.png',
            '001_7d6dbcfe/单字_笔画镜像/已_1776246908714.png',
            '001_7d6dbcfe/单字_笔画镜像/木_1776247036430.png',
            '001_7d6dbcfe/单字_长短有误/屋_1776247049275.png',
            '001_7d6dbcfe/单字_长短有误/情_1776246958890.png',
            '001_7d6dbcfe/单字_音近字混淆/以_1776246879757.png',
            '001_7d6dbcfe/单字_音近字混淆/已_1776246908714.png',
            '001_7d6dbcfe/句子_其他错误（句子）/雷声大作点燃木屋_1776247182196.png',
            '001_7d6dbcfe/句子_增字漏字/雷声大作点燃木屋_1776247182196.png',
            '001_7d6dbcfe/句子_空间分布异常/雷声大作点燃木屋_1776247182196.png'
        ],
        '004_ca4dccdf': [
            '004_ca4dccdf/单字_删减笔画/夏_1775211937990.png',
            '004_ca4dccdf/单字_删减笔画/没_1775211670088.png',
            '004_ca4dccdf/单字_删减笔画/莓_1775212027490.png',
            '004_ca4dccdf/单字_删减笔画/西_1775211722357.png',
            '004_ca4dccdf/单字_删减笔画/部_1775211355716.png',
            '004_ca4dccdf/单字_增添笔画/冰_1775211993290.png',
            '004_ca4dccdf/单字_增添笔画/味_1775212060821.png',
            '004_ca4dccdf/单字_字形结构错误/东_1775211645320.png',
            '004_ca4dccdf/单字_字形结构错误/倍_1775211293970.png',
            '004_ca4dccdf/单字_字形结构错误/冰_1775211993290.png',
            '004_ca4dccdf/单字_字形结构错误/培_1775211274078.png',
            '004_ca4dccdf/单字_字形结构错误/有_1775211706774.png',
            '004_ca4dccdf/单字_字形结构错误/没_1775211670088.png',
            '004_ca4dccdf/单字_字形结构错误/激_1775212007177.png',
            '004_ca4dccdf/单字_字形结构错误/能_1775211964607.png',
            '004_ca4dccdf/单字_字形结构错误/莓_1775212027490.png',
            '004_ca4dccdf/单字_字形结构错误/赔_1775211335178.png',
            '004_ca4dccdf/单字_字形结构错误/部_1775211355716.png',
            '004_ca4dccdf/单字_字形结构错误/陪_1775211254131.png',
            '004_ca4dccdf/单字_形近字混淆/倍_1775211293970.png',
            '004_ca4dccdf/单字_形近字混淆/培_1775211274078.png',
            '004_ca4dccdf/单字_形近字混淆/部_1775211355716.png',
            '004_ca4dccdf/单字_形近字混淆/陪_1775211254131.png',
            '004_ca4dccdf/单字_断笔不当/东_1775211645320.png',
            '004_ca4dccdf/单字_断笔不当/倍_1775211293970.png',
            '004_ca4dccdf/单字_断笔不当/味_1775212048150.png',
            '004_ca4dccdf/单字_断笔不当/味_1775212060821.png',
            '004_ca4dccdf/单字_断笔不当/果_1775212075238.png',
            '004_ca4dccdf/单字_断笔不当/部_1775211355716.png',
            '004_ca4dccdf/单字_断笔不当/陪_1775211254131.png',
            '004_ca4dccdf/单字_笔画粘连/东_1775211645320.png',
            '004_ca4dccdf/单字_笔画粘连/倍_1775211293970.png',
            '004_ca4dccdf/单字_笔画粘连/味_1775212048150.png',
            '004_ca4dccdf/单字_笔画粘连/味_1775212060821.png',
            '004_ca4dccdf/单字_笔画粘连/因_1775211948456.png',
            '004_ca4dccdf/单字_笔画粘连/培_1775211274078.png',
            '004_ca4dccdf/单字_笔画粘连/夏_1775211937990.png',
            '004_ca4dccdf/单字_笔画粘连/有_1775211706774.png',
            '004_ca4dccdf/单字_笔画粘连/果_1775212075238.png',
            '004_ca4dccdf/单字_笔画粘连/没_1775211670088.png',
            '004_ca4dccdf/单字_笔画粘连/清_1775211410707.png',
            '004_ca4dccdf/单字_笔画粘连/激_1775212007177.png',
            '004_ca4dccdf/单字_笔画粘连/能_1775211964607.png',
            '004_ca4dccdf/单字_笔画粘连/莓_1775212027490.png',
            '004_ca4dccdf/单字_笔画粘连/西_1775211722357.png',
            '004_ca4dccdf/单字_笔画粘连/赔_1775211335178.png',
            '004_ca4dccdf/单字_笔画粘连/部_1775211355716.png',
            '004_ca4dccdf/单字_笔画粘连/陪_1775211254131.png',
            '004_ca4dccdf/单字_部件分离/倍_1775211293970.png',
            '004_ca4dccdf/单字_部件分离/冰_1775211993290.png',
            '004_ca4dccdf/单字_部件分离/味_1775212048150.png',
            '004_ca4dccdf/单字_部件分离/味_1775212060821.png',
            '004_ca4dccdf/单字_部件分离/清_1775211410707.png',
            '004_ca4dccdf/单字_部件分离/激_1775212007177.png',
            '004_ca4dccdf/单字_部件分离/能_1775211964607.png',
            '004_ca4dccdf/单字_部件分离/赔_1775211335178.png',
            '004_ca4dccdf/单字_部件分离/部_1775211355716.png',
            '004_ca4dccdf/单字_长短有误/东_1775211645320.png',
            '004_ca4dccdf/单字_长短有误/倍_1775211293970.png',
            '004_ca4dccdf/单字_长短有误/冰_1775211993290.png',
            '004_ca4dccdf/单字_长短有误/味_1775212048150.png',
            '004_ca4dccdf/单字_长短有误/味_1775212060821.png',
            '004_ca4dccdf/单字_长短有误/因_1775211948456.png',
            '004_ca4dccdf/单字_长短有误/培_1775211274078.png',
            '004_ca4dccdf/单字_长短有误/有_1775211706774.png',
            '004_ca4dccdf/单字_长短有误/果_1775212075238.png',
            '004_ca4dccdf/单字_长短有误/清_1775211410707.png',
            '004_ca4dccdf/单字_长短有误/能_1775211964607.png',
            '004_ca4dccdf/单字_长短有误/赔_1775211335178.png',
            '004_ca4dccdf/单字_长短有误/部_1775211355716.png',
            '004_ca4dccdf/单字_长短有误/陪_1775211254131.png',
            '004_ca4dccdf/单字_顺序颠倒/夏_1775211937990.png',
            '004_ca4dccdf/句子_字序颠倒/句子1_1775213215020.png',
            '004_ca4dccdf/句子_空间分布不均/句子2_1775213329802.png',
            '004_ca4dccdf/句子_空间分布不均/句子3_1775213365089.png'
        ]
    };

    const records = {};
    studentDefinitions.forEach(function (definition) {
        records[definition.id] = buildRecord(definition);
    });

    window.SCALEMARK_DEMO_DATA = {
        students: studentDefinitions.map(function (definition) {
            return { id: definition.id, name: definition.name };
        }),
        records: records,
        images: studentImages,
        screenshots: screenshotPaths,
        calcScaleRawTotal: calcScaleRawTotal,
        calcScalePercent: calcScalePercent
    };
})();
