/**
 * ============================================================================
 *  نظام إدارة الشكاوى والمقترحات المدرسية - الخادم الخلفي
 *  School Complaint & Suggestion Management System - Backend
 * ============================================================================
 *
 *  تعليمات النشر على Google Apps Script:
 *  ─────────────────────────────────────
 *  ١. افتح Google Sheets جديد وأنشئ ورقة باسم "Complaints"
 *  ٢. أضف الرؤوس التالية في الصف الأول (A1 إلى N1):
 *     رقم التذكرة | التاريخ | النوع | ولي الأمر | الهاتف | التلميذ |
 *     الصف | الفصل | الموضوع | التفاصيل | تاريخ الواقعة | الحالة |
 *     الرد | تاريخ الرد
 *  ٣. من القائمة: الإضافات > Apps Script
 *  ٤. احذف محتوى الملف الافتراضي والصق هذا الكود بالكامل
 *  ٥. عدّل الإعدادات أدناه (كلمة المرور، البريد الإلكتروني، إلخ)
 *  ٦. من القائمة: نشر > نشر كتطبيق ويب
 *     - تنفيذ التطبيق بصفتي: أنا (حسابك)
 *     - من لديه حق الوصول: أي شخص (Anyone)
 *  ٧. انسخ رابط التطبيق واستخدمه في الواجهة الأمامية
 *
 *  ملاحظات مهمة:
 *  ─────────────
 *  - غيّر ADMIN_PASSWORD إلى كلمة مرور قوية خاصة بك
 *  - غيّر ADMIN_EMAIL إلى بريدك الإلكتروني الفعلي لتلقي الإشعارات
 *  - يمكنك تفعيل إشعارات Webhook (Discord/Telegram) بتعبئة الرابط المناسب
 *  - أول تشغيل: استدعِ الدالة initializeSystem() من المحرر لإعداد العدّاد
 *
 * ============================================================================
 */

// ─────────────────────────────────────────────
//  الإعدادات العامة - عدّلها حسب احتياجاتك
// ─────────────────────────────────────────────

/** اسم ورقة البيانات في Google Sheets */
const SHEET_NAME = 'Complaints';

/** كلمة مرور لوحة تحكم المسؤول - غيّرها فوراً! */
const ADMIN_PASSWORD = 'Samsata@2025';

/** بريد المسؤول لاستلام الإشعارات */
const ADMIN_EMAIL = 'admin@example.com';

/** الحد الأقصى للطلبات لكل هاتف في الساعة */
const MAX_SUBMISSIONS_PER_HOUR = 3;

/** بادئة رقم التذكرة */
const TICKET_PREFIX = 'SMT';

/** رابط Webhook اختياري لإشعارات Discord (اتركه فارغاً لتعطيله) */
const DISCORD_WEBHOOK_URL = '';

/** رابط Webhook اختياري لإشعارات Telegram */
const TELEGRAM_BOT_TOKEN = '';
const TELEGRAM_CHAT_ID = '';

/** الحدود القصوى لأطوال الحقول */
const MAX_LENGTHS = {
  parentName: 60,
  studentName: 60,
  subject: 120,
  details: 2000,
  className: 10,
  whatsapp: 15,
  reply: 1500
};

/** الحدود الدنيا لأطوال الحقول */
const MIN_LENGTHS = {
  parentName: 3,
  studentName: 3,
  subject: 5,
  details: 10,
  reply: 2
};

/** أنواع الطلبات المسموح بها */
const ALLOWED_TYPES = ['شكوى', 'مقترح'];

/** الحالات المسموح بها */
const ALLOWED_STATUSES = ['جديد', 'قيد المراجعة', 'تم الرد', 'مغلق', 'مؤرشف'];

/** أعمدة الورقة (مبنية على الصفر) */
const COLUMNS = {
  TICKET: 0,       // A - رقم التذكرة
  DATE: 1,         // B - التاريخ
  TYPE: 2,         // C - النوع
  PARENT: 3,       // D - ولي الأمر
  PHONE: 4,        // E - الهاتف
  STUDENT: 5,      // F - التلميذ
  GRADE: 6,        // G - الصف
  CLASS: 7,        // H - الفصل
  SUBJECT: 8,      // I - الموضوع
  DETAILS: 9,      // J - التفاصيل
  INCIDENT_DATE: 10, // K - تاريخ الواقعة
  STATUS: 11,      // L - الحالة
  REPLY: 12,       // M - الرد
  REPLY_DATE: 13   // N - تاريخ الرد
};

/** عدد الأعمدة الإجمالي */
const TOTAL_COLUMNS = 14;


// ─────────────────────────────────────────────
//  نقطة الدخول الرئيسية - POST
// ─────────────────────────────────────────────

/**
 * معالج طلبات POST الرئيسي
 * يستقبل جميع الطلبات ويوجهها للدوال المناسبة
 * @param {Object} e - كائن الحدث من Google Apps Script
 * @returns {TextOutput} استجابة JSON
 */
function doPost(e) {
  try {
    // تسجيل الطلب للتدقيق
    logRequest('POST', e);

    // التحقق من وجود بيانات
    if (!e || !e.postData || !e.postData.contents) {
      return corsJsonResponse({ success: false, message: 'لم يتم استلام بيانات صالحة.' });
    }

    let data;
    try {
      data = JSON.parse(e.postData.contents);
    } catch (parseErr) {
      return corsJsonResponse({ success: false, message: 'تنسيق البيانات غير صالح. يُرجى إرسال JSON صحيح.' });
    }

    // التوجيه حسب نوع العملية
    const action = String(data.action || 'submit').trim().toLowerCase();

    switch (action) {
      case 'submit':
        return handleNewSubmission(data);

      case 'adminlogin':
        return handleAdminLogin(data);

      case 'reply':
        return handleAdminReply(data);

      case 'updatestatus':
        return handleUpdateStatus(data);

      case 'archive':
        return handleArchive(data);

      case 'export':
        return handleExportCSV(data);

      case 'stats':
        return handleAdminStats(data);

      default:
        return corsJsonResponse({
          success: false,
          message: 'عملية غير معروفة: ' + sanitize(action)
        });
    }
  } catch (err) {
    Logger.log('خطأ عام في doPost: ' + err.message + '\n' + err.stack);
    return corsJsonResponse({
      success: false,
      message: 'حدث خطأ غير متوقع في الخادم. يُرجى المحاولة لاحقاً.'
    });
  }
}


// ─────────────────────────────────────────────
//  نقطة الدخول الرئيسية - GET
// ─────────────────────────────────────────────

/**
 * معالج طلبات GET الرئيسي
 * يُستخدم للاستعلام عن التذاكر وفحص صحة النظام
 * @param {Object} e - كائن الحدث من Google Apps Script
 * @returns {TextOutput} استجابة JSON
 */
function doGet(e) {
  try {
    logRequest('GET', e);

    const action = String((e && e.parameter && e.parameter.action) || 'health').trim().toLowerCase();

    switch (action) {
      case 'getticket':
        return handleGetTicket(e.parameter);

      case 'health':
        return handleHealthCheck();

      default:
        return corsJsonResponse({
          success: false,
          message: 'عملية GET غير معروفة.'
        });
    }
  } catch (err) {
    Logger.log('خطأ عام في doGet: ' + err.message + '\n' + err.stack);
    return corsJsonResponse({
      success: false,
      message: 'حدث خطأ غير متوقع في الخادم.'
    });
  }
}


// ─────────────────────────────────────────────
//  تقديم شكوى / مقترح جديد
// ─────────────────────────────────────────────

/**
 * معالجة تقديم شكوى أو مقترح جديد
 * يتضمن: التحقق → تحديد المعدل → القفل → الحفظ → الإشعار
 * @param {Object} data - بيانات الطلب
 * @returns {TextOutput} استجابة JSON
 */
function handleNewSubmission(data) {
  // ١. التحقق من صحة البيانات
  const errors = validateSubmission(data);
  if (errors.length > 0) {
    return corsJsonResponse({
      success: false,
      message: errors[0],
      errors: errors
    });
  }

  // ٢. تطبيع رقم الهاتف والتحقق من حد المعدل
  const normalizedPhone = normalizePhone(data.whatsapp);
  if (!checkRateLimit(normalizedPhone)) {
    return corsJsonResponse({
      success: false,
      message: 'لقد تجاوزت الحد المسموح من الطلبات (' + MAX_SUBMISSIONS_PER_HOUR + ' طلبات في الساعة). يُرجى المحاولة لاحقاً.'
    });
  }

  // ٣. الحصول على قفل لمنع التعارض
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) {
    return corsJsonResponse({
      success: false,
      message: 'الخادم مشغول حالياً. يُرجى المحاولة بعد لحظات.'
    });
  }

  try {
    const sheet = getSheet();

    // ٤. إنشاء رقم تذكرة فريد باستخدام عدّاد ذري
    const ticketNumber = generateTicketNumber();

    // ٥. التحقق من صحة تاريخ الواقعة
    const incidentDate = validateAndFormatDate(data.incidentDate);

    // ٦. حفظ البيانات في الورقة
    const row = [
      ticketNumber,                       // رقم التذكرة
      new Date(),                         // تاريخ التقديم
      sanitize(data.type),                // النوع
      sanitize(data.parentName),          // ولي الأمر
      normalizedPhone,                    // الهاتف (مُطبَّع)
      sanitize(data.studentName),         // التلميذ
      sanitize(data.grade),               // الصف
      sanitize(data.className),           // الفصل
      sanitize(data.subject),             // الموضوع
      sanitize(data.details),             // التفاصيل
      incidentDate,                       // تاريخ الواقعة
      'جديد',                             // الحالة
      '',                                 // الرد
      ''                                  // تاريخ الرد
    ];

    sheet.appendRow(row);

    // ٧. زيادة عدّاد المعدل
    incrementRateLimit(normalizedPhone);

    // ٨. إرسال الإشعارات (في الخلفية، لا تمنع الاستجابة)
    try {
      notifyAdmin(ticketNumber, data);
      notifyWebhooks(ticketNumber, data);
    } catch (notifyErr) {
      Logger.log('فشل إرسال الإشعار: ' + notifyErr.message);
    }

    return corsJsonResponse({
      success: true,
      ticketNumber: ticketNumber,
      message: 'تم تقديم طلبك بنجاح. رقم التذكرة: ' + ticketNumber
    });
  } finally {
    lock.releaseLock();
  }
}


// ─────────────────────────────────────────────
//  استعلام عن تذكرة
// ─────────────────────────────────────────────

/**
 * البحث عن تذكرة باستخدام رقمها ورقم الهاتف
 * يتطلب تطابق الرقمين للحماية
 * @param {Object} params - معاملات الطلب
 * @returns {TextOutput} استجابة JSON
 */
function handleGetTicket(params) {
  const ticket = String(params.ticket || '').trim().toUpperCase();
  const phone = normalizePhone(params.phone || '');

  if (!ticket) {
    return corsJsonResponse({ success: false, message: 'يُرجى إدخال رقم التذكرة.' });
  }
  if (!phone || phone.length < 9) {
    return corsJsonResponse({ success: false, message: 'يُرجى إدخال رقم هاتف صحيح.' });
  }

  // التحقق من تنسيق رقم التذكرة
  const ticketPattern = new RegExp('^' + TICKET_PREFIX + '-\\d{4}-\\d{4,}$');
  if (!ticketPattern.test(ticket)) {
    return corsJsonResponse({ success: false, message: 'تنسيق رقم التذكرة غير صحيح. المتوقع: ' + TICKET_PREFIX + '-YYYY-XXXX' });
  }

  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  for (var i = 1; i < data.length; i++) {
    var rowTicket = String(data[i][COLUMNS.TICKET]).trim().toUpperCase();
    var rowPhone = normalizePhone(data[i][COLUMNS.PHONE]);

    // مقارنة مرنة لآخر ٩ أرقام (لاختلاف رمز الدولة)
    if (rowTicket === ticket && phonesMatch(rowPhone, phone)) {
      // إرجاع البيانات الآمنة فقط (بدون بيانات حساسة)
      var result = {
        ticketNumber: data[i][COLUMNS.TICKET],
        date: data[i][COLUMNS.DATE],
        type: data[i][COLUMNS.TYPE],
        parentName: data[i][COLUMNS.PARENT],
        studentName: data[i][COLUMNS.STUDENT],
        grade: data[i][COLUMNS.GRADE],
        className: data[i][COLUMNS.CLASS],
        subject: data[i][COLUMNS.SUBJECT],
        details: data[i][COLUMNS.DETAILS],
        incidentDate: data[i][COLUMNS.INCIDENT_DATE],
        status: data[i][COLUMNS.STATUS],
        reply: data[i][COLUMNS.REPLY],
        replyDate: data[i][COLUMNS.REPLY_DATE]
      };

      return corsJsonResponse({ success: true, data: result });
    }
  }

  return corsJsonResponse({ success: false, message: 'لم يتم العثور على طلب مطابق. تأكد من رقم التذكرة ورقم الهاتف.' });
}


// ─────────────────────────────────────────────
//  تسجيل دخول المسؤول
// ─────────────────────────────────────────────

/**
 * معالجة تسجيل دخول المسؤول وإرجاع جميع الشكاوى
 * @param {Object} data - بيانات تسجيل الدخول
 * @returns {TextOutput} استجابة JSON
 */
function handleAdminLogin(data) {
  if (!verifyAdminPassword(data.password)) {
    // تأخير بسيط لمنع هجمات القوة الغاشمة
    Utilities.sleep(1000);
    return corsJsonResponse({ success: false, message: 'كلمة المرور غير صحيحة.' });
  }

  const sheet = getSheet();
  const values = sheet.getDataRange().getValues();
  const headers = values[0];

  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var obj = { rowIndex: i + 1 };
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = values[i][j];
    }
    rows.push(obj);
  }

  return corsJsonResponse({
    success: true,
    data: rows,
    totalCount: rows.length,
    timestamp: new Date().toISOString()
  });
}


// ─────────────────────────────────────────────
//  رد المسؤول على شكوى
// ─────────────────────────────────────────────

/**
 * معالجة رد المسؤول على شكوى معينة
 * يتطلب كلمة المرور + رقم الصف + نص الرد
 * @param {Object} data - بيانات الرد
 * @returns {TextOutput} استجابة JSON
 */
function handleAdminReply(data) {
  // ١. التحقق من صلاحية المسؤول
  if (!verifyAdminPassword(data.password)) {
    return corsJsonResponse({ success: false, message: 'كلمة المرور غير صحيحة.' });
  }

  // ٢. التحقق من نص الرد
  var reply = String(data.reply || '').trim();
  if (reply.length < MIN_LENGTHS.reply) {
    return corsJsonResponse({ success: false, message: 'الرد قصير جداً. يجب أن يكون ' + MIN_LENGTHS.reply + ' حرف على الأقل.' });
  }
  if (reply.length > MAX_LENGTHS.reply) {
    return corsJsonResponse({ success: false, message: 'الرد طويل جداً. الحد الأقصى ' + MAX_LENGTHS.reply + ' حرف.' });
  }

  // ٣. تنظيف الرد
  reply = sanitize(reply);

  // ٤. التحقق من رقم الصف
  var sheet = getSheet();
  var lastRow = sheet.getLastRow();
  var rowIndex = parseInt(data.rowIndex, 10);

  if (isNaN(rowIndex) || rowIndex < 2 || rowIndex > lastRow) {
    return corsJsonResponse({ success: false, message: 'رقم الصف غير صالح. يجب أن يكون بين 2 و ' + lastRow + '.' });
  }

  // ٥. الحصول على قفل لمنع التعارض
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    return corsJsonResponse({ success: false, message: 'الخادم مشغول. يُرجى المحاولة لاحقاً.' });
  }

  try {
    // ٦. تحديث الحالة والرد وتاريخ الرد
    var range = sheet.getRange(rowIndex, COLUMNS.STATUS + 1, 1, 3); // الحالة + الرد + تاريخ الرد
    range.setValues([['تم الرد', reply, new Date()]]);

    // ٧. قراءة رقم هاتف ولي الأمر
    var parentWhatsapp = sheet.getRange(rowIndex, COLUMNS.PHONE + 1).getValue();
    var ticketNumber = sheet.getRange(rowIndex, COLUMNS.TICKET + 1).getValue();

    return corsJsonResponse({
      success: true,
      message: 'تم إرسال الرد بنجاح.',
      parentWhatsapp: parentWhatsapp,
      ticketNumber: ticketNumber
    });
  } finally {
    lock.releaseLock();
  }
}


// ─────────────────────────────────────────────
//  تحديث حالة الشكوى
// ─────────────────────────────────────────────

/**
 * تحديث حالة شكوى (جديد، قيد المراجعة، مغلق، إلخ)
 * @param {Object} data - بيانات التحديث
 * @returns {TextOutput} استجابة JSON
 */
function handleUpdateStatus(data) {
  if (!verifyAdminPassword(data.password)) {
    return corsJsonResponse({ success: false, message: 'كلمة المرور غير صحيحة.' });
  }

  var newStatus = String(data.status || '').trim();
  if (ALLOWED_STATUSES.indexOf(newStatus) === -1) {
    return corsJsonResponse({
      success: false,
      message: 'حالة غير صالحة. الحالات المسموحة: ' + ALLOWED_STATUSES.join('، ')
    });
  }

  var sheet = getSheet();
  var lastRow = sheet.getLastRow();
  var rowIndex = parseInt(data.rowIndex, 10);

  if (isNaN(rowIndex) || rowIndex < 2 || rowIndex > lastRow) {
    return corsJsonResponse({ success: false, message: 'رقم الصف غير صالح.' });
  }

  sheet.getRange(rowIndex, COLUMNS.STATUS + 1).setValue(newStatus);

  return corsJsonResponse({
    success: true,
    message: 'تم تحديث الحالة إلى: ' + newStatus
  });
}


// ─────────────────────────────────────────────
//  أرشفة الشكاوى
// ─────────────────────────────────────────────

/**
 * أرشفة شكوى عبر تغيير حالتها إلى "مؤرشف"
 * أو أرشفة جميع الشكاوى المغلقة دفعة واحدة
 * @param {Object} data - بيانات الأرشفة
 * @returns {TextOutput} استجابة JSON
 */
function handleArchive(data) {
  if (!verifyAdminPassword(data.password)) {
    return corsJsonResponse({ success: false, message: 'كلمة المرور غير صحيحة.' });
  }

  var sheet = getSheet();

  // أرشفة صف واحد
  if (data.rowIndex) {
    var rowIndex = parseInt(data.rowIndex, 10);
    var lastRow = sheet.getLastRow();

    if (isNaN(rowIndex) || rowIndex < 2 || rowIndex > lastRow) {
      return corsJsonResponse({ success: false, message: 'رقم الصف غير صالح.' });
    }

    sheet.getRange(rowIndex, COLUMNS.STATUS + 1).setValue('مؤرشف');
    return corsJsonResponse({ success: true, message: 'تمت أرشفة الشكوى بنجاح.' });
  }

  // أرشفة جميع الشكاوى المغلقة
  if (data.archiveAll === true) {
    var values = sheet.getDataRange().getValues();
    var archivedCount = 0;

    for (var i = 1; i < values.length; i++) {
      if (values[i][COLUMNS.STATUS] === 'مغلق') {
        sheet.getRange(i + 1, COLUMNS.STATUS + 1).setValue('مؤرشف');
        archivedCount++;
      }
    }

    return corsJsonResponse({
      success: true,
      message: 'تمت أرشفة ' + archivedCount + ' شكوى مغلقة.',
      archivedCount: archivedCount
    });
  }

  return corsJsonResponse({ success: false, message: 'يُرجى تحديد رقم الصف أو تفعيل أرشفة الكل.' });
}


// ─────────────────────────────────────────────
//  إحصائيات المسؤول
// ─────────────────────────────────────────────

/**
 * إرجاع إحصائيات ملخصة عن الشكاوى والمقترحات
 * @param {Object} data - بيانات الطلب (تتطلب كلمة المرور)
 * @returns {TextOutput} استجابة JSON
 */
function handleAdminStats(data) {
  if (!verifyAdminPassword(data.password)) {
    return corsJsonResponse({ success: false, message: 'كلمة المرور غير صحيحة.' });
  }

  var sheet = getSheet();
  var values = sheet.getDataRange().getValues();

  var stats = {
    total: 0,
    byStatus: {},
    byType: {},
    byGrade: {},
    thisMonth: 0,
    thisWeek: 0,
    averageResponseTimeHours: 0
  };

  var now = new Date();
  var weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  var monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  var totalResponseTime = 0;
  var respondedCount = 0;

  for (var i = 1; i < values.length; i++) {
    stats.total++;

    // حسب الحالة
    var status = String(values[i][COLUMNS.STATUS] || 'غير محدد');
    stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

    // حسب النوع
    var type = String(values[i][COLUMNS.TYPE] || 'غير محدد');
    stats.byType[type] = (stats.byType[type] || 0) + 1;

    // حسب الصف
    var grade = String(values[i][COLUMNS.GRADE] || 'غير محدد');
    stats.byGrade[grade] = (stats.byGrade[grade] || 0) + 1;

    // الشكاوى هذا الشهر
    var submissionDate = new Date(values[i][COLUMNS.DATE]);
    if (submissionDate >= monthStart) stats.thisMonth++;
    if (submissionDate >= weekAgo) stats.thisWeek++;

    // حساب متوسط وقت الرد
    var replyDate = values[i][COLUMNS.REPLY_DATE];
    if (replyDate && submissionDate) {
      var diff = new Date(replyDate).getTime() - submissionDate.getTime();
      if (diff > 0) {
        totalResponseTime += diff;
        respondedCount++;
      }
    }
  }

  if (respondedCount > 0) {
    stats.averageResponseTimeHours = Math.round(totalResponseTime / respondedCount / (1000 * 60 * 60) * 10) / 10;
  }

  return corsJsonResponse({
    success: true,
    stats: stats,
    generatedAt: new Date().toISOString()
  });
}


// ─────────────────────────────────────────────
//  تصدير البيانات كـ CSV
// ─────────────────────────────────────────────

/**
 * تصدير جميع البيانات بتنسيق CSV
 * @param {Object} data - بيانات الطلب (تتطلب كلمة المرور)
 * @returns {TextOutput} ملف CSV أو استجابة JSON
 */
function handleExportCSV(data) {
  if (!verifyAdminPassword(data.password)) {
    return corsJsonResponse({ success: false, message: 'كلمة المرور غير صحيحة.' });
  }

  var sheet = getSheet();
  var values = sheet.getDataRange().getValues();

  // تحويل إلى CSV
  var csvLines = [];
  for (var i = 0; i < values.length; i++) {
    var line = [];
    for (var j = 0; j < values[i].length; j++) {
      var cell = String(values[i][j] || '');
      // تغليف الخلايا التي تحتوي على فاصلة أو سطر جديد أو علامة اقتباس
      if (cell.indexOf(',') !== -1 || cell.indexOf('\n') !== -1 || cell.indexOf('"') !== -1) {
        cell = '"' + cell.replace(/"/g, '""') + '"';
      }
      line.push(cell);
    }
    csvLines.push(line.join(','));
  }

  var csvContent = '\uFEFF' + csvLines.join('\n'); // BOM لدعم العربية في Excel

  return ContentService
    .createTextOutput(csvContent)
    .setMimeType(ContentService.MimeType.CSV);
}


// ─────────────────────────────────────────────
//  فحص صحة النظام
// ─────────────────────────────────────────────

/**
 * نقطة نهاية لفحص صحة النظام وحالته
 * @returns {TextOutput} استجابة JSON
 */
function handleHealthCheck() {
  try {
    var sheet = getSheet();
    var rowCount = Math.max(0, sheet.getLastRow() - 1);
    var props = PropertiesService.getScriptProperties();
    var counter = parseInt(props.getProperty('ticketCounter') || '0', 10);

    return corsJsonResponse({
      success: true,
      message: 'النظام يعمل بشكل طبيعي.',
      status: 'operational',
      complaintsCount: rowCount,
      ticketCounter: counter,
      serverTime: new Date().toISOString()
    });
  } catch (err) {
    return corsJsonResponse({
      success: false,
      message: 'النظام يواجه مشكلة.',
      status: 'degraded',
      error: err.message
    });
  }
}


// ─────────────────────────────────────────────
//  توليد رقم التذكرة (عدّاد ذري)
// ─────────────────────────────────────────────

/**
 * إنشاء رقم تذكرة فريد باستخدام PropertiesService
 * يضمن عدم تكرار الأرقام حتى في حالة الطلبات المتزامنة
 * @returns {string} رقم التذكرة بصيغة SMT-YYYY-XXXX
 */
function generateTicketNumber() {
  var props = PropertiesService.getScriptProperties();
  var counter = parseInt(props.getProperty('ticketCounter') || '0', 10);
  counter++;
  props.setProperty('ticketCounter', String(counter));

  var year = new Date().getFullYear();
  var paddedCounter = String(counter);
  while (paddedCounter.length < 4) {
    paddedCounter = '0' + paddedCounter;
  }

  return TICKET_PREFIX + '-' + year + '-' + paddedCounter;
}


// ─────────────────────────────────────────────
//  التحقق من صحة البيانات
// ─────────────────────────────────────────────

/**
 * التحقق الشامل من بيانات الشكوى/المقترح
 * @param {Object} d - بيانات الطلب
 * @returns {string[]} مصفوفة بالأخطاء (فارغة = لا أخطاء)
 */
function validateSubmission(d) {
  var errors = [];

  // التحقق من النوع
  if (!d.type || ALLOWED_TYPES.indexOf(d.type) === -1) {
    errors.push('نوع الطلب غير صالح. الأنواع المسموحة: ' + ALLOWED_TYPES.join('، '));
  }

  // اسم ولي الأمر
  if (!d.parentName || String(d.parentName).trim().length < MIN_LENGTHS.parentName) {
    errors.push('اسم ولي الأمر مطلوب (' + MIN_LENGTHS.parentName + ' أحرف على الأقل).');
  } else if (d.parentName.length > MAX_LENGTHS.parentName) {
    errors.push('اسم ولي الأمر طويل جداً (الحد الأقصى ' + MAX_LENGTHS.parentName + ' حرفاً).');
  } else if (!/^[\u0600-\u06FFa-zA-Z\s.]+$/.test(d.parentName.trim())) {
    errors.push('اسم ولي الأمر يجب أن يحتوي على أحرف فقط.');
  }

  // رقم الواتساب
  if (!d.whatsapp) {
    errors.push('رقم الواتساب مطلوب.');
  } else {
    var cleanPhone = String(d.whatsapp).replace(/\D/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      errors.push('رقم الواتساب يجب أن يتكون من ١٠ إلى ١٥ رقماً.');
    }
  }

  // اسم التلميذ
  if (!d.studentName || String(d.studentName).trim().length < MIN_LENGTHS.studentName) {
    errors.push('اسم التلميذ مطلوب (' + MIN_LENGTHS.studentName + ' أحرف على الأقل).');
  } else if (d.studentName.length > MAX_LENGTHS.studentName) {
    errors.push('اسم التلميذ طويل جداً (الحد الأقصى ' + MAX_LENGTHS.studentName + ' حرفاً).');
  }

  // الصف الدراسي
  if (!d.grade || String(d.grade).trim().length === 0) {
    errors.push('الصف الدراسي مطلوب.');
  }

  // الفصل
  if (!d.className || String(d.className).trim().length < 1) {
    errors.push('الفصل مطلوب.');
  } else if (d.className.length > MAX_LENGTHS.className) {
    errors.push('اسم الفصل طويل جداً.');
  }

  // الموضوع
  if (!d.subject || String(d.subject).trim().length < MIN_LENGTHS.subject) {
    errors.push('الموضوع قصير جداً (يجب ' + MIN_LENGTHS.subject + ' أحرف على الأقل).');
  } else if (d.subject.length > MAX_LENGTHS.subject) {
    errors.push('الموضوع طويل جداً (الحد الأقصى ' + MAX_LENGTHS.subject + ' حرفاً).');
  }

  // التفاصيل
  if (!d.details || String(d.details).trim().length < MIN_LENGTHS.details) {
    errors.push('التفاصيل قصيرة جداً (يجب ' + MIN_LENGTHS.details + ' أحرف على الأقل).');
  } else if (d.details.length > MAX_LENGTHS.details) {
    errors.push('التفاصيل طويلة جداً (الحد الأقصى ' + MAX_LENGTHS.details + ' حرفاً).');
  }

  // تاريخ الواقعة (مطلوب للشكوى فقط)
  if (d.type === 'شكوى') {
    if (!d.incidentDate) {
      errors.push('تاريخ الواقعة مطلوب عند تقديم شكوى.');
    } else {
      var parsed = new Date(d.incidentDate);
      if (isNaN(parsed.getTime())) {
        errors.push('تنسيق تاريخ الواقعة غير صحيح.');
      } else if (parsed > new Date()) {
        errors.push('تاريخ الواقعة لا يمكن أن يكون في المستقبل.');
      } else {
        // التحقق من أن التاريخ ليس قديماً جداً (أكثر من سنة)
        var oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        if (parsed < oneYearAgo) {
          errors.push('تاريخ الواقعة قديم جداً (أكثر من سنة).');
        }
      }
    }
  }

  return errors;
}


// ─────────────────────────────────────────────
//  دوال مساعدة
// ─────────────────────────────────────────────

/**
 * تنظيف النصوص من الأحرف الخطرة
 * @param {*} s - النص المراد تنظيفه
 * @returns {string} النص النظيف
 */
function sanitize(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .trim()
    .substring(0, MAX_LENGTHS.details)
    .replace(/[<>]/g, '')        // إزالة أقواس HTML
    .replace(/javascript:/gi, '') // منع حقن JavaScript
    .replace(/on\w+\s*=/gi, ''); // منع أحداث HTML
}

/**
 * تطبيع رقم الهاتف لصيغة موحدة
 * يحول الأرقام المصرية (تبدأ بـ 0) لصيغة دولية (20...)
 * @param {string} p - رقم الهاتف الخام
 * @returns {string} رقم الهاتف المُطبَّع
 */
function normalizePhone(p) {
  var cleaned = String(p || '').replace(/\D/g, '');
  if (cleaned.startsWith('00')) cleaned = cleaned.substring(2);
  if (cleaned.startsWith('0')) cleaned = '20' + cleaned.substring(1);
  return cleaned;
}

/**
 * مقارنة رقمي هاتف مع مرونة في رمز الدولة
 * @param {string} phone1 - الرقم الأول
 * @param {string} phone2 - الرقم الثاني
 * @returns {boolean} هل يتطابقان
 */
function phonesMatch(phone1, phone2) {
  if (phone1 === phone2) return true;
  // مقارنة آخر ٩ أرقام (للتعامل مع اختلاف رمز الدولة)
  if (phone1.length >= 9 && phone2.length >= 9) {
    return phone1.slice(-9) === phone2.slice(-9);
  }
  return false;
}

/**
 * التحقق من صحة التاريخ وتنسيقه
 * @param {string} dateStr - نص التاريخ
 * @returns {string|Date} التاريخ المُنسَّق أو نص فارغ
 */
function validateAndFormatDate(dateStr) {
  if (!dateStr) return '';
  var parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return '';
  return parsed;
}

/**
 * التحقق من كلمة مرور المسؤول
 * يستخدم مقارنة ثابتة الوقت لمنع هجمات التوقيت
 * @param {string} input - كلمة المرور المُدخلة
 * @returns {boolean} هل كلمة المرور صحيحة
 */
function verifyAdminPassword(input) {
  if (!input || typeof input !== 'string') return false;

  var inputStr = String(input);
  var correctStr = ADMIN_PASSWORD;

  // مقارنة ثابتة الوقت
  if (inputStr.length !== correctStr.length) return false;

  var mismatch = 0;
  for (var i = 0; i < correctStr.length; i++) {
    mismatch |= inputStr.charCodeAt(i) ^ correctStr.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * الحصول على ورقة البيانات مع التحقق من وجودها
 * @returns {Sheet} كائن الورقة
 * @throws {Error} إذا لم يتم العثور على الورقة
 */
function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    throw new Error('لم يتم العثور على ورقة البيانات "' + SHEET_NAME + '". تأكد من إنشائها أولاً.');
  }
  return sheet;
}


// ─────────────────────────────────────────────
//  تحديد المعدل (Rate Limiting)
// ─────────────────────────────────────────────

/**
 * التحقق من عدم تجاوز حد الطلبات المسموح
 * @param {string} phone - رقم الهاتف المُطبَّع
 * @returns {boolean} هل يُسمح بطلب جديد
 */
function checkRateLimit(phone) {
  var cache = CacheService.getScriptCache();
  var key = 'rate_' + phone;
  var count = parseInt(cache.get(key) || '0', 10);
  return count < MAX_SUBMISSIONS_PER_HOUR;
}

/**
 * زيادة عدّاد الطلبات لرقم الهاتف
 * @param {string} phone - رقم الهاتف المُطبَّع
 */
function incrementRateLimit(phone) {
  var cache = CacheService.getScriptCache();
  var key = 'rate_' + phone;
  var count = parseInt(cache.get(key) || '0', 10);
  cache.put(key, String(count + 1), 3600); // ينتهي بعد ساعة
}


// ─────────────────────────────────────────────
//  الإشعارات
// ─────────────────────────────────────────────

/**
 * إرسال إشعار بالبريد الإلكتروني للمسؤول
 * @param {string} ticket - رقم التذكرة
 * @param {Object} data - بيانات الشكوى
 */
function notifyAdmin(ticket, data) {
  try {
    if (!ADMIN_EMAIL || ADMIN_EMAIL === 'admin@example.com') return;

    var typeLabel = data.type === 'شكوى' ? '🔴 شكوى' : '🟢 مقترح';
    var subject = typeLabel + ' جديد: ' + ticket;

    var body = [
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '📋 ' + typeLabel + ' جديد',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      '🔖 رقم التذكرة: ' + ticket,
      '📝 النوع: ' + data.type,
      '👤 ولي الأمر: ' + data.parentName,
      '📱 الهاتف: ' + data.whatsapp,
      '🎓 التلميذ: ' + data.studentName,
      '📚 الصف/الفصل: ' + data.grade + ' / ' + data.className,
      '',
      '📌 الموضوع: ' + data.subject,
      '',
      '📄 التفاصيل:',
      data.details,
      '',
      data.incidentDate ? '📅 تاريخ الواقعة: ' + data.incidentDate : '',
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      'تم الإرسال تلقائياً من نظام إدارة الشكاوى المدرسية'
    ].join('\n');

    MailApp.sendEmail({
      to: ADMIN_EMAIL,
      subject: subject,
      body: body
    });
  } catch (err) {
    Logger.log('فشل إرسال البريد الإلكتروني: ' + err.message);
  }
}

/**
 * إرسال إشعارات عبر Webhooks (Discord / Telegram)
 * @param {string} ticket - رقم التذكرة
 * @param {Object} data - بيانات الشكوى
 */
function notifyWebhooks(ticket, data) {
  // إشعار Discord
  if (DISCORD_WEBHOOK_URL) {
    try {
      var discordPayload = {
        embeds: [{
          title: '📋 ' + data.type + ' جديد: ' + ticket,
          color: data.type === 'شكوى' ? 0xFF4444 : 0x44BB44,
          fields: [
            { name: '👤 ولي الأمر', value: data.parentName, inline: true },
            { name: '🎓 التلميذ', value: data.studentName, inline: true },
            { name: '📚 الصف/الفصل', value: data.grade + ' / ' + data.className, inline: true },
            { name: '📌 الموضوع', value: data.subject, inline: false },
            { name: '📄 التفاصيل', value: String(data.details).substring(0, 500), inline: false }
          ],
          timestamp: new Date().toISOString()
        }]
      };

      UrlFetchApp.fetch(DISCORD_WEBHOOK_URL, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(discordPayload),
        muteHttpExceptions: true
      });
    } catch (err) {
      Logger.log('فشل إشعار Discord: ' + err.message);
    }
  }

  // إشعار Telegram
  if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
    try {
      var telegramText = [
        '📋 *' + data.type + ' جديد*',
        '',
        '🔖 رقم التذكرة: `' + ticket + '`',
        '👤 ولي الأمر: ' + data.parentName,
        '🎓 التلميذ: ' + data.studentName,
        '📚 الصف/الفصل: ' + data.grade + ' / ' + data.className,
        '📌 الموضوع: ' + data.subject
      ].join('\n');

      var telegramUrl = 'https://api.telegram.org/bot' + TELEGRAM_BOT_TOKEN + '/sendMessage';
      UrlFetchApp.fetch(telegramUrl, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: telegramText,
          parse_mode: 'Markdown'
        }),
        muteHttpExceptions: true
      });
    } catch (err) {
      Logger.log('فشل إشعار Telegram: ' + err.message);
    }
  }
}


// ─────────────────────────────────────────────
//  الاستجابة مع دعم CORS
// ─────────────────────────────────────────────

/**
 * إنشاء استجابة JSON مع رؤوس CORS
 * ملاحظة: Google Apps Script لا يدعم رؤوس مخصصة في doPost/doGet
 * لكنه يتعامل مع CORS تلقائياً عبر JSONP أو عبر وضع no-cors
 * لذلك نعيد الاستجابة كـ JSON عادي ونعتمد على آلية GAS المدمجة
 * @param {Object} obj - الكائن المراد إرجاعه
 * @returns {TextOutput} استجابة JSON
 */
function corsJsonResponse(obj) {
  // إضافة الطابع الزمني للاستجابة
  if (!obj.timestamp) {
    obj.timestamp = new Date().toISOString();
  }

  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}


// ─────────────────────────────────────────────
//  تسجيل الطلبات
// ─────────────────────────────────────────────

/**
 * تسجيل الطلبات الواردة لأغراض التدقيق والتتبع
 * @param {string} method - نوع الطلب (GET/POST)
 * @param {Object} e - كائن الحدث
 */
function logRequest(method, e) {
  try {
    var logEntry = {
      timestamp: new Date().toISOString(),
      method: method,
      parameters: e && e.parameter ? e.parameter : {},
      hasPostData: !!(e && e.postData)
    };

    // تسجيل معلومات إضافية إن وُجدت
    if (e && e.postData && e.postData.contents) {
      try {
        var parsed = JSON.parse(e.postData.contents);
        logEntry.action = parsed.action || 'submit';
        // لا نسجل كلمات المرور أو البيانات الحساسة
      } catch (_) {
        logEntry.action = 'unknown';
      }
    }

    Logger.log(JSON.stringify(logEntry));
  } catch (err) {
    // فشل التسجيل لا يجب أن يوقف العملية
    Logger.log('فشل تسجيل الطلب: ' + err.message);
  }
}


// ─────────────────────────────────────────────
//  إعداد النظام (يُشغَّل مرة واحدة فقط)
// ─────────────────────────────────────────────

/**
 * دالة الإعداد الأولي - شغّلها مرة واحدة من محرر Apps Script
 * تُنشئ الورقة (إن لم تكن موجودة) وتُعيّن العدّاد
 *
 * الخطوات:
 * ١. افتح محرر Apps Script
 * ٢. اختر هذه الدالة من القائمة المنسدلة
 * ٣. اضغط "تشغيل" (▶)
 * ٤. وافق على الأذونات المطلوبة
 */
function initializeSystem() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);

  // إنشاء الورقة إن لم تكن موجودة
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    Logger.log('تم إنشاء ورقة البيانات: ' + SHEET_NAME);
  }

  // إعداد رؤوس الأعمدة
  var headers = [
    'رقم التذكرة', 'التاريخ', 'النوع', 'ولي الأمر', 'الهاتف',
    'التلميذ', 'الصف', 'الفصل', 'الموضوع', 'التفاصيل',
    'تاريخ الواقعة', 'الحالة', 'الرد', 'تاريخ الرد'
  ];

  // كتابة الرؤوس في الصف الأول فقط إذا كانت الورقة فارغة
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

    // تنسيق صف الرؤوس
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#1a73e8');
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    headerRange.setHorizontalAlignment('center');

    // تجميد الصف الأول
    sheet.setFrozenRows(1);

    // ضبط عرض الأعمدة
    sheet.setColumnWidth(1, 150);  // رقم التذكرة
    sheet.setColumnWidth(2, 150);  // التاريخ
    sheet.setColumnWidth(3, 80);   // النوع
    sheet.setColumnWidth(4, 150);  // ولي الأمر
    sheet.setColumnWidth(5, 130);  // الهاتف
    sheet.setColumnWidth(6, 150);  // التلميذ
    sheet.setColumnWidth(7, 100);  // الصف
    sheet.setColumnWidth(8, 80);   // الفصل
    sheet.setColumnWidth(9, 200);  // الموضوع
    sheet.setColumnWidth(10, 300); // التفاصيل
    sheet.setColumnWidth(11, 130); // تاريخ الواقعة
    sheet.setColumnWidth(12, 100); // الحالة
    sheet.setColumnWidth(13, 300); // الرد
    sheet.setColumnWidth(14, 150); // تاريخ الرد

    Logger.log('تم إعداد رؤوس الأعمدة بنجاح.');
  }

  // إعداد العدّاد إذا لم يكن موجوداً
  var props = PropertiesService.getScriptProperties();
  var currentCounter = props.getProperty('ticketCounter');

  if (currentCounter === null) {
    // حساب العدّاد بناءً على البيانات الموجودة
    var existingRows = Math.max(0, sheet.getLastRow() - 1);
    props.setProperty('ticketCounter', String(existingRows));
    Logger.log('تم تعيين العدّاد إلى: ' + existingRows);
  } else {
    Logger.log('العدّاد موجود مسبقاً: ' + currentCounter);
  }

  Logger.log('✅ تم إعداد النظام بنجاح!');
  Logger.log('يمكنك الآن نشر التطبيق كتطبيق ويب.');
}

/**
 * إعادة تعيين العدّاد يدوياً (استخدم بحذر!)
 * @param {number} value - القيمة الجديدة للعدّاد
 */
function resetTicketCounter(value) {
  var newValue = parseInt(value, 10) || 0;
  PropertiesService.getScriptProperties().setProperty('ticketCounter', String(newValue));
  Logger.log('تم إعادة تعيين العدّاد إلى: ' + newValue);
}
