/*!
 * ScaleMark 静态演示 · 本地数据层
 * ------------------------------------------------------------
 * 在 marking.js / 识字量页面脚本之前加载，接管页面发出的全部后端请求：
 *   - 学生列表、学生数据、截图管理均由本地虚构数据提供；
 *   - 标注结果与新增截图保存在浏览器 localStorage；
 *   - 导出接口返回在浏览器内生成的 JSON，不访问任何服务器。
 * 本文件不修改原页面样式，也不发送真实网络请求。
 */
(function () {
    'use strict';

    const DEMO_DATA = window.SCALEMARK_DEMO_DATA;
    if (!DEMO_DATA) {
        console.error('演示数据未加载：请先引入 js/mock-data.js');
        return;
    }

    const STORAGE_KEY = 'scalemark_static_demo_v1';
    const DEFAULT_FOLDER_STATE = { added: [], hidden: [], hiddenPaths: [] };
    const META_KEYS = new Set([
        'folder', 'task', 'type', 'grade_type', 'name', 'gender', 'age', 'nation',
        'school', 'grade', 'class_name', 'date', 'tester', 'annotator',
        'time_taken', 'total'
    ]);

    const nativeFetch = typeof window.fetch === 'function' ? window.fetch.bind(window) : null;
    let state = loadState();
    const seedCache = {};

    // ================= 本地存储 =================

    function emptyState() {
        return { version: 1, records: {}, screenshots: {} };
    }

    function loadState() {
        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (!raw) return emptyState();
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') return emptyState();
            return {
                version: 1,
                records: parsed.records && typeof parsed.records === 'object' ? parsed.records : {},
                screenshots: parsed.screenshots && typeof parsed.screenshots === 'object' ? parsed.screenshots : {}
            };
        } catch (error) {
            console.warn('演示数据读取失败，将使用初始样例：', error);
            return emptyState();
        }
    }

    function persistState() {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            return true;
        } catch (error) {
            console.warn('演示数据写入 localStorage 失败：', error);
            return false;
        }
    }

    function clone(value) {
        return value === undefined ? value : JSON.parse(JSON.stringify(value));
    }

    function getFolderState(folder) {
        if (!state.screenshots[folder]) {
            state.screenshots[folder] = clone(DEFAULT_FOLDER_STATE);
        }
        const folderState = state.screenshots[folder];
        folderState.added = Array.isArray(folderState.added) ? folderState.added : [];
        folderState.hidden = Array.isArray(folderState.hidden) ? folderState.hidden : [];
        folderState.hiddenPaths = Array.isArray(folderState.hiddenPaths) ? folderState.hiddenPaths : [];
        return folderState;
    }

    // ================= 图片路径解析 =================

    /**
     * 把数据中的相对路径转换为页面可访问的 URL。
     * 种子截图位于 ../screenshots/；演示现场新增的截图是 data URL，原样返回。
     */
    function imageUrl(relPath) {
        if (!relPath) return '';
        if (/^(?:data:|blob:|https?:)/i.test(relPath)) return relPath;

        const cleanPath = String(relPath).replace(/^\.?\//, '');
        return '../screenshots/' + cleanPath.split('/').map(encodeURIComponent).join('/');
    }

    // ================= 记录读写 =================

    function mergeRecord(base, saved) {
        const result = Object.assign({}, base, saved || {});
        ['low', 'high'].forEach(function (type) {
            const key = type + '_data';
            const baseData = base && base[key] ? base[key] : {};
            const savedData = saved && saved[key] ? saved[key] : {};
            result[key] = Object.assign({}, baseData, savedData);
        });
        return result;
    }

    function getRecord(folder) {
        const base = DEMO_DATA.records[folder];
        if (!base) return null;
        return mergeRecord(clone(base), state.records[folder]);
    }

    function toStoredValue(value) {
        if (value === null || value === undefined) return '';
        return value;
    }

    function saveRecord(payload) {
        const folder = payload.folder;
        if (!folder || !DEMO_DATA.records[folder]) {
            return { status: 'error', message: '演示数据中不存在该学生' };
        }

        const current = getRecord(folder);
        const gradeType = payload.grade_type === 'high' ? 'high' : 'low';
        const dataKey = gradeType + '_data';
        const target = current[dataKey] || {};
        const otherKey = gradeType === 'low' ? 'high_data' : 'low_data';

        Object.keys(payload).forEach(function (key) {
            if (!META_KEYS.has(key)) target[key] = toStoredValue(payload[key]);
        });
        current[dataKey] = target;
        current[otherKey] = current[otherKey] || {};

        if (payload.name !== undefined) current['姓名'] = payload.name;
        if (payload.gender !== undefined) current['性别'] = payload.gender;
        if (payload.age !== undefined) current['年龄'] = payload.age;
        if (payload.nation !== undefined) current['民族'] = payload.nation;
        if (payload.school !== undefined) current['学校'] = payload.school;
        if (payload.grade !== undefined) current['年级'] = payload.grade;
        if (payload.class_name !== undefined) current['班级'] = payload.class_name;
        if (payload.date !== undefined) current['测试日期'] = payload.date;
        if (payload.tester !== undefined) current['主试'] = payload.tester;
        if (payload.annotator !== undefined) current['标注员'] = payload.annotator;

        current['s_name'] = payload.name !== undefined ? payload.name : current['s_name'];
        current['s_gender'] = payload.gender !== undefined ? payload.gender : current['s_gender'];
        current['s_school'] = payload.school !== undefined ? payload.school : current['s_school'];
        current['s_grade'] = payload.grade !== undefined ? payload.grade : current['s_grade'];
        current['s_class'] = payload.class_name !== undefined ? payload.class_name : current['s_class'];
        current['s_tester'] = payload.tester !== undefined ? payload.tester : current['s_tester'];

        if (payload.time_taken !== undefined) current['s_time'] = String(payload.time_taken);
        if (payload.task === 'char' && payload.total !== undefined) current['识字量结果'] = payload.total;

        current['suggested_type'] = gradeType;
        current['最终得分总分'] = DEMO_DATA.calcScaleRawTotal(target, gradeType);
        current['百分制总分'] = DEMO_DATA.calcScalePercent(target, gradeType);
        state.records[folder] = current;

        if (!persistState()) {
            return { status: 'error', message: '浏览器本地存储不可用，本次数据未保存' };
        }
        return { status: 'success' };
    }

    // ================= 截图列表 =================

    function padNumber(value) {
        return String(value).padStart(2, '0');
    }

    function formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        if (Number.isNaN(date.getTime())) return '';
        return date.getFullYear() + '-' + padNumber(date.getMonth() + 1) + '-' + padNumber(date.getDate()) +
            ' ' + padNumber(date.getHours()) + ':' + padNumber(date.getMinutes());
    }

    function timestampFromFilename(filename) {
        const match = /_(\d{13})\.(?:png|jpe?g|webp)$/i.exec(filename || '');
        return match ? parseInt(match[1], 10) : 0;
    }

    function stripExtension(filename) {
        return String(filename || '').replace(/\.[^.]+$/, '');
    }

    function buildSeedScreenshots(folder) {
        if (seedCache[folder]) return clone(seedCache[folder]);

        const grouped = new Map();
        (DEMO_DATA.screenshots[folder] || []).forEach(function (relPath) {
            const parts = String(relPath).split('/');
            const filename = parts[parts.length - 1] || '';
            const category = parts.length >= 2 ? parts[parts.length - 2] : '未分类';
            if (!grouped.has(filename)) {
                grouped.set(filename, {
                    capture_id: 'seed_' + stripExtension(filename),
                    filename: filename,
                    display_name: stripExtension(filename),
                    created_at: formatTimestamp(timestampFromFilename(filename)),
                    previewPath: relPath,
                    categories: []
                });
            }
            grouped.get(filename).categories.push({
                category: category,
                filename: filename,
                path: relPath
            });
        });

        seedCache[folder] = Array.from(grouped.values());
        return clone(seedCache[folder]);
    }

    function getScreenshots(folder) {
        if (!DEMO_DATA.records[folder]) return [];
        const folderState = getFolderState(folder);
        const hidden = new Set(folderState.hidden);
        const hiddenPaths = new Set(folderState.hiddenPaths);

        const added = folderState.added.filter(function (item) {
            return !hidden.has(item.capture_id);
        }).map(function (item) {
            return clone(item);
        });

        const seeds = buildSeedScreenshots(folder).filter(function (item) {
            if (hidden.has(item.capture_id)) return false;
            return !(item.categories || []).every(function (category) {
                return hiddenPaths.has(category.path);
            });
        });

        return added.concat(seeds);
    }

    function safeLabel(text, fallback) {
        const cleaned = String(text || '').replace(/[<>"'&]/g, '').trim();
        return cleaned || fallback;
    }

    function compressImage(dataUrl) {
        return new Promise(function (resolve) {
            if (!dataUrl || !/^data:image\//.test(dataUrl)) {
                resolve(dataUrl || '');
                return;
            }

            const image = new Image();
            image.onload = function () {
                const maxSide = 1400;
                const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
                const width = Math.max(1, Math.round(image.naturalWidth * scale));
                const height = Math.max(1, Math.round(image.naturalHeight * scale));
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const context = canvas.getContext('2d');
                if (!context) {
                    resolve(dataUrl);
                    return;
                }
                context.fillStyle = '#ffffff';
                context.fillRect(0, 0, width, height);
                context.drawImage(image, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.82));
            };
            image.onerror = function () { resolve(dataUrl); };
            image.src = dataUrl;
        });
    }

    async function addScreenshot(payload) {
        const folder = payload.folder;
        if (!folder || !DEMO_DATA.records[folder]) {
            return { status: 'error', message: '演示数据中不存在该学生' };
        }

        const categories = Array.isArray(payload.categories) ? payload.categories : [];
        if (!payload.image || categories.length === 0) {
            return { status: 'error', message: '截图数据不完整' };
        }

        const now = new Date();
        const stamp = now.getTime();
        const randomPart = Math.random().toString(36).slice(2, 7);
        const captureId = 'local_' + stamp + '_' + randomPart;
        const charLabel = safeLabel(payload.correct_text, '错题');
        const filename = '演示截图_' + charLabel + '_' + stamp + '.png';
        const compressed = await compressImage(payload.image);

        const categoryItems = categories.map(function (category) {
            return { category: safeLabel(category, '未分类'), filename: filename };
        });

        const item = {
            capture_id: captureId,
            filename: filename,
            display_name: '演示截图_' + charLabel + '_' + formatTimestamp(stamp).slice(11).replace(':', ''),
            created_at: formatTimestamp(stamp),
            previewPath: compressed,
            categories: categoryItems
        };

        const folderState = getFolderState(folder);
        folderState.added.unshift(item);
        if (!persistState()) {
            folderState.added.shift();
            return { status: 'error', message: '浏览器本地存储空间不足，截图未保存' };
        }
        return { status: 'success' };
    }

    function deleteScreenshot(payload) {
        const folder = payload.folder;
        if (!folder || !DEMO_DATA.records[folder]) {
            return { status: 'error', message: '演示数据中不存在该学生' };
        }

        const captureId = payload.capture_id || '';
        const targetPath = payload.path || '';
        const folderState = getFolderState(folder);

        const addedIndex = folderState.added.findIndex(function (item) {
            if (captureId && item.capture_id === captureId) return true;
            return Boolean(targetPath) && item.previewPath === targetPath;
        });
        if (addedIndex >= 0) {
            folderState.added.splice(addedIndex, 1);
        } else {
            const seeds = buildSeedScreenshots(folder);
            const matchedSeed = seeds.find(function (item) {
                if (captureId && item.capture_id === captureId) return true;
                return Boolean(targetPath) && (item.categories || []).some(function (category) {
                    return category.path === targetPath;
                });
            });
            if (matchedSeed) {
                if (!folderState.hidden.includes(matchedSeed.capture_id)) {
                    folderState.hidden.push(matchedSeed.capture_id);
                }
                (matchedSeed.categories || []).forEach(function (category) {
                    if (!folderState.hiddenPaths.includes(category.path)) {
                        folderState.hiddenPaths.push(category.path);
                    }
                });
            }
        }

        if (!persistState()) {
            return { status: 'error', message: '浏览器本地存储不可用，删除结果未写入' };
        }
        return { status: 'success' };
    }

    // ================= 导出（降级为浏览器内 JSON） =================

    function jsonDownloadResponse(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], {
            type: 'application/json;charset=utf-8'
        });
        const headers = {
            'Content-Type': 'application/json;charset=utf-8',
            'Content-Disposition': 'attachment; filename="demo-export.json"; filename*=UTF-8\'\'' +
                encodeURIComponent(filename)
        };
        return new Response(blob, { status: 200, headers: headers });
    }

    function exportRecords() {
        const records = {};
        DEMO_DATA.students.forEach(function (student) {
            records[student.id] = getRecord(student.id);
        });
        return {
            demo: true,
            note: '静态演示页导出：数据来自当前浏览器中的本地样例，不代表真实测评结果。',
            exported_at: new Date().toISOString(),
            students: clone(DEMO_DATA.students),
            records: records
        };
    }

    function exportScreenshots() {
        const folders = {};
        DEMO_DATA.students.forEach(function (student) {
            folders[student.id] = getScreenshots(student.id);
        });
        return {
            demo: true,
            note: '静态演示页导出：种子截图是已脱敏样例；新增截图是当前浏览器内生成的本地内容。',
            exported_at: new Date().toISOString(),
            folders: folders
        };
    }

    // ================= fetch 路由 =================

    function jsonResponse(data, status) {
        return new Response(JSON.stringify(data), {
            status: status || 200,
            headers: { 'Content-Type': 'application/json;charset=utf-8' }
        });
    }

    function notFound(message) {
        return jsonResponse({ status: 'error', message: message || '演示模式未提供该接口' }, 404);
    }

    function readRequestBody(input, init) {
        if (init && typeof init.body === 'string') return init.body;
        if (input && typeof input !== 'string' && typeof input.text === 'function') {
            return input.clone().text();
        }
        return Promise.resolve('');
    }

    function parseJsonBody(text) {
        try {
            return JSON.parse(text || '{}');
        } catch (error) {
            return null;
        }
    }

    async function demoFetch(input, init) {
        const requestUrl = typeof input === 'string' ? input : (input && input.url) || '';
        let url;
        try {
            url = new URL(requestUrl, window.location.href);
        } catch (error) {
            return notFound('无法解析演示请求地址');
        }

        const path = url.pathname;
        const method = (
            (init && init.method) ||
            (input && typeof input !== 'string' && input.method) ||
            'GET'
        ).toUpperCase();

        if (method === 'GET' && path.endsWith('/api/students')) {
            return jsonResponse(clone(DEMO_DATA.students));
        }

        if (method === 'GET' && path.endsWith('/api/student_data')) {
            const folder = url.searchParams.get('folder') || '';
            const record = getRecord(folder);
            if (!record) return notFound('演示数据中不存在该学生');
            return jsonResponse({
                images: clone(DEMO_DATA.images[folder] || []),
                record: record
            });
        }

        if (method === 'GET' && path.endsWith('/api/screenshots')) {
            const folder = url.searchParams.get('folder') || '';
            if (!DEMO_DATA.records[folder]) return notFound('演示数据中不存在该学生');
            return jsonResponse({
                status: 'success',
                screenshots: getScreenshots(folder)
            });
        }

        if (method === 'POST' && path.endsWith('/save')) {
            const payload = parseJsonBody(await readRequestBody(input, init));
            if (!payload) return jsonResponse({ status: 'error', message: '请求数据格式错误' }, 400);
            return jsonResponse(saveRecord(payload));
        }

        if (method === 'POST' && path.endsWith('/api/save_screenshot')) {
            const payload = parseJsonBody(await readRequestBody(input, init));
            if (!payload) return jsonResponse({ status: 'error', message: '请求数据格式错误' }, 400);
            return jsonResponse(await addScreenshot(payload));
        }

        if (method === 'POST' && path.endsWith('/api/delete_screenshot')) {
            const payload = parseJsonBody(await readRequestBody(input, init));
            if (!payload) return jsonResponse({ status: 'error', message: '请求数据格式错误' }, 400);
            return jsonResponse(deleteScreenshot(payload));
        }

        if (method === 'GET' && path.endsWith('/api/download_all_screenshots')) {
            return jsonDownloadResponse(exportScreenshots(), '截图清单_演示模式.json');
        }

        if (method === 'GET' && path.endsWith('/api/export_excel')) {
            return jsonDownloadResponse(exportRecords(), '量表成绩汇总_演示模式.json');
        }

        // 演示页不保留任何真实后端入口，未实现的接口一律在本地返回。
        if (path.includes('/api/') || path.endsWith('/save')) {
            return notFound('演示模式暂未提供该接口');
        }

        if (nativeFetch) return nativeFetch(input, init);
        throw new Error('当前浏览器不支持 fetch');
    }

    // 对外暴露给页面的工具：图片路径解析与演示接口地址。
    window.SCALEMARK_DEMO = {
        imageUrl: imageUrl,
        endpoint: function (name) {
            if (name === 'save') return '/save';
            return '/api/' + name;
        },
        version: '1.0.0'
    };
    window.SCALEMARK_DEMO_MODE = true;
    window.fetch = demoFetch;

    console.info('ScaleMark 静态演示模式已启用：所有接口由浏览器本地 mock 提供。');
})();
