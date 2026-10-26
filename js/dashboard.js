/**
 * ============================================================================
 *  لوحة تحكم قيادة المدرسة - المنطق البرمجي للوحة الإدارة
 *  School Complaint & Suggestion System - Admin Dashboard Logic
 * ============================================================================
 */

// الرابط الرئيسي للباك إند (Google Apps Script Web App)
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxFk5vdq390gMF1IyCnogJDWaDXkDU4NMsUynJGBsXhPT9L_M6L7Fm6chyAm4z68f2y/exec';

// إعدادات العرض والتصفح
const PAGE_SIZE = 10;
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 دقيقة مهلة عدم نشاط

// المتغيرات العامة للبيانات
let allComplaints = [];
let currentFilter = 'all';
let searchQuery = '';
let currentPage = 1;
let currentPassword = '';
let sessionTimer = null;

// قوالب الردود السريعة الجاهزة للإدارة
const replyTemplates = [
  'شكراً لتواصلكم، تم استلام شكواكم وجاري دراستها بعناية من إدارة المدرسة.',
  'نعتذر عن أي تقصير، وقد تم اتخاذ الإجراءات الإدارية اللازمة لمعالجة الأمر.',
  'نشكركم على المقترح القيم، وسيتم عرضه على مجلس إدارة المدرسة لتطبيقه.',
  'تم التواصل مع المعلم والإخصائي الاجتماعي وحل المشكلة بشكل نهائي، نشكر تعاونكم.',
  'يرجى التكرم بزيارة مكتب مدير المدرسة لمتابعة الموضوع ومناقشته شخصياً.'
];

// ============================================================================
// 1. بدء التشغيل وتهيئة الأحداث
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initSessionCheck();
  initActivityTracker();
  initKeyboardShortcuts();
});

// ============================================================================
// 2. إدارة الوضع الداكن (Dark Mode)
// ============================================================================
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  applyTheme(savedTheme);

  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'light';
      const newTheme = current === 'dark' ? 'light' : 'dark';
      applyTheme(newTheme);
      localStorage.setItem('theme', newTheme);
    });
  }
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn) {
    const icon = themeBtn.querySelector('i') || themeBtn;
    if (theme === 'dark') {
      icon.className = 'fas fa-sun';
      themeBtn.setAttribute('title', 'التحويل للوضع النهاري');
    } else {
      icon.className = 'fas fa-moon';
      themeBtn.setAttribute('title', 'التحويل للوضع الليلي');
    }
  }
}

// ============================================================================
// 3. إدارة تسجيل الدخول والجلسة (Secure Authentication)
// ============================================================================
async function login() {
  const pwdInput = document.getElementById('passwordInput');
  const errEl = document.getElementById('loginError');
  const btn = document.getElementById('loginBtn');
  const pwd = pwdInput.value.trim();

  if (!pwd) {
    errEl.textContent = 'يرجى إدخال كلمة المرور';
    errEl.classList.add('show');
    pwdInput.focus();
    return;
  }

  errEl.classList.remove('show');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> جاري التحقق...';

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'adminLogin', password: pwd })
    });

    const result = await res.json();

    if (result.success && Array.isArray(result.data)) {
      currentPassword = pwd;
      sessionStorage.setItem('admin_session_key', btoa(unescape(encodeURIComponent(pwd))));
      sessionStorage.setItem('last_active', Date.now().toString());

      allComplaints = result.data.map(normalizeComplaint);

      document.getElementById('loginScreen').style.display = 'none';
      const dashEl = document.getElementById('dashboard');
      if (dashEl) {
        dashEl.style.display = 'block';
        dashEl.classList.add('show');
      }

      renderAll();
      showToast('مرحباً بك! تم تسجيل الدخول بنجاح', 'success');
      resetActivityTimer();
    } else {
      errEl.textContent = '❌ ' + (result.message || 'كلمة المرور غير صحيحة، يرجى المحاولة ثانية');
      errEl.classList.add('show');
      pwdInput.focus();
    }
  } catch (err) {
    console.error('Login error:', err);
    errEl.textContent = '❌ تعذر الاتصال بالخادم. تحقق من الإنترنت وحاول لاحقاً.';
    errEl.classList.add('show');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span><i class="fas fa-arrow-left"></i></span><span>دخول لوحة التحكم</span>';
  }
}

function logout() {
  sessionStorage.removeItem('admin_session_key');
  sessionStorage.removeItem('last_active');
  currentPassword = '';
  allComplaints = [];
  location.reload();
}

function togglePasswordVisibility() {
  const pwdInput = document.getElementById('passwordInput');
  const toggleIcon = document.getElementById('togglePwdIcon');
  if (!pwdInput) return;

  if (pwdInput.type === 'password') {
    pwdInput.type = 'text';
    if (toggleIcon) toggleIcon.className = 'far fa-eye-slash';
  } else {
    pwdInput.type = 'password';
    if (toggleIcon) toggleIcon.className = 'far fa-eye';
  }
}

function initSessionCheck() {
  const savedKey = sessionStorage.getItem('admin_session_key');
  const lastActive = sessionStorage.getItem('last_active');

  if (savedKey && lastActive) {
    const elapsed = Date.now() - parseInt(lastActive, 10);
    if (elapsed < SESSION_TIMEOUT_MS) {
      try {
        const decodedPwd = decodeURIComponent(escape(atob(savedKey)));
        document.getElementById('passwordInput').value = decodedPwd;
        login();
      } catch (e) {
        sessionStorage.clear();
      }
    } else {
      sessionStorage.clear();
      showToast('انتهت مهلة الجلسة، يرجى تسجيل الدخول مجدداً', 'info');
    }
  }
}

function initActivityTracker() {
  ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(evt => {
    window.addEventListener(evt, resetActivityTimer, { passive: true });
  });
}

function resetActivityTimer() {
  if (sessionStorage.getItem('admin_session_key')) {
    sessionStorage.setItem('last_active', Date.now().toString());
    clearTimeout(sessionTimer);
    sessionTimer = setTimeout(() => {
      showToast('انتهت الجلسة لعدم النشاط، تم تسجيل الخروج تلقائياً', 'error');
      logout();
    }, SESSION_TIMEOUT_MS);
  }
}

function cleanClassName(val) {
  if (!val) return '';
  val = String(val).trim();
  if (val.startsWith("'")) val = val.substring(1);
  if (/^\d{4}-\d{2}-\d{2}T/.test(val)) {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      const day = d.getDate();
      const month = d.getMonth() + 1;
      return `${day}/${month}`;
    }
  }
  return val;
}

// ============================================================================
// 4. توحيد ومعايرة بنية بيانات الشكاوى (Data Normalization)
// ============================================================================
function normalizeComplaint(c) {
  if (!c) return {};

  let ticket = c.TicketNumber || c.ticketNumber || c['رقم التذكرة'];
  let time = c.Timestamp || c.timestamp || c.date || c['التاريخ'];
  let type = c.Type || c.type || c['النوع'];
  let parent = c.ParentName || c.parentName || c['ولي الأمر'];
  let phone = c.WhatsApp || c.whatsapp || c.phone || c['الهاتف'];
  let student = c.StudentName || c.studentName || c['التلميذ'];
  let grade = c.Grade || c.grade || c['الصف'];
  let cls = c.Class || c.className || c.class || c['الفصل'];
  let subject = c.Subject || c.subject || c['الموضوع'];
  let details = c.Details || c.details || c['التفاصيل'];
  let incDate = c.IncidentDate || c.incidentDate || c['تاريخ الواقعة'];
  let status = c.Status || c.status || c['الحالة'];
  let reply = c.AdminReply || c.adminReply || c.reply || c['الرد'];
  let replyDate = c.ReplyDate || c.replyDate || c['تاريخ الرد'];

  // استخراج القيم بالترتيب التسلسلي للأعمدة في حال كانت أسماء الحقول مختلفة
  const entries = Object.entries(c);
  if (!ticket && entries.length >= 10) {
    // البحث عن التذكرة
    let startIndex = -1;
    for (let i = 0; i < entries.length; i++) {
      const val = String(entries[i][1] || '').trim();
      if (/^[A-Za-z]{2,5}-\d{4}-\d{3,}/.test(val) || val.startsWith('SMT-')) {
        startIndex = i;
        break;
      }
    }

    if (startIndex !== -1) {
      ticket = entries[startIndex] ? entries[startIndex][1] : '';
      time = entries[startIndex + 1] ? entries[startIndex + 1][1] : '';
      type = entries[startIndex + 2] ? entries[startIndex + 2][1] : 'شكوى';
      parent = entries[startIndex + 3] ? entries[startIndex + 3][1] : '';
      phone = entries[startIndex + 4] ? entries[startIndex + 4][1] : '';
      student = entries[startIndex + 5] ? entries[startIndex + 5][1] : '';
      grade = entries[startIndex + 6] ? entries[startIndex + 6][1] : '';
      cls = entries[startIndex + 7] ? entries[startIndex + 7][1] : '';
      subject = entries[startIndex + 8] ? entries[startIndex + 8][1] : '';
      details = entries[startIndex + 9] ? entries[startIndex + 9][1] : '';
      incDate = entries[startIndex + 10] ? entries[startIndex + 10][1] : '';
      status = entries[startIndex + 11] ? entries[startIndex + 11][1] : 'جديد';
      reply = entries[startIndex + 12] ? entries[startIndex + 12][1] : '';
      replyDate = entries[startIndex + 13] ? entries[startIndex + 13][1] : '';
    } else if (entries.length >= 14) {
      // الترتيب المعياري الثابت
      ticket = entries[1] ? entries[1][1] : '';
      time = entries[2] ? entries[2][1] : '';
      type = entries[3] ? entries[3][1] : 'شكوى';
      parent = entries[4] ? entries[4][1] : '';
      phone = entries[5] ? entries[5][1] : '';
      student = entries[6] ? entries[6][1] : '';
      grade = entries[7] ? entries[7][1] : '';
      cls = entries[8] ? entries[8][1] : '';
      subject = entries[9] ? entries[9][1] : '';
      details = entries[10] ? entries[10][1] : '';
      incDate = entries[11] ? entries[11][1] : '';
      status = entries[12] ? entries[12][1] : 'جديد';
      reply = entries[13] ? entries[13][1] : '';
      replyDate = entries[14] ? entries[14][1] : '';
    }
  }

  // تنظيف الحالة والنوع
  status = String(status || 'جديد').trim();
  if (status.includes('الرد') || reply) status = 'تم الرد';

  type = String(type || 'شكوى').trim();
  if (type.includes('مقترح')) type = 'مقترح';
  else type = 'شكوى';

  return {
    rowIndex: c.rowIndex || (entries[0] && entries[0][0] === 'rowIndex' ? parseInt(entries[0][1], 10) : 2),
    TicketNumber: String(ticket || ''),
    Timestamp: time || '',
    Type: type,
    ParentName: String(parent || ''),
    WhatsApp: String(phone || ''),
    StudentName: String(student || ''),
    Grade: String(grade || ''),
    Class: cleanClassName(cls),
    Subject: String(subject || ''),
    Details: String(details || ''),
    IncidentDate: incDate || '',
    Status: status,
    AdminReply: String(reply || ''),
    ReplyDate: replyDate || ''
  };
}

// ============================================================================
// 5. تصفية البيانات والبحث والفرز
// ============================================================================
function applyFilters() {
  searchQuery = document.getElementById('searchInput').value.trim().toLowerCase();
  currentPage = 1;
  renderAll();
}

function filterList(btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  currentFilter = btn.dataset.filter;
  currentPage = 1;
  renderAll();
}

function getFilteredData() {
  let list = allComplaints;

  // فلترة حسب الحالة أو النوع
  if (currentFilter === 'جديد') {
    list = list.filter(c => c.Status === 'جديد');
  } else if (currentFilter === 'تم الرد') {
    list = list.filter(c => c.Status === 'تم الرد');
  } else if (currentFilter === 'شكوى' || currentFilter === 'مقترح') {
    list = list.filter(c => c.Type === currentFilter);
  }

  // فلترة بالبحث النصي الشامل
  if (searchQuery) {
    list = list.filter(c => {
      return (
        String(c.TicketNumber || '').toLowerCase().includes(searchQuery) ||
        String(c.ParentName || '').toLowerCase().includes(searchQuery) ||
        String(c.WhatsApp || '').includes(searchQuery) ||
        String(c.StudentName || '').toLowerCase().includes(searchQuery) ||
        String(c.Subject || '').toLowerCase().includes(searchQuery) ||
        String(c.Details || '').toLowerCase().includes(searchQuery) ||
        String(c.Grade || '').toLowerCase().includes(searchQuery) ||
        String(c.Class || '').toLowerCase().includes(searchQuery)
      );
    });
  }

  // ترتيب عكسي (الأحدث في البداية)
  return [...list].reverse();
}

// ============================================================================
// 5. عرض الإحصائيات ورسوم التقدم
// ============================================================================
function renderStats() {
  const total = allComplaints.length;
  const complaints = allComplaints.filter(c => c.Type === 'شكوى').length;
  const suggestions = allComplaints.filter(c => c.Type === 'مقترح').length;
  const newCount = allComplaints.filter(c => c.Status === 'جديد').length;
  const repliedCount = allComplaints.filter(c => c.Status === 'تم الرد').length;

  document.getElementById('totalCount').textContent = total;
  document.getElementById('newCount').textContent = newCount;
  document.getElementById('repliedCount').textContent = repliedCount;

  // حساب نسبة الرد
  const rate = total > 0 ? Math.round((repliedCount / total) * 100) : 0;
  const rateEl = document.getElementById('replyRate');
  if (rateEl) rateEl.textContent = `${rate}%`;

  // شريط الرسم البياني للتوزيع
  const max = Math.max(complaints, suggestions, 1);
  const complaintPct = Math.round((complaints / max) * 100);
  const suggestionPct = Math.round((suggestions / max) * 100);

  document.getElementById('chartComplaint').style.width = complaintPct + '%';
  document.getElementById('chartSuggestion').style.width = suggestionPct + '%';
  document.getElementById('valComplaint').textContent = complaints;
  document.getElementById('valSuggestion').textContent = suggestions;
}

// ============================================================================
// 6. عرض قائمة الطلبات (Cards Rendering)
// ============================================================================
function renderList() {
  const container = document.getElementById('complaintsList');
  const filtered = getFilteredData();
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;

  if (currentPage > totalPages) currentPage = totalPages;

  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  if (pageItems.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="icon"><i class="fas fa-folder-open"></i></div>
        <h3>لا توجد طلبات مطابقة</h3>
        <p>جرب تعديل كلمات البحث أو اختيار تبويب فلتر آخر</p>
      </div>`;
    return;
  }

  container.innerHTML = pageItems.map(c => {
    const isReplied = c.Status === 'تم الرد';
    const isComplaint = c.Type === 'شكوى';

    const typeBadge = isComplaint
      ? '<span class="card-type-badge badge-complaint"><i class="fas fa-file-lines"></i> شكوى</span>'
      : '<span class="card-type-badge badge-suggestion"><i class="fas fa-lightbulb"></i> مقترح</span>';

    const statusBadge = isReplied
      ? '<span class="card-type-badge badge-replied"><i class="fas fa-circle-check"></i> تم الرد</span>'
      : '<span class="card-type-badge badge-new"><i class="fas fa-bell"></i> جديد</span>';

    const cleanPhone = formatWhatsAppNumber(c.WhatsApp);
    const quickWaMsg = encodeURIComponent(`السلام عليكم ورحمة الله، أستاذ/ة ${c.ParentName}، بخصوص طلبكم رقم (${c.TicketNumber}):`);
    const waDirectLink = `https://wa.me/${cleanPhone}?text=${quickWaMsg}`;

    return `
      <article class="complaint-card ${isReplied ? 'replied' : ''}" data-row="${c.rowIndex}">
        <div class="card-header">
          <div style="display:flex; align-items:center; gap:6px;">
            ${typeBadge}
            ${statusBadge}
          </div>
          <small class="card-date" style="color:var(--text-muted); font-size:12px;">
            <i class="far fa-clock"></i> ${formatDate(c.Timestamp)}
          </small>
        </div>

        <div class="ticket-chip">
          <i class="fas fa-ticket"></i> ${escapeHtml(c.TicketNumber)}
        </div>

        <h3 class="card-subject">${escapeHtml(c.Subject)}</h3>

        <div class="card-meta">
          <div><strong>ولي الأمر:</strong> ${escapeHtml(c.ParentName)}</div>
          <div><strong>الهاتف (واتساب):</strong> <span dir="ltr">${escapeHtml(c.WhatsApp)}</span></div>
          <div><strong>التلميذ / الطالب:</strong> ${escapeHtml(c.StudentName)} &bull; الصف: ${escapeHtml(c.Grade)} &bull; فصل: ${escapeHtml(c.Class)}</div>
          ${c.IncidentDate ? `<div><strong>تاريخ الواقعة:</strong> ${formatDate(c.IncidentDate)}</div>` : ''}
        </div>

        <a href="${waDirectLink}" target="_blank" rel="noopener noreferrer" class="parent-wa-btn" title="محادثة ولي الأمر مباشرة على واتساب">
          <i class="fab fa-whatsapp"></i> فتح محادثة واتساب مع ولي الأمر
        </a>

        <div class="card-details">
          <strong>نص الطلب:</strong><br>
          ${escapeHtml(c.Details)}
        </div>

        ${isReplied && c.AdminReply ? `
          <div class="admin-reply-view" style="background:#ecfdf5; border:1px solid #d1fae5; border-radius:12px; padding:14px; margin-top:12px; font-size:14px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; flex-wrap:wrap; gap:8px;">
              <strong style="color:#059669;">
                <i class="fas fa-check-double"></i> رد قيادة المدرسة المسجل:
              </strong>
              <button type="button" onclick="toggleEditReply(${c.rowIndex})" style="background:none; border:none; color:#0284c7; cursor:pointer; font-family:inherit; font-size:12.5px; font-weight:700; display:inline-flex; align-items:center; gap:5px;">
                <i class="fas fa-pen-to-square"></i> تعديل الرد / إرسال رسالة جديدة
              </button>
            </div>
            <p style="color:#065f46; line-height:1.7; margin:0;">${escapeHtml(c.AdminReply)}</p>
          </div>

          <div class="card-reply-box" id="edit-box-${c.rowIndex}" style="margin-top:14px; display:none;">
            <div class="reply-templates">
              <span style="font-size:11.5px; color:var(--text-muted); align-self:center; margin-left:4px;">قوالب رد سريعة:</span>
              ${replyTemplates.map((t, idx) => `
                <button type="button" class="template-chip" onclick="applyTemplate(${c.rowIndex}, ${idx})">
                  ${escapeHtml(t.substring(0, 24))}...
                </button>
              `).join('')}
            </div>

            <textarea id="reply-${c.rowIndex}" class="reply-textarea" placeholder="اكتب التحديث أو الرد المعدل هنا..." maxlength="1500">${escapeHtml(c.AdminReply)}</textarea>

            <div class="card-actions">
              <button type="button" class="btn-send-reply" onclick="sendReply(${c.rowIndex}, event)">
                <i class="fab fa-whatsapp"></i> حفظ التحديث وإرساله عبر واتساب
              </button>
            </div>
          </div>
        ` : `
          <div class="card-reply-box" style="margin-top:14px;">
            <div class="reply-templates">
              <span style="font-size:11.5px; color:var(--text-muted); align-self:center; margin-left:4px;">قوالب رد سريعة:</span>
              ${replyTemplates.map((t, idx) => `
                <button type="button" class="template-chip" onclick="applyTemplate(${c.rowIndex}, ${idx})">
                  ${escapeHtml(t.substring(0, 24))}...
                </button>
              `).join('')}
            </div>

            <textarea id="reply-${c.rowIndex}" class="reply-textarea" placeholder="اكتب رد قيادة المدرسة هنا... سيتم حفظ الرد وفتح واتساب تلقائياً للإرسال" maxlength="1500"></textarea>

            <div class="card-actions">
              <button type="button" class="btn-send-reply" onclick="sendReply(${c.rowIndex}, event)">
                <i class="fab fa-whatsapp"></i> حفظ الرد وإرساله عبر واتساب
              </button>
            </div>
          </div>
        `}
      </article>
    `;
  }).join('');
}

// ============================================================================
// 7. تطبيق قوالب الردود والتبديل
// ============================================================================
function applyTemplate(rowIndex, idx) {
  const textarea = document.getElementById(`reply-${rowIndex}`);
  if (textarea) {
    textarea.value = replyTemplates[idx];
    textarea.focus();
  }
}

function toggleEditReply(rowIndex) {
  const box = document.getElementById(`edit-box-${rowIndex}`);
  if (box) {
    const isHidden = box.style.display === 'none';
    box.style.display = isHidden ? 'block' : 'none';
    if (isHidden) {
      const textarea = document.getElementById(`reply-${rowIndex}`);
      if (textarea) textarea.focus();
    }
  }
}

// ============================================================================
// 8. حفظ الرد وفتح محادثة واتساب
// ============================================================================
async function sendReply(rowIndex, event) {
  const textarea = document.getElementById(`reply-${rowIndex}`);
  const replyText = textarea ? textarea.value.trim() : '';

  if (!replyText) {
    showToast('يرجى كتابة نص الرد أولاً قبل الإرسال', 'error');
    if (textarea) textarea.focus();
    return;
  }

  const btn = event.currentTarget;
  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> جاري حفظ الرد...';

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'reply',
        password: currentPassword,
        rowIndex: rowIndex,
        reply: replyText
      })
    });

    const result = await res.json();

    if (result.success) {
      const currentItem = allComplaints.find(x => x.rowIndex === rowIndex);
      const parentPhone = formatWhatsAppNumber(result.parentWhatsapp || (currentItem ? currentItem.WhatsApp : ''));
      
      let waMessage = '';
      if (currentItem && currentItem.ParentName) {
        waMessage = `السلام عليكم ورحمة الله، أستاذ/ة ${currentItem.ParentName}،\nبخصوص طلبكم رقم (${currentItem.TicketNumber || result.ticketNumber || ''}):\n\n${replyText}\n\nإدارة المدرسة`;
      } else {
        waMessage = replyText;
      }

      const fullMessage = encodeURIComponent(waMessage);
      const waUrl = `https://wa.me/${parentPhone}?text=${fullMessage}`;

      window.open(waUrl, '_blank', 'noopener,noreferrer');
      showToast('✅ تم حفظ الرد في السجل، وتم فتح محادثة واتساب', 'success');

      if (currentItem) {
        currentItem.Status = 'تم الرد';
        currentItem.AdminReply = replyText;
      }

      renderAll();
    } else {
      showToast('⚠️ ' + (result.message || 'فشل حفظ الرد في الخادم'), 'error');
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  } catch (err) {
    console.error('Reply error:', err);
    showToast('❌ تعذر الاتصال بالخادم لحفظ الرد', 'error');
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
}

// ============================================================================
// 9. التنقل بين الصفحات (Pagination)
// ============================================================================
function renderPagination() {
  const filtered = getFilteredData();
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  const pgContainer = document.getElementById('pagination');

  if (totalPages <= 1) {
    pgContainer.innerHTML = '';
    return;
  }

  let html = '';
  html += `<button class="page-btn" onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''} aria-label="الصفحة السابقة"><i class="fas fa-chevron-right"></i></button>`;

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - currentPage) <= 1) {
      html += `<button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    } else if (i === currentPage - 2 || i === currentPage + 2) {
      html += `<span class="page-dots">...</span>`;
    }
  }

  html += `<button class="page-btn" onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''} aria-label="الصفحة التالية"><i class="fas fa-chevron-left"></i></button>`;
  pgContainer.innerHTML = html;
}

function goToPage(pageNum) {
  const filtered = getFilteredData();
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE) || 1;
  if (pageNum < 1 || pageNum > totalPages) return;

  currentPage = pageNum;
  renderList();
  renderPagination();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderAll() {
  renderStats();
  renderList();
  renderPagination();
}

// ============================================================================
// 10. تحديث البيانات من الخادم (Refresh Data)
// ============================================================================
async function refreshData() {
  if (!currentPassword) return;

  const refreshBtn = document.getElementById('refreshBtn');
  if (refreshBtn) {
    refreshBtn.disabled = true;
    refreshBtn.innerHTML = '<i class="fas fa-arrows-rotate fa-spin"></i> تحديث';
  }

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'adminLogin', password: currentPassword })
    });

    const result = await res.json();
    if (result.success && Array.isArray(result.data)) {
      allComplaints = result.data.map(normalizeComplaint);
      renderAll();
      showToast('تم تحديث البيانات بنجاح 🔄', 'success');
    } else {
      showToast('تعذر تحديث البيانات', 'error');
    }
  } catch (err) {
    console.error('Refresh error:', err);
    showToast('خطأ في الاتصال أثناء التحديث', 'error');
  } finally {
    if (refreshBtn) {
      refreshBtn.disabled = false;
      refreshBtn.innerHTML = '<i class="fas fa-arrows-rotate"></i> تحديث';
    }
  }
}

// ============================================================================
// 11. تصدير البيانات إلى ملف Excel / CSV (مع دعم اللغة العربية بـ BOM)
// ============================================================================
function exportCSV() {
  const filtered = getFilteredData();
  if (filtered.length === 0) {
    showToast('لا توجد بيانات مطابقة لتصديرها', 'error');
    return;
  }

  const headers = [
    'رقم التذكرة',
    'تاريخ التقديم',
    'النوع',
    'اسم ولي الأمر',
    'رقم الهاتف',
    'اسم التلميذ',
    'الصف',
    'الفصل',
    'موضوع الطلب',
    'التفاصيل',
    'تاريخ الواقعة',
    'حالة الطلب',
    'رد الإدارة'
  ];

  const rows = filtered.map(c => [
    c.TicketNumber,
    formatDate(c.Timestamp),
    c.Type,
    c.ParentName,
    c.WhatsApp,
    c.StudentName,
    c.Grade,
    c.Class,
    c.Subject,
    c.Details,
    c.IncidentDate ? formatDate(c.IncidentDate) : '',
    c.Status,
    c.AdminReply || ''
  ]);

  // إضافة UTF-8 BOM (\uFEFF) لفتح الملف بالعربية في Excel بدون تشفير مشوه
  const csvContent = '\uFEFF' + [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(','))
    .join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const dateStr = new Date().toISOString().slice(0, 10);

  link.setAttribute('href', url);
  link.setAttribute('download', `تقارير_الشكاوى_والمقترحات_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  showToast(`✅ تم تصدير ${filtered.length} طلباً بنجاح بصيغة CSV`, 'success');
}

// ============================================================================
// 12. دوال التنسيق والمساعدة
// ============================================================================
function formatWhatsAppNumber(phone) {
  if (!phone) return '';
  let cleaned = String(phone).replace(/\D/g, '');
  if (cleaned.startsWith('00')) cleaned = cleaned.substring(2);
  else if (cleaned.startsWith('0')) cleaned = '20' + cleaned.substring(1);
  return cleaned;
}

function formatDate(raw) {
  if (!raw) return '';
  try {
    const d = new Date(raw);
    if (isNaN(d.getTime())) return raw;
    return d.toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return raw;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showToast(message, type = 'info') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.className = `toast show ${type}`;

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

function initKeyboardShortcuts() {
  document.addEventListener('keydown', e => {
    // تركيز شريط البحث بـ Ctrl+F أو /
    if ((e.ctrlKey && e.key === 'f') || (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA')) {
      const search = document.getElementById('searchInput');
      if (search && document.getElementById('dashboard').classList.contains('show')) {
        e.preventDefault();
        search.focus();
        search.select();
      }
    }
  });
}
