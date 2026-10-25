
// ================= 全局状态 =================
const APP_STATE = {
    students: [],
    currentIdx: 0,
    images: [],
    imgIdx: 0,
    currentStudentData: null,
    currentGradeType: 'low',
    lastDateCache: null,
    isNavigating: false,
    isDirty: false,
    searchIndex: [],
    isIndexing: false,
    screenshotFilter: '',
    screenshotItems: [],
    rightPanelView: 'score'
};

// 演示接口地址统一由 mock 层生成，页面代码不再保存真实后端地址。
const demoEndpoint = (name) => window.SCALEMARK_DEMO.endpoint(name);

function switchRightPanel(view) {
    const scoreBtn = document.getElementById('right-panel-score-btn');
    const shotBtn = document.getElementById('right-panel-shot-btn');
    const scorePane = document.getElementById('marking-main-area');
    const shotPane = document.getElementById('screenshot-management');
    const footer = document.getElementById('right-panel-footer');

    const showScore = view === 'score';
    APP_STATE.rightPanelView = showScore ? 'score' : 'screenshot';

    if (scorePane) scorePane.classList.toggle('active', showScore);
    if (shotPane) shotPane.classList.toggle('active', !showScore);

    if (scoreBtn) {
        scoreBtn.classList.toggle('active', showScore);
        scoreBtn.classList.toggle('btn-green', showScore);
        scoreBtn.classList.toggle('btn-gray', !showScore);
    }
    if (shotBtn) {
        shotBtn.classList.toggle('active', !showScore);
        shotBtn.classList.toggle('btn-green', !showScore);
        shotBtn.classList.toggle('btn-gray', showScore);
    }
    if (footer) {
        footer.style.display = showScore ? 'block' : 'none';
    }

    if (!showScore) {
        APP_STATE.screenshotFilter = document.getElementById('screenshot-filter') ? document.getElementById('screenshot-filter').value : '';
        loadStudentScreenshots();
    } else {
        if (document.getElementById('screenshot-filter')) {
            document.getElementById('screenshot-filter').value = APP_STATE.screenshotFilter;
        }
    }
}

// ================= 初始化 =================
// ================= 初始化 =================
window.onload = async function () {
    try {
        const r = await fetch(demoEndpoint('students'));
        const data = await r.json();

        // The server now returns: [{id: '...', name: '...'}, ...]
        if (data.length > 0) {
            // 1. Maintain backward compatibility for the rest of your JS 
            // by mapping just the IDs into the APP_STATE.students array
            APP_STATE.students = data.map(item => item.id);

            // 2. Build the search index instantly! Zero extra API calls.
            APP_STATE.searchIndex = data.map((item, idx) => ({
                index: idx,
                id: item.id,
                name: item.name
            }));

            let targetIdx = parseInt(localStorage.getItem('last_student_index')) || 0;
            if (targetIdx < 0 || targetIdx >= APP_STATE.students.length) targetIdx = 0;

            loadStudent(targetIdx);
            switchRightPanel('score');
        } else {
            document.getElementById('stu-jump-input').value = 0;
            document.getElementById('stu-total-count').innerText = `/ 0`;
        }
    } catch (e) {
        console.error("加载学生列表失败", e);
    }
};

// ================= 状态与版本自动切换 =================
function autoSwitchVersion() {
    const grade = document.getElementById('s_grade').value;
    let type = 'high';
    if (grade && (grade.includes('一') || grade.includes('二') || grade.includes('1') || grade.includes('2')) && !grade.includes('十')) { type = 'low'; }
    APP_STATE.currentGradeType = type;
    document.getElementById('panel-low').classList.toggle('active', type === 'low');
    document.getElementById('panel-high').classList.toggle('active', type === 'high');
}

// ================= 数据加载与保存 =================
async function loadStudent(index) {
    if (index < 0 || index >= APP_STATE.students.length) return;
    localStorage.setItem('last_student_index', index);
    APP_STATE.currentIdx = index;
    APP_STATE.isDirty = false;
    const uid = APP_STATE.students[index];

    document.getElementById('s_id').value = uid;
    document.getElementById('stu-jump-input').value = index + 1;
    document.getElementById('stu-total-count').innerText = `/ ${APP_STATE.students.length}`;
    resetForm();

    try {
        const response = await fetch(`${demoEndpoint('student_data')}?folder=${uid}`);
        const data = await response.json();

        APP_STATE.images = data.images || []; APP_STATE.imgIdx = 0; updateImage();
        if (data.record) {
            APP_STATE.currentStudentData = data.record;
            populateStudentForm(data.record);
        } else {
            APP_STATE.currentStudentData = null; applyDefaultDate();
            document.getElementById('s_grade').value = ""; autoSwitchVersion();
        }
        await loadStudentScreenshots(uid);
    } catch (err) {
        console.error("加载新学生数据失败:", err);
    }
}

// 图片统一交给演示层解析：种子截图读取同级 screenshots 目录，现场截图使用 data URL。
function getScreenshotUrl(relPath) {
    return window.SCALEMARK_DEMO.imageUrl(relPath);
}

function getCaptureLabel(item) {
    return item.display_name || item.filename || item.capture_id || '截图';
}

function renderScreenshotList() {
    const listWrap = document.getElementById('screenshot-list');
    const filterInput = document.getElementById('screenshot-filter');
    const q = (filterInput ? filterInput.value : '').trim().toLowerCase();
    APP_STATE.screenshotFilter = q;
    const items = (APP_STATE.screenshotItems || []);

    let html = '';
    const filtered = items.filter(item => {
        const typeText = (item.categories || [])
            .map(cat => cat.category || '')
            .join(' ')
            .toLowerCase();
        const keys = `${item.filename || ''} ${item.display_name || ''} ${typeText}`.toLowerCase();
        return !q || keys.includes(q);
    });

    if (filtered.length === 0) {
        html = '<div class="screenshot-empty">暂无截图</div>';
    } else {
        filtered.forEach(item => {
            const categories = item.categories || [];
            const previewPath = item.previewPath || (categories[0] ? categories[0].path : '');
            const safePath = encodeURIComponent(previewPath);
            const safeCaptureId = encodeURIComponent(item.capture_id || item.filename || '');
            const categoryBadges = categories
                .map(cat => `<span class=\"screenshot-category-tag\">${cat.category}</span>`)
                .join('');
            const url = getScreenshotUrl(previewPath);
            const displayName = getCaptureLabel(item);
            html += `<div class=\"screenshot-item\">\n`;
            html += `  <div class=\"screenshot-thumb-wrap\" onclick=\"openScreenshotPreview('${safePath}')\">\n`;
            html += `    <img class=\"screenshot-thumb\" src=\"${url}\" alt=\"${displayName}\" onerror=\"this.style.display='none'; this.nextElementSibling.style.display='flex';\">\n`;
            html += `    <span class=\"screenshot-thumb-empty\">预览</span>`;
            html += `  </div>`;
            html += `  <div class=\"screenshot-item-body\">`;
            html += `<span class=\"screenshot-name\">${displayName}</span>`;
            html += `<div class=\"screenshot-categories\">${categoryBadges}</div>`;
            html += `</div>`;
            html += `  <div class=\"screenshot-actions\">`;
            html += `    <button class=\"btn btn-danger\" onclick=\"deleteScreenshot('${safeCaptureId}', '${safePath}')\">删除</button>`;
            html += `  </div>`;
            html += `</div>`;
        });
    }
    listWrap.innerHTML = html;
}

async function loadStudentScreenshots() {
    if (!APP_STATE.students.length) {
        APP_STATE.screenshotItems = [];
        renderScreenshotList();
        return;
    }
    const uid = APP_STATE.students[APP_STATE.currentIdx];
    const listWrap = document.getElementById('screenshot-list');
    listWrap.innerHTML = '<div class=\"screenshot-empty\">加载中...</div>';
    try {
        const r = await fetch(`${demoEndpoint('screenshots')}?folder=${encodeURIComponent(uid)}`);
        const data = await r.json();
        APP_STATE.screenshotItems = data.screenshots || [];
        renderScreenshotList();
    } catch (err) {
        listWrap.innerHTML = '<div class=\"screenshot-empty\">加载失败</div>';
    }
}

function openScreenshotPreview(encodedPath) {
    const relPath = decodeURIComponent(encodedPath || '');
    const overlay = document.getElementById('screenshot-preview-overlay');
    const preview = document.getElementById('screenshot-preview-img');
    if (!overlay || !preview || !relPath) return;

    preview.src = getScreenshotUrl(relPath);
    overlay.style.display = 'flex';
}

function closeScreenshotPreview() {
    const overlay = document.getElementById('screenshot-preview-overlay');
    const preview = document.getElementById('screenshot-preview-img');
    if (overlay) overlay.style.display = 'none';
    if (preview) preview.src = '';
}

const screenshotPreviewOverlay = document.getElementById('screenshot-preview-overlay');
if (screenshotPreviewOverlay) {
    screenshotPreviewOverlay.addEventListener('click', (e) => {
        if (e.target === screenshotPreviewOverlay) {
            closeScreenshotPreview();
        }
    });
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeScreenshotPreview();
    }
});

function downloadScreenshot(encodedPath) {
    const relPath = decodeURIComponent(encodedPath || '');
    if (!relPath) return;

    const a = document.createElement('a');
    const resolvedUrl = getScreenshotUrl(relPath);
    a.href = /^(?:data:|blob:)/i.test(resolvedUrl) ? resolvedUrl : `${resolvedUrl}?download=1`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

async function downloadAllScreenshots(btn) {
    const originalText = btn && btn.innerText ? btn.innerText : '';
    if (btn) {
        btn.disabled = true;
        btn.innerText = '打包下载中...';
    }

    try {
        const r = await fetch(demoEndpoint('download_all_screenshots'));

        if (!r.ok) {
            let message = '下载失败';
            const text = await r.text();
            try {
                const parsed = JSON.parse(text);
                if (parsed && parsed.message) message = parsed.message;
            } catch (_) {
                if (text) message = text;
            }
            alert(message);
            return;
        }

        const blob = await r.blob();
        const a = document.createElement('a');
        const cd = r.headers.get('Content-Disposition') || '';
        let filename = 'screenshots.zip';
        const fnMatch = cd.match(/filename\*=UTF-8''([^;\n\r]+)|filename="?([^";]+)"?/i);
        if (fnMatch) {
            filename = decodeURIComponent(fnMatch[1] || fnMatch[2] || filename);
        }
        a.href = window.URL.createObjectURL(blob);
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(a.href);
    } catch (err) {
        alert('下载失败');
    } finally {
        if (btn) {
            btn.innerText = originalText || '下载全部截图';
            btn.disabled = false;
        }
    }
}

async function deleteScreenshot(captureId, encodedPath = '') {
    const folder = APP_STATE.students[APP_STATE.currentIdx];
    const relPath = decodeURIComponent(encodedPath || '');
    const targetCaptureId = decodeURIComponent(captureId || '');
    if (!targetCaptureId && !relPath) return;
    if (!confirm(`确认删除该截图及其全部错误分类吗？`)) return;

    try {
        const r = await fetch(demoEndpoint('delete_screenshot'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                folder: folder,
                capture_id: targetCaptureId,
                path: relPath
            })
        });
        const data = await r.json();
        if (data.status === 'success') {
            await loadStudentScreenshots();
        } else {
            alert('删除失败：' + data.message);
        }
    } catch (err) {
        alert('删除失败');
    }
}

function populateStudentForm(r) {
    document.getElementById('s_name').value = r['姓名'] || '';
    document.getElementById('s_school').value = r['学校'] || '';
    document.getElementById('s_class').value = r['班级'] || '';
    document.getElementById('s_tester').value = r['主试'] || '';
    document.getElementById('s_gender').value = r['性别'] || '';
    document.getElementById('s_age').value = r['年龄'] || '';
    document.getElementById('s_nation').value = r['民族'] || '';
    document.getElementById('s_annotator').value = r['标注员'] || '';
    // Safely grab the score whether the backend calls it '总分' (from Excel) or '最终得分总分'
    let totalScore = r['最终得分总分'] !== undefined ? r['最终得分总分'] : r['总分'];
    document.getElementById('s_total').value = (totalScore !== undefined && totalScore !== '') ? totalScore + ' 分' : ''; let gradeVal = r['年级'] || '';
    const s = String(gradeVal);
    if ((s.includes('1') || s.includes('一')) && !s.includes('十')) gradeVal = '一年级';
    else if ((s.includes('2') || s.includes('二')) && !s.includes('十')) gradeVal = '二年级';
    else if (s.includes('3') || s.includes('三')) gradeVal = '三年级';
    else if (s.includes('4') || s.includes('四')) gradeVal = '四年级';
    else if (s.includes('5') || s.includes('五')) gradeVal = '五年级';
    else if (s.includes('6') || s.includes('六')) gradeVal = '六年级';
    document.getElementById('s_grade').value = gradeVal;

    parseAndSetDate(r['测试日期']);
    autoSwitchVersion();
    fillScores(r, APP_STATE.currentGradeType);
}

function fillScores(r, type) {
    const formId = type === 'low' ? 'form-low' : 'form-high';
    const form = document.getElementById(formId);
    const sourceData = (type === 'low') ? r.low_data : r.high_data;

    if (!sourceData) return;

    // 1. 遍历并填充后台传回来的数据
    form.querySelectorAll('input').forEach(input => {
        const val = sourceData[input.name];
        if (val !== undefined && val !== null && val !== "") {
            if (input.type === 'radio') {

                if (input.value == val) input.checked = true;
            } else {
                input.value = val;
            }
        }
    });

    // ==========================================
    // 回显机制
    // 数据填充完毕后，如果是高年级，强制调用一次自动算分函数，更新红色的UI最终得分总分
    // ==========================================
    if (type === 'high' && typeof calcH5 === 'function') {
        calcH5();
    }
}

function parseAndSetDate(rawDate) {
    if (rawDate && rawDate !== 'None') {
        const parts = rawDate.split(' ')[0].split('-');
        if (parts.length >= 3) {
            document.getElementById('s_date_year').value = parts[0]; document.getElementById('s_date_month').value = parseInt(parts[1]); document.getElementById('s_date_day').value = parseInt(parts[2]);
            APP_STATE.lastDateCache = { y: parts[0], m: parseInt(parts[1]), d: parseInt(parts[2]) }; return;
        }
    }
    applyDefaultDate();
}

function applyDefaultDate() {
    if (APP_STATE.lastDateCache) { document.getElementById('s_date_year').value = APP_STATE.lastDateCache.y; document.getElementById('s_date_month').value = APP_STATE.lastDateCache.m; document.getElementById('s_date_day').value = APP_STATE.lastDateCache.d; }
    else { const now = new Date(); document.getElementById('s_date_year').value = now.getFullYear(); document.getElementById('s_date_month').value = now.getMonth() + 1; document.getElementById('s_date_day').value = now.getDate(); }
}

function resetForm() {
    document.querySelectorAll('input[type="radio"]').forEach(r => r.checked = false);
    document.querySelectorAll('input[type="number"], input[type="text"]').forEach(n => {
        if (n.id !== 's_id' && n.id !== 'stu-jump-input') n.value = '';
    });
    document.getElementById('s_total').value = '';
}

const EDITABLE_STUDENT_FIELD_IDS = new Set([
    's_name', 's_gender', 's_age', 's_nation', 's_school', 's_grade', 's_class',
    's_date_year', 's_date_month', 's_date_day', 's_tester', 's_annotator'
]);

function isEditableStudentControl(element) {
    if (!(element instanceof HTMLElement) || !element.matches('input, select, textarea')) return false;
    if (element.disabled || element.readOnly) return false;
    return EDITABLE_STUDENT_FIELD_IDS.has(element.id) || Boolean(element.closest('#form-low, #form-high'));
}

function markCurrentStudentDirty(event) {
    if (isEditableStudentControl(event.target)) APP_STATE.isDirty = true;
}

function confirmDiscardUnsavedChanges() {
    return !APP_STATE.isDirty || window.confirm('当前修改尚未提交，切换后将丢失。是否继续？');
}

document.addEventListener('input', markCurrentStudentDirty);
document.addEventListener('change', markCurrentStudentDirty);

function saveAll(isNavigating = false) {
    const y = document.getElementById('s_date_year').value; const m = document.getElementById('s_date_month').value; const d = document.getElementById('s_date_day').value;
    let dateStr = ""; if (y && m && d) { APP_STATE.lastDateCache = { y, m, d }; dateStr = `${y}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`; }

    const data = {
        folder: APP_STATE.students[APP_STATE.currentIdx],
        grade_type: APP_STATE.currentGradeType,
        name: document.getElementById('s_name').value,
        gender: document.getElementById('s_gender').value,
        age: document.getElementById('s_age').value,
        nation: document.getElementById('s_nation').value,
        school: document.getElementById('s_school').value,
        grade: document.getElementById('s_grade').value,
        class_name: document.getElementById('s_class').value,
        date: dateStr,
        tester: document.getElementById('s_tester').value,
        annotator: document.getElementById('s_annotator').value
    };

    const activeFormId = APP_STATE.currentGradeType === 'low' ? 'form-low' : 'form-high';
    const formData = new FormData(document.getElementById(activeFormId));
    for (let [key, value] of formData.entries()) { data[key] = value; }

    const btn = document.querySelector('.save-btn-large'); const originalText = btn.innerText;
    btn.disabled = true; btn.style.opacity = "0.8"; btn.innerText = "保存中...";

    return fetch(demoEndpoint('save'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
        .then(r => r.json())
        .then(res => {
            btn.disabled = false; btn.style.opacity = "1";
            if (res.status === 'success') {
                APP_STATE.isDirty = false;
                btn.innerText = "✅ 保存成功";
                setTimeout(() => { btn.innerText = originalText; }, 500);
                if (!isNavigating) { loadStudent(APP_STATE.currentIdx); }
            }
            else {
                btn.innerText = "❌ 保存失败"; btn.classList.add('btn-danger');
                setTimeout(() => { btn.innerText = originalText; btn.classList.remove('btn-danger'); }, 2000);
            }
        })
        .catch(err => {
            btn.disabled = false; btn.style.opacity = "1";
            btn.innerText = "❌ 网络错误";
            setTimeout(() => { btn.innerText = originalText; }, 2000);
        });
}


// ================= 导航、图像与滚轮缩放 =================
let imgScale = 1;
let imgTransX = 0;
let imgTransY = 0;
const zoomWrapper = document.getElementById('zoom-wrapper');

function resetZoom() {
    imgScale = 1; imgTransX = 0; imgTransY = 0;
    zoomWrapper.style.transform = `matrix(1, 0, 0, 1, 0, 0)`;
}

function updateImage() {
    resetZoom(); // 翻页时重置缩放
    const img = document.getElementById('exam-image'); const ind = document.getElementById('img-indicator');
    if (APP_STATE.images.length > 0) {
        const tempImg = new Image();
        tempImg.onload = () => { img.src = tempImg.src; img.style.opacity = 1; };
        img.style.opacity = 0.4;
        tempImg.src = getScreenshotUrl(APP_STATE.images[APP_STATE.imgIdx]);
        ind.innerText = `Page ${APP_STATE.imgIdx + 1} / ${APP_STATE.images.length}`;
    } else { img.src = ""; img.alt = "该试卷未提取到图片"; ind.innerText = "无图片"; }
}

document.getElementById('img-container').addEventListener('wheel', (e) => {
    if (!APP_STATE.images.length) return;
    e.preventDefault();
    const zoomFactor = 0.1;
    const direction = e.deltaY < 0 ? 1 : -1;
    const newScale = Math.max(1, Math.min(imgScale + direction * zoomFactor, 5));

    if (newScale !== imgScale) {
        const rect = zoomWrapper.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // 保证以鼠标指针为中心进行缩放补偿
        imgTransX -= (x / imgScale) * (newScale - imgScale);
        imgTransY -= (y / imgScale) * (newScale - imgScale);

        if (newScale === 1) { imgTransX = 0; imgTransY = 0; }
        imgScale = newScale;
        zoomWrapper.style.transform = `matrix(${imgScale}, 0, 0, ${imgScale}, ${imgTransX}, ${imgTransY})`;
    }
}, { passive: false });

function changeImage(dir) { if (APP_STATE.images.length === 0) return; let newIdx = APP_STATE.imgIdx + dir; if (newIdx >= 0 && newIdx < APP_STATE.images.length) { APP_STATE.imgIdx = newIdx; updateImage(); } }
async function changeStudent(dir) {
    if (APP_STATE.isNavigating) return;
    const targetIdx = APP_STATE.currentIdx + dir;
    if (targetIdx < 0 || targetIdx >= APP_STATE.students.length || !confirmDiscardUnsavedChanges()) return;

    APP_STATE.isNavigating = true;
    try { await loadStudent(targetIdx); } finally { APP_STATE.isNavigating = false; }
}

async function executeJump(el) {
    if (APP_STATE.isNavigating || APP_STATE.students.length === 0) { el.value = APP_STATE.currentIdx + 1; return; }
    const val = parseInt(el.value, 10);
    if (Number.isNaN(val) || val < 1 || val > APP_STATE.students.length) {
        alert('请输入有效数字');
        el.value = APP_STATE.currentIdx + 1;
        return;
    }
    if (val - 1 === APP_STATE.currentIdx) return;
    if (!confirmDiscardUnsavedChanges()) {
        el.value = APP_STATE.currentIdx + 1;
        return;
    }

    APP_STATE.isNavigating = true;
    try { await loadStudent(val - 1); } finally { APP_STATE.isNavigating = false; }
}

// ================= 截图 =================
const overlay = document.getElementById('crop-overlay');
const cropBox = document.getElementById('crop-box');
const examImg = document.getElementById('exam-image');
let isDrawing = false, startX, startY;
let currentBase64Image = null;

overlay.addEventListener('mousedown', (e) => {
    if (e.button !== 0 || !examImg.src || examImg.src.endsWith('/')) return;
    isDrawing = true;
    const rect = zoomWrapper.getBoundingClientRect();
    // 将鼠标屏幕坐标转化为 zoomWrapper 内部不受缩放影响的绝对像素坐标
    startX = (e.clientX - rect.left) / imgScale;
    startY = (e.clientY - rect.top) / imgScale;

    cropBox.style.display = 'block';
    cropBox.style.left = startX + 'px'; cropBox.style.top = startY + 'px';
    cropBox.style.width = '0px'; cropBox.style.height = '0px';
});

overlay.addEventListener('mousemove', (e) => {
    if (!isDrawing) return;
    const rect = zoomWrapper.getBoundingClientRect();
    const currX = (e.clientX - rect.left) / imgScale;
    const currY = (e.clientY - rect.top) / imgScale;

    cropBox.style.left = Math.min(currX, startX) + 'px';
    cropBox.style.top = Math.min(currY, startY) + 'px';
    cropBox.style.width = Math.abs(currX - startX) + 'px';
    cropBox.style.height = Math.abs(currY - startY) + 'px';
});

overlay.addEventListener('mouseup', (e) => {
    if (!isDrawing) return;
    isDrawing = false;
    cropBox.style.display = 'none';

    let boxW = parseInt(cropBox.style.width); let boxH = parseInt(cropBox.style.height);
    if (boxW < 5 || boxH < 5) return; // 截图区域太小将判定为误触
    let boxL = parseInt(cropBox.style.left); let boxT = parseInt(cropBox.style.top);

    const wrapperW = zoomWrapper.offsetWidth;
    const wrapperH = zoomWrapper.offsetHeight;
    const imgRatio = examImg.naturalWidth / examImg.naturalHeight;
    const containerRatio = wrapperW / wrapperH;

    let drawWidth, drawHeight, offsetX = 0, offsetY = 0;
    if (imgRatio > containerRatio) {
        drawWidth = wrapperW; drawHeight = wrapperW / imgRatio; offsetY = (wrapperH - drawHeight) / 2;
    } else {
        drawHeight = wrapperH; drawWidth = wrapperH * imgRatio; offsetX = (wrapperW - drawWidth) / 2;
    }

    const relX = boxL - offsetX; const relY = boxT - offsetY;
    const scaleX = examImg.naturalWidth / drawWidth; const scaleY = examImg.naturalHeight / drawHeight;

    // 限制边界防止截出黑边
    let clampedRelX = Math.max(0, Math.min(relX, drawWidth));
    let clampedRelY = Math.max(0, Math.min(relY, drawHeight));
    let clampedRelW = Math.min(boxW, drawWidth - clampedRelX);
    let clampedRelH = Math.min(boxH, drawHeight - clampedRelY);

    if (clampedRelW <= 0 || clampedRelH <= 0) return;

    const finalX = clampedRelX * scaleX; const finalY = clampedRelY * scaleY;
    const finalW = clampedRelW * scaleX; const finalH = clampedRelH * scaleY;

    const canvas = document.createElement('canvas');
    canvas.width = finalW; canvas.height = finalH;
    const ctx = canvas.getContext('2d');

    ctx.drawImage(examImg, finalX, finalY, finalW, finalH, 0, 0, finalW, finalH);
    currentBase64Image = canvas.toDataURL('image/png');
    document.getElementById('crop-preview-img').src = currentBase64Image;

    document.querySelectorAll('#error-categories input[type="checkbox"]').forEach(cb => cb.checked = false);
    document.getElementById('correct-char-input').value = '';
    document.getElementById('screenshot-modal').style.display = 'flex';
    setTimeout(() => {
        // Change this line to target the specific container
        const scrollArea = document.querySelector('.error-selection-container');
        if (scrollArea) {
            scrollArea.scrollTop = 0;
        }
        document.getElementById('correct-char-input').focus();
    }, 50);
});

function closeScreenshotModal() { document.getElementById('screenshot-modal').style.display = 'none'; currentBase64Image = null; }

function submitScreenshot() {
    const correctText = document.getElementById('correct-char-input').value.trim();
    if (!correctText) { alert("请输入正确的汉字！"); return; }
    const checkedBoxes = Array.from(document.querySelectorAll('#error-categories input[type="checkbox"]:checked'));
    if (checkedBoxes.length === 0) { alert("请至少选择一个错误类型！"); return; }

    const categories = checkedBoxes.map(cb => cb.value);
    const uid = APP_STATE.students[APP_STATE.currentIdx];

    const btn = document.getElementById('btn-submit-shot'); const originalText = btn.innerText;
    btn.innerText = "保存中..."; btn.disabled = true;

    fetch(demoEndpoint('save_screenshot'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: uid, categories: categories, correct_text: correctText, image: currentBase64Image })
    })
        .then(res => res.json())
        .then(data => {
            if (data.status === 'success') {
                closeScreenshotModal();
                loadStudentScreenshots();
            } else { alert("保存失败：" + data.message); }
        })
        .catch(err => alert("网络错误"))
        .finally(() => { btn.innerText = originalText; btn.disabled = false; });
}

// ================= 其他功能 =================
function handleSearch(query) { const container = document.getElementById('search-results'); query = query.trim(); if (!query) { container.style.display = 'none'; return; } if (APP_STATE.isIndexing && APP_STATE.searchIndex.length === 0) { container.innerHTML = '<div class="loading-text">正在初始化...</div>'; container.style.display = 'block'; return; } const matches = APP_STATE.searchIndex.filter(item => item.name.includes(query) || item.id.includes(query)); if (matches.length === 0) { container.innerHTML = '<div class="search-item" style="color:#999; justify-content:center;">未找到结果</div>'; } else { container.innerHTML = matches.map(m => `<div class="search-item" onclick="selectSearchStudent(${m.index})"><span class="search-name">${m.name}</span><span class="search-id">${m.id}</span></div>`).join(''); } container.style.display = 'block'; }
async function selectSearchStudent(index) {
    if (APP_STATE.isNavigating) return;
    if (index !== APP_STATE.currentIdx) {
        if (!confirmDiscardUnsavedChanges()) return;
        APP_STATE.isNavigating = true;
        try { await loadStudent(index); } finally { APP_STATE.isNavigating = false; }
    }
    document.getElementById('search-results').style.display = 'none';
    document.getElementById('search-input').value = '';
}

// ================= 浏览器内 JSON 导出 =================
async function exportExcel() {
    const btn = document.getElementById('export-excel-btn');
    if (!btn) return;
    const originalText = btn.innerText;
    btn.innerText = "正在生成...";

    try {
        const now = new Date();
        const dateStr = now.getFullYear().toString() + (now.getMonth() + 1).toString().padStart(2, '0') + now.getDate().toString().padStart(2, '0') + "_" + now.getHours().toString().padStart(2, '0') + now.getMinutes().toString().padStart(2, '0');
        const defaultName = `量表成绩汇总_${dateStr}.json`;

        const response = await fetch(demoEndpoint('export_excel'));

        if (!response.ok) throw new Error('无可用数据或服务器错误');

        const blob = await response.blob();

        // Pure Web-standard download trigger
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = defaultName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        btn.innerText = "导出成功";
    } catch (err) {
        btn.innerText = "导出失败";
        alert("导出失败: " + err.message);
    }

    setTimeout(() => {
        if (btn.innerText === "导出成功" || btn.innerText === "导出失败") btn.innerText = originalText;
    }, 2000);
}


document.addEventListener('keydown', function (e) { const isInputFocused = ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName); if (!isInputFocused && !e.ctrlKey && !e.metaKey) { if (e.key === 'ArrowLeft') changeImage(-1); if (e.key === 'ArrowRight') changeImage(1); if (e.key === 'ArrowUp' && e.shiftKey) { e.preventDefault(); changeStudent(-1); } if (e.key === 'ArrowDown' && e.shiftKey) { e.preventDefault(); changeStudent(1); } } });
