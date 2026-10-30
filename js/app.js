/**
 * ============================================================================
 *  نظام الشكاوى والمقترحات المدرسية - المنطق البرمجي للواجهة الأمامية
 *  School Complaint & Suggestion System - Frontend App Logic
 * ============================================================================
 */

// الرابط الرئيسي للباك إند (Google Apps Script Web App)
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxFk5vdq390gMF1IyCnogJDWaDXkDU4NMsUynJGBsXhPT9L_M6L7Fm6chyAm4z68f2y/exec';

// الحالة العامة للتطبيق
let selectedType = 'شكوى';
let selectedSubmitterType = 'ولي أمر';
let currentTicket = '';

// ============================================================================
// 1. تهيئة التطبيق وإخفاء شاشة التحميل (Skeleton Loader)
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initDraftRecovery();
  initCharCounters();
  initFormValidation();
  initServiceWorker();
  initNetworkListeners();

  // إخفاء الـ Skeleton Loader بسلاسة
  const skeleton = document.getElementById('skeletonLoader');
  if (skeleton) {
    setTimeout(() => {
      skeleton.classList.add('hidden');
    }, 300);
  }
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
      themeBtn.setAttribute('aria-label', 'التحويل للوضع النهاري');
    } else {
      icon.className = 'fas fa-moon';
      themeBtn.setAttribute('title', 'التحويل للوضع الليلي');
      themeBtn.setAttribute('aria-label', 'التحويل للوضع الليلي');
    }
  }
}

// ============================================================================
// 3. تبديل نوع الطلب (شكوى / مقترح) وصفة مقدم المقترح
// ============================================================================
function selectType(btn) {
  document.querySelectorAll('.type-btn').forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-selected', 'false');
  });

  btn.classList.add('active');
  btn.setAttribute('aria-selected', 'true');
  selectedType = btn.dataset.type;

  const incidentGroup = document.getElementById('incidentGroup');
  const incidentInput = document.querySelector('input[name="incidentDate"]');
  const submitterRoleGroup = document.getElementById('submitterRoleGroup');

  if (selectedType === 'شكوى') {
    // الشكاوى مخصصة لأولياء الأمور فقط
    if (submitterRoleGroup) submitterRoleGroup.style.display = 'none';
    handleRoleChange('ولي أمر');

    if (incidentGroup) incidentGroup.classList.add('show');
    if (incidentInput) incidentInput.required = true;
  } else {
    // المقترحات: إظهار خيار تحديد صفة مقدم المقترح
    if (submitterRoleGroup) submitterRoleGroup.style.display = 'block';

    const checkedRadio = document.querySelector('input[name="submitterType"]:checked');
    handleRoleChange(checkedRadio ? checkedRadio.value : 'ولي أمر');

    if (incidentGroup) incidentGroup.classList.remove('show');
    if (incidentInput) {
      incidentInput.required = false;
      incidentInput.value = '';
    }
  }

  // تحديث نص زر الإرسال بناءً على النوع المختار
  const submitText = document.getElementById('submitBtnText');
  if (submitText) {
    submitText.textContent = selectedType === 'شكوى' ? 'إرسال الشكوى الآن' : 'إرسال المقترح الآن';
  }
}

/**
 * تبديل صفة مقدم المقترح (ولي أمر أو مهتم بالتعليم)
 * @param {string} role - 'ولي أمر' أو 'مهتم بالتعليم'
 */
function handleRoleChange(role) {
  selectedSubmitterType = role || 'ولي أمر';
  const isEnthusiast = (selectedType === 'مقترح' && selectedSubmitterType === 'مهتم بالتعليم');

  // تحديث مظهر أزرار الراديو
  const parentOption = document.getElementById('roleOptionParent');
  const enthusiastOption = document.getElementById('roleOptionEnthusiast');
  if (parentOption && enthusiastOption) {
    parentOption.classList.toggle('active', !isEnthusiast);
    enthusiastOption.classList.toggle('active', isEnthusiast);
  }

  const radio = document.querySelector(`input[name="submitterType"][value="${selectedSubmitterType}"]`);
  if (radio) radio.checked = true;

  const studentGroup = document.getElementById('studentFieldsGroup');
  const enthusiastGroup = document.getElementById('enthusiastFieldsGroup');
  const parentNameLabel = document.getElementById('parentNameLabel');
  const parentNameInput = document.getElementById('parentName');

  const studentNameInput = document.getElementById('studentName');
  const gradeInput = document.getElementById('grade');
  const classInput = document.getElementById('className');
  const nationalIdInput = document.getElementById('nationalId');
  const jobTitleInput = document.getElementById('jobTitle');

  if (isEnthusiast) {
    // وضع "مهتم بالتعليم": لا يشترط وجود أبناء
    if (parentNameLabel) {
      parentNameLabel.innerHTML = 'اسم مقدم المقترح <span class="required" aria-hidden="true">*</span>';
    }
    if (parentNameInput) {
      parentNameInput.placeholder = 'الاسم ثلاثي أو رباعي كاملاً';
    }

    // إخفاء حقول التلميذ وإلغاء طلبها
    if (studentGroup) studentGroup.style.display = 'none';
    [studentNameInput, gradeInput, classInput].forEach(inp => {
      if (inp) {
        inp.required = false;
        inp.classList.remove('invalid');
        const err = inp.parentElement.querySelector('.field-error');
        if (err) err.remove();
      }
    });

    // إظهار حقول الرقم القومي والوظيفة وجعلها إلزامية
    if (enthusiastGroup) enthusiastGroup.style.display = 'block';
    if (nationalIdInput) nationalIdInput.required = true;
    if (jobTitleInput) jobTitleInput.required = true;

  } else {
    // وضع "ولي أمر": يتطلب اسم التلميذ والصف والفصل
    if (parentNameLabel) {
      parentNameLabel.innerHTML = 'اسم ولي الأمر <span class="required" aria-hidden="true">*</span>';
    }
    if (parentNameInput) {
      parentNameInput.placeholder = 'الاسم ثلاثي أو رباعي';
    }

    // إظهار حقول التلميذ وجعلها إلزامية
    if (studentGroup) studentGroup.style.display = 'block';
    if (studentNameInput) studentNameInput.required = true;
    if (gradeInput) gradeInput.required = true;
    if (classInput) classInput.required = true;

    // إخفاء حقول المهتم بالتعليم وإلغاء طلبها
    if (enthusiastGroup) enthusiastGroup.style.display = 'none';
    [nationalIdInput, jobTitleInput].forEach(inp => {
      if (inp) {
        inp.required = false;
        inp.classList.remove('invalid');
        const err = inp.parentElement.querySelector('.field-error');
        if (err) err.remove();
      }
    });
  }
}

/**
 * التحقق الرياضي والجغرافي من صحة الرقم القومي المصري (14 رقماً)
 * @param {string} nid - الرقم القومي
 * @returns {{valid: boolean, message?: string}}
 */
function validateEgyptianNationalID(nid) {
  if (!nid) return { valid: false, message: 'الرقم القومي مطلوب' };
  const clean = String(nid).trim().replace(/\D/g, '');
  
  if (clean.length !== 14) {
    return { valid: false, message: 'الرقم القومي يجب أن يتكون من 14 رقماً بالضبط (المكتوب: ' + clean.length + ')' };
  }

  // الرقم الأول: القرن (2 للمواليد بين 1900-1999، 3 للمواليد بين 2000-2099)
  const century = clean.charAt(0);
  if (century !== '2' && century !== '3') {
    return { valid: false, message: 'الرقم القومي غير صحيح (يجب أن يبدأ بالرقم 2 أو 3)' };
  }

  const yearPrefix = century === '2' ? '19' : '20';
  const year = parseInt(yearPrefix + clean.substring(1, 3), 10);
  const month = parseInt(clean.substring(3, 5), 10);
  const day = parseInt(clean.substring(5, 7), 10);

  if (month < 1 || month > 12) {
    return { valid: false, message: 'الشهر في الرقم القومي غير صحيح (الخانة 4 و 5)' };
  }
  if (day < 1 || day > 31) {
    return { valid: false, message: 'اليوم في الرقم القومي غير صحيح (الخانة 6 و 7)' };
  }

  // التحقق من تاريخ الميلاد وصحة عدد الأيام في الشهر
  const birthDate = new Date(year, month - 1, day);
  if (
    birthDate.getFullYear() !== year ||
    birthDate.getMonth() !== month - 1 ||
    birthDate.getDate() !== day
  ) {
    return { valid: false, message: 'تاريخ الميلاد المستخرج من الرقم القومي غير صالح' };
  }

  if (birthDate > new Date()) {
    return { valid: false, message: 'تاريخ الميلاد في الرقم القومي لا يمكن أن يكون في المستقبل' };
  }

  // التحقق من كود المحافظة الرسمية المصرية (الخانة 8 و 9)
  const validGovCodes = [
    '01', '02', '03', '04', '11', '12', '13', '14', '15', '16', '17', '18', '19',
    '21', '22', '23', '24', '25', '26', '27', '28', '29', '31', '32', '33', '34', '35', '88'
  ];
  const gov = clean.substring(7, 9);
  if (!validGovCodes.includes(gov)) {
    return { valid: false, message: 'كود المحافظة في الرقم القومي غير صحيح' };
  }

  return { valid: true };
}

// ============================================================================
// 4. عدادات الأحرف التفاعلية
// ============================================================================
function initCharCounters() {
  document.querySelectorAll('.char-count').forEach(counter => {
    const fieldName = counter.dataset.for;
    const input = document.querySelector(`[name="${fieldName}"]`);
    if (!input) return;

    const max = parseInt(input.getAttribute('maxlength'), 10) || 100;
    const updateCount = () => {
      const len = input.value.length;
      counter.textContent = `${len}/${max}`;
      counter.classList.toggle('warn', len > max * 0.85);
    };

    input.addEventListener('input', updateCount);
    updateCount();
  });
}

// ============================================================================
// 5. استعادة وحفظ المسودة تلقائياً (Auto-save draft)
// ============================================================================
const DRAFT_FIELDS = ['parentName', 'whatsapp', 'studentName', 'grade', 'className', 'subject', 'details', 'nationalId', 'jobTitle'];

function initDraftRecovery() {
  DRAFT_FIELDS.forEach(field => {
    const el = document.querySelector(`[name="${field}"]`);
    if (!el) return;

    const saved = localStorage.getItem(`draft_${field}`);
    if (saved) el.value = saved;

    el.addEventListener('input', () => {
      localStorage.setItem(`draft_${field}`, el.value);
    });
  });
}

function clearDraft() {
  DRAFT_FIELDS.forEach(field => localStorage.removeItem(`draft_${field}`));
}

// ============================================================================
// 6. التحقق الحي من صحة الحقول (Frontend Validation)
// ============================================================================
function initFormValidation() {
  const form = document.getElementById('complaintForm');
  if (!form) return;

  const inputs = form.querySelectorAll('input, select, textarea');
  inputs.forEach(input => {
    input.addEventListener('blur', () => validateField(input));
    input.addEventListener('input', () => {
      if (input.classList.contains('invalid')) {
        validateField(input);
      }
    });
  });
}

function validateField(input) {
  // تخطي الحقول الموجودة داخل حاويات مخفية
  const studentContainer = document.getElementById('studentFieldsGroup');
  if (studentContainer && studentContainer.style.display === 'none' && input.closest('#studentFieldsGroup')) {
    input.classList.remove('invalid');
    const err = input.parentElement.querySelector('.field-error');
    if (err) err.remove();
    return true;
  }

  const enthusiastContainer = document.getElementById('enthusiastFieldsGroup');
  if (enthusiastContainer && enthusiastContainer.style.display === 'none' && input.closest('#enthusiastFieldsGroup')) {
    input.classList.remove('invalid');
    const err = input.parentElement.querySelector('.field-error');
    if (err) err.remove();
    return true;
  }

  const val = input.value.trim();
  let isValid = true;
  let msg = '';

  if (input.required && !val) {
    isValid = false;
    msg = 'هذا الحقل مطلوب';
  } else if (input.name === 'whatsapp') {
    const digits = val.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 15) {
      isValid = false;
      msg = 'أدخل رقم هاتف صحيح (10-15 رقماً)';
    }
  } else if (input.name === 'parentName' && val.length < 3) {
    isValid = false;
    msg = 'يجب أن يكون الاسم 3 أحرف على الأقل';
  } else if (input.name === 'nationalId' && input.required) {
    const res = validateEgyptianNationalID(val);
    if (!res.valid) {
      isValid = false;
      msg = res.message;
    }
  } else if (input.name === 'jobTitle' && input.required && val.length < 3) {
    isValid = false;
    msg = 'يرجى كتابة الوظيفة بوضوح (3 أحرف على الأقل)';
  } else if (input.name === 'studentName' && input.required && val.length < 3) {
    isValid = false;
    msg = 'يجب أن يكون اسم التلميذ 3 أحرف على الأقل';
  } else if (input.name === 'subject' && val.length < 5) {
    isValid = false;
    msg = 'الموضوع يجب أن لا يقل عن 5 أحرف';
  } else if (input.name === 'details' && val.length < 10) {
    isValid = false;
    msg = 'التفاصيل يجب أن لا تقل عن 10 أحرف';
  }

  input.classList.toggle('invalid', !isValid);

  let errSpan = input.parentElement.querySelector('.field-error');
  if (!isValid) {
    if (!errSpan) {
      errSpan = document.createElement('span');
      errSpan.className = 'field-error';
      input.parentElement.appendChild(errSpan);
    }
    errSpan.textContent = msg;
  } else if (errSpan) {
    errSpan.remove();
  }

  return isValid;
}

// ============================================================================
// 7. إرسال النموذج (Submit Form)
// ============================================================================
async function submitForm(e) {
  e.preventDefault();
  const form = e.target;
  const btn = document.getElementById('submitBtn');
  const errBanner = document.getElementById('formError');
  const originalText = btn.innerHTML;

  // التحقق من كافة الحقول الظاهرة والمطلوبة فقط
  let hasErrors = false;
  const requiredInputs = form.querySelectorAll('input[required], select[required], textarea[required]');
  requiredInputs.forEach(inp => {
    const isHiddenStudent = inp.closest('#studentFieldsGroup') && document.getElementById('studentFieldsGroup').style.display === 'none';
    const isHiddenEnthusiast = inp.closest('#enthusiastFieldsGroup') && document.getElementById('enthusiastFieldsGroup').style.display === 'none';
    if (!isHiddenStudent && !isHiddenEnthusiast) {
      if (!validateField(inp)) hasErrors = true;
    }
  });

  if (hasErrors) {
    errBanner.textContent = '⚠️ يرجى تصحيح الأخطاء الموضحة أعلاه قبل الإرسال.';
    errBanner.classList.add('show');
    const firstInvalid = form.querySelector('.invalid');
    if (firstInvalid) firstInvalid.focus();
    return;
  }

  const formData = new FormData(form);
  const isEnthusiast = (selectedType === 'مقترح' && selectedSubmitterType === 'مهتم بالتعليم');

  const payload = {
    action: 'submit',
    type: selectedType,
    submitterType: isEnthusiast ? 'مهتم بالتعليم' : 'ولي أمر',
    parentName: sanitize(formData.get('parentName')),
    whatsapp: sanitize(formData.get('whatsapp')).replace(/\s+/g, ''),
    studentName: isEnthusiast ? 'مهتم بالتعليم' : sanitize(formData.get('studentName')),
    grade: isEnthusiast ? sanitize(formData.get('jobTitle')) : sanitize(formData.get('grade')),
    className: isEnthusiast ? sanitize(formData.get('nationalId')) : sanitize(formData.get('className')),
    nationalId: isEnthusiast ? sanitize(formData.get('nationalId')) : '',
    jobTitle: isEnthusiast ? sanitize(formData.get('jobTitle')) : '',
    subject: sanitize(formData.get('subject')),
    details: sanitize(formData.get('details')),
    incidentDate: selectedType === 'شكوى' ? formData.get('incidentDate') : ''
  };

  // حماية من التكرار خلال 24 ساعة (نفس الهاتف ونفس الموضوع)
  const dupKey = 'dup_' + payload.whatsapp + '_' + payload.subject;
  const lastSubmit = localStorage.getItem(dupKey);
  if (lastSubmit && Date.now() - parseInt(lastSubmit, 10) < 86400000) {
    const confirmResend = confirm('لقد قمت بإرسال طلب بنفس الموضوع ورقم الهاتف خلال آخر 24 ساعة. هل ترغب في التأكيد والإرسال مرة أخرى؟');
    if (!confirmResend) return;
  }

  errBanner.classList.remove('show');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner dark"></span> جاري الإرسال بأمان...';

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    const result = await res.json();

    if (result.success && result.ticketNumber) {
      currentTicket = result.ticketNumber;
      document.getElementById('ticketNumberDisplay').textContent = result.ticketNumber;
      document.getElementById('successType').textContent = selectedType === 'شكوى' ? 'شكواك' : 'مقترحك';

      // فتح نافذة النجاح
      document.getElementById('successOverlay').classList.add('show');

      // تسجيل عملية الإرسال لتفادي التكرار
      localStorage.setItem(dupKey, Date.now().toString());

      // تصفير النموذج والمسودة
      form.reset();
      clearDraft();

      // إعادة تفعيل تبويب الشكوى الافتراضي
      const firstTypeBtn = document.querySelector('.type-btn[data-type="شكوى"]');
      if (firstTypeBtn) selectType(firstTypeBtn);

      // إعادة تعيين العدادات
      document.querySelectorAll('.char-count').forEach(el => {
        el.textContent = '0/' + (el.dataset.for === 'subject' ? '120' : '2000');
        el.classList.remove('warn');
      });

      // إظهار تنبيه نجاح
      showToast('تم تقديم طلبك بنجاح! رقم التذكرة: ' + result.ticketNumber, 'success');
    } else {
      errBanner.textContent = '⚠️ ' + (result.message || 'تعذر استلام الطلب من الخادم.');
      errBanner.classList.add('show');
    }
  } catch (error) {
    console.error('Submission error:', error);
    errBanner.textContent = '⚠️ تعذر الاتصال بالخادم. يرجى التحقق من اتصال الإنترنت والمحاولة مرة أخرى.';
    errBanner.classList.add('show');
    showToast('تعذر الاتصال بالخادم', 'error');
  } finally {
    btn.disabled = false;
    const btnText = selectedType === 'شكوى' ? 'إرسال الشكوى الآن' : 'إرسال المقترح الآن';
    btn.innerHTML = `<span><i class="fas fa-paper-plane"></i></span><span id="submitBtnText">${btnText}</span>`;
  }
}

// ============================================================================
// 8. نسخ وطباعة رقم التذكرة
// ============================================================================
function copyTicket(btn) {
  if (!currentTicket) return;
  const done = () => {
    const orig = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check"></i> تم النسخ!';
    showToast('تم نسخ رقم التذكرة إلى الحافظة', 'success');
    setTimeout(() => { btn.innerHTML = orig; }, 2000);
  };

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(currentTicket).then(done).catch(() => fallbackCopy(currentTicket, done));
  } else {
    fallbackCopy(currentTicket, done);
  }
}

function fallbackCopy(text, cb) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
    cb();
  } catch (e) {
    prompt('انسخ رقم التذكرة يدوياً:', text);
  }
  document.body.removeChild(ta);
}

function printTicket() {
  if (!currentTicket) return;
  const w = window.open('', '_blank');
  w.document.write(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>تذكرة متابعة - ${escapeHtml(currentTicket)}</title>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@500;800;900&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Tajawal', sans-serif; text-align: center; padding: 40px; color: #0f2c52; direction: rtl; }
        .card { border: 2px dashed #0284c7; padding: 30px; border-radius: 20px; max-width: 420px; margin: auto; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
        .logo-img { width: 75px; height: 75px; border-radius: 50%; object-fit: cover; border: 2.5px solid #f59e0b; margin-bottom: 12px; }
        h2 { font-size: 22px; margin-bottom: 6px; color: #0f2c52; }
        .school { font-size: 14.5px; color: #0f2c52; font-weight: 800; margin-bottom: 3px; }
        .admin-line { font-size: 12.5px; color: #64748b; margin-bottom: 20px; font-weight: 600; }
        .num-label { font-size: 13px; color: #0284c7; font-weight: 700; }
        .num { font-size: 32px; font-weight: 900; font-family: 'Courier New', monospace; letter-spacing: 2px; color: #0f2c52; margin: 10px 0 20px; }
        .info { font-size: 13px; color: #475569; line-height: 1.8; margin-bottom: 20px; border-top: 1px solid #e2e8f0; padding-top: 15px; }
        .hint { color: #d97706; font-size: 12px; font-weight: 700; background: #fef3c7; padding: 10px; border-radius: 8px; }
        @media print { .no-print { display: none; } }
      </style>
    </head>
    <body>
      <div class="card">
        <img src="images/logo.jpg" alt="شعار مدرسة دشاشة الابتدائية 1" class="logo-img">
        <h2>🎫 تذكرة المتابعة الإلكترونية</h2>
        <div class="school">مدرسة دشاشة الابتدائية 1</div>
        <div class="admin-line">إدارة سمسطا التعليمية &bull; مديرية التربية والتعليم ببني سويف</div>
        <div class="num-label">رقم التذكرة الرسمي</div>
        <div class="num">${escapeHtml(currentTicket)}</div>
        <div class="info">
          احتفظ بهذه التذكرة للاستعلام عن الرد وتفاصيل المتابعة في أي وقت عبر البوابة الإلكترونية.
        </div>
        <div class="hint">⚠️ يلزم إدخال هذا الرقم ورقم الهاتف المسجل لمتابعة الرد</div>
      </div>
      <script>
        window.onload = function() { window.print(); }
      <\/script>
    </body>
    </html>
  `);
  w.document.close();
}

function closeSuccess() {
  document.getElementById('successOverlay').classList.remove('show');
}

// ============================================================================
// 9. نافذة متابعة الطلب (Track Ticket)
// ============================================================================
function openTrackModal() {
  const modal = document.getElementById('trackModal');
  const resultDiv = document.getElementById('trackResult');
  modal.classList.add('show');
  resultDiv.classList.remove('show');
  resultDiv.innerHTML = '';
  document.getElementById('trackTicketInput').value = '';
  document.getElementById('trackPhoneInput').value = '';
  setTimeout(() => document.getElementById('trackTicketInput').focus(), 250);
}

function closeTrackModal() {
  document.getElementById('trackModal').classList.remove('show');
}

async function trackTicket() {
  const ticket = document.getElementById('trackTicketInput').value.trim().toUpperCase();
  const phone = document.getElementById('trackPhoneInput').value.trim();
  const resultDiv = document.getElementById('trackResult');
  const btn = document.getElementById('trackBtn');

  if (!ticket || !phone) {
    resultDiv.innerHTML = '<div class="result-error">⚠️ يرجى إدخال رقم التذكرة ورقم الهاتف معاً.</div>';
    resultDiv.classList.add('show');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> جاري البحث في السجلات...';
  resultDiv.classList.remove('show');

  try {
    const url = `${APPS_SCRIPT_URL}?action=getTicket&ticket=${encodeURIComponent(ticket)}&phone=${encodeURIComponent(phone)}`;
    const res = await fetch(url);
    const result = await res.json();

    if (result.success && result.data) {
      renderTrackResult(result.data);
    } else {
      resultDiv.innerHTML = `<div class="result-error">❌ ${escapeHtml(result.message || 'لم يتم العثور على طلب مطابق للمعلومات المدخلة.')}</div>`;
      resultDiv.classList.add('show');
    }
  } catch (err) {
    console.error('Tracking error:', err);
    resultDiv.innerHTML = '<div class="result-error">❌ تعذر الاتصال بالخادم. تحقق من الشبكة وحاول مجدداً.</div>';
    resultDiv.classList.add('show');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-search"></i> عرض حالة الطلب';
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

function renderTrackResult(raw) {
  if (!raw) return;

  let parentName = raw.ParentName || raw.parentName || raw['ولي الأمر'] || raw['اسم ولي الأمر'] || raw['اسم ولي الامر'] || '';
  if (!parentName) {
    const entry = Object.entries(raw).find(([k]) => k.includes('ولي'));
    if (entry) parentName = entry[1];
  }

  const studentVal = raw.StudentName || raw.studentName || raw['التلميذ'] || '';
  const isEnthusiast = (
    raw.SubmitterType === 'مهتم بالتعليم' ||
    raw.submitterType === 'مهتم بالتعليم' ||
    raw.userRole === 'مهتم بالتعليم' ||
    String(studentVal).includes('مهتم بالتعليم')
  );

  const d = {
    TicketNumber: raw.TicketNumber || raw.ticketNumber || raw['رقم التذكرة'] || '',
    Type: raw.Type || raw.type || raw['النوع'] || 'طلب',
    UserRole: isEnthusiast ? 'مهتم بالتعليم' : 'ولي أمر',
    ParentName: String(parentName || '').trim(),
    Subject: raw.Subject || raw.subject || raw['الموضوع'] || '',
    StudentName: isEnthusiast ? '' : studentVal,
    Grade: raw.Grade || raw.grade || raw['الصف'] || '',
    Class: cleanClassName(raw.Class || raw.className || raw.class || raw['الفصل'] || ''),
    JobTitle: raw.JobTitle || raw.jobTitle || (isEnthusiast ? (raw.Grade || raw.grade || '') : ''),
    Status: raw.Status || raw.status || raw['الحالة'] || 'قيد المراجعة',
    AdminReply: raw.AdminReply || raw.adminReply || raw.reply || raw['الرد'] || '',
    ReplyDate: raw.ReplyDate || raw.replyDate || raw['تاريخ الرد'] || ''
  };

  const div = document.getElementById('trackResult');
  const isReplied = Boolean(d.AdminReply && d.AdminReply.trim().length > 0) || String(d.Status).includes('الرد');
  const badge = isReplied
    ? '<span class="status-badge badge-replied"><i class="fas fa-check-circle"></i> تم الرد من الإدارة</span>'
    : '<span class="status-badge badge-new"><i class="fas fa-clock"></i> قيد المراجعة والمتابعة</span>';

  const replyDateFormatted = d.ReplyDate ? `<small style="font-size:11px; opacity:0.85; margin-right:6px;">(${formatDate(d.ReplyDate)})</small>` : '';

  const parentGreeting = d.ParentName
    ? `السلام عليكم ورحمة الله، أستاذ/ة ${escapeHtml(d.ParentName)} المحترم/ة،`
    : `السلام عليكم ورحمة الله، صاحب الطلب المحترم/ة،`;

  const replyHtml = isReplied && d.AdminReply
    ? `<div class="reply-box">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px solid rgba(5,150,105,0.2); padding-bottom:6px;">
          <span class="reply-title" style="margin:0; font-weight:800;"><i class="fas fa-comment-dots"></i> رد قيادة المدرسة:</span>
          ${replyDateFormatted}
        </div>
        <div class="reply-greeting">
          ${parentGreeting}
        </div>
        <div class="reply-text">
          ${escapeHtml(d.AdminReply)}
        </div>
        <div style="font-size:12px; color:var(--text-muted); font-weight:700; text-align:left; margin-top:8px;">
          مع تحيات إدارة مدرسة دشاشة الابتدائية 1 🏫
        </div>
      </div>`
    : `<div style="color:var(--text-muted);text-align:center;padding:12px;background:var(--bg);border-radius:12px;margin-top:12px;font-size:13.5px;"><i class="fas fa-hourglass-half"></i> طلبكم قيد الاهتمام والمراجعة من إدارة مدرسة دشاشة الابتدائية 1، وسيتم الرد قريباً.</div>`;

  div.innerHTML = `
    <div class="result-card ${isReplied ? 'replied' : ''}">
      <div class="result-row"><strong>رقم التذكرة:</strong> <code>${escapeHtml(d.TicketNumber)}</code></div>
      ${d.ParentName ? `<div class="result-row"><strong>${isEnthusiast ? 'مقدم المقترح' : 'ولي الأمر'}:</strong> ${escapeHtml(d.ParentName)}</div>` : ''}
      <div class="result-row"><strong>نوع الطلب:</strong> ${escapeHtml(d.Type)}</div>
      ${isEnthusiast ? `
        <div class="result-row"><strong>صفة مقدم الطلب:</strong> <span class="status-badge" style="background:#e0e7ff; color:#3730a3; font-size:12px; font-weight:700;"><i class="fas fa-graduation-cap"></i> مهتم بالتعليم</span></div>
        ${d.JobTitle ? `<div class="result-row"><strong>الوظيفة الحالية:</strong> ${escapeHtml(d.JobTitle)}</div>` : ''}
      ` : `
        <div class="result-row"><strong>التلميذ:</strong> ${escapeHtml(d.StudentName)} - ${escapeHtml(d.Grade)} / فصل ${escapeHtml(d.Class)}</div>
      `}
      <div class="result-row"><strong>موضوع الطلب:</strong> ${escapeHtml(d.Subject)}</div>
      <div class="result-row"><strong>حالة الطلب:</strong> ${badge}</div>
      ${replyHtml}
    </div>`;
  div.classList.add('show');
}

// ============================================================================
// 10. أدوات المساعدة وإشعارات Toast
// ============================================================================
function showToast(message, type = 'info') {
  let toast = document.getElementById('appToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'appToast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.className = `toast show ${type}`;

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
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

function sanitize(str) {
  if (!str) return '';
  return String(str).trim().replace(/[<>]/g, '');
}

// مراقبة الاتصال بالإنترنت
function initNetworkListeners() {
  window.addEventListener('online', () => showToast('تمت استعادة الاتصال بالإنترنت 🌐', 'success'));
  window.addEventListener('offline', () => showToast('أنت حالياً غير متصل بالإنترنت ⚠️', 'error'));
}

// إغلاق النوافذ بمفتاح Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const trackModal = document.getElementById('trackModal');
    const successOverlay = document.getElementById('successOverlay');
    if (trackModal && trackModal.classList.contains('show')) closeTrackModal();
    if (successOverlay && successOverlay.classList.contains('show')) closeSuccess();
  }
});

// ============================================================================
// 11. تسجيل الـ Service Worker لـ PWA
// ============================================================================
function initServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => console.log('Service Worker registered:', reg.scope))
        .catch(err => console.log('SW registration failed:', err));
    });
  }
}
