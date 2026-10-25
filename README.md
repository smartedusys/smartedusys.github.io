# 📋 نظام الشكاوى والمقترحات الإلكترونية

> نظام إلكتروني متكامل لإدارة شكاوى ومقترحات أولياء الأمور في المدارس

[![GitHub Pages](https://img.shields.io/badge/Hosted%20on-GitHub%20Pages-blue?logo=github)](https://github.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🌟 المميزات

### للمستخدمين (أولياء الأمور)
- ✅ تقديم شكاوى ومقترحات بسهولة
- 🎫 الحصول على رقم تذكرة فوري للمتابعة
- 🔍 متابعة حالة الطلب برقم التذكرة ورقم الهاتف
- 📱 تصميم متجاوب يعمل على جميع الأجهزة
- 🌙 دعم الوضع الداكن
- 💾 حفظ المسودات تلقائياً
- 🔒 حماية من الإرسال المكرر

### للإدارة (لوحة التحكم)
- 📊 إحصائيات شاملة ورسوم بيانية
- 🔍 بحث متقدم وفلترة
- 💬 الرد عبر واتساب مباشرة
- 📤 تصدير البيانات بصيغة CSV
- 📝 قوالب ردود جاهزة
- 🔔 تحديث تلقائي للبيانات
- 🔐 تسجيل دخول آمن

---

## 🛠️ التقنيات المستخدمة

| التقنية | الاستخدام |
|---------|-----------|
| HTML5 / CSS3 | واجهة المستخدم |
| JavaScript (ES6+) | المنطق البرمجي |
| Google Apps Script | الخادم (Backend) |
| Google Sheets | قاعدة البيانات |
| GitHub Pages | الاستضافة |
| PWA | دعم التطبيق التقدمي |

---

## 📁 هيكل المشروع

```
مشروع-الشكاوى/
├── index.html              # صفحة تقديم الشكوى/المقترح
├── udaragg.html            # لوحة تحكم الإدارة
├── 404.html                # صفحة الخطأ 404
├── manifest.json           # إعدادات PWA
├── sw.js                   # Service Worker
├── .gitignore              # ملفات Git المتجاهلة
├── LICENSE                 # رخصة MIT
├── README.md               # هذا الملف
├── css/
│   ├── style.css           # أنماط صفحة المستخدم
│   └── dashboard.css       # أنماط لوحة التحكم
├── js/
│   ├── app.js              # سكربت صفحة المستخدم
│   └── dashboard.js        # سكربت لوحة التحكم
└── backend/
    └── apps-script.js      # كود Google Apps Script
```

---

## 🚀 طريقة الاستضافة على GitHub Pages

### الخطوة 1: إنشاء مستودع على GitHub

1. انتقل إلى [github.com](https://github.com) وسجل الدخول (أو أنشئ حساباً جديداً)
2. اضغط على زر **"+"** في الأعلى → **"New repository"**
3. اكتب اسم المستودع مثل: `school-complaints-system`
4. اختر **Public** (عام)
5. ✅ اختر **"Add a README file"** (اختياري)
6. اضغط **"Create repository"**

### الخطوة 2: رفع الملفات

#### الطريقة 1: من واجهة GitHub (الأسهل)
1. افتح المستودع الذي أنشأته
2. اضغط **"Add file"** → **"Upload files"**
3. اسحب جميع ملفات المشروع إلى النافذة
4. اكتب وصفاً مثل: "رفع ملفات المشروع"
5. اضغط **"Commit changes"**

#### الطريقة 2: باستخدام Git (الاحترافية)
```bash
# 1. انتقل لمجلد المشروع
cd "مسار/المشروع"

# 2. تهيئة Git
git init

# 3. إضافة جميع الملفات
git add .

# 4. أول commit
git commit -m "🎉 رفع المشروع الأولي"

# 5. ربط بمستودع GitHub
git remote add origin https://github.com/اسم-المستخدم/school-complaints-system.git

# 6. رفع الملفات
git branch -M main
git push -u origin main
```

### الخطوة 3: تفعيل GitHub Pages

1. افتح المستودع على GitHub
2. اذهب إلى **Settings** (الإعدادات)
3. من القائمة الجانبية، اختر **Pages**
4. في قسم **"Source"**:
   - اختر **"Deploy from a branch"**
   - اختر الفرع: **main**
   - اختر المجلد: **/ (root)**
5. اضغط **Save**
6. انتظر دقائق... سيظهر رابط موقعك:
   ```
   https://اسم-المستخدم.github.io/school-complaints-system/
   ```

### الخطوة 4: إعداد Google Apps Script (الباك إند)

1. افتح [Google Sheets](https://sheets.google.com) وأنشئ جدول بيانات جديد
2. سمّ الورقة الأولى: **`Complaints`**
3. أضف العناوين في الصف الأول:

| A | B | C | D | E | F | G | H | I | J | K | L | M |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| TicketNumber | Timestamp | Type | ParentName | WhatsApp | StudentName | Grade | Class | Subject | Details | IncidentDate | Status | AdminReply |

4. من القائمة: **Extensions** → **Apps Script**
5. احذف الكود الموجود والصق محتوى ملف `backend/apps-script.js`
6. غيّر كلمة المرور في السطر: `const ADMIN_PASSWORD = 'كلمة_مرور_جديدة';`
7. اضغط **Deploy** → **New deployment**
8. اختر **Web app**
9. في الإعدادات:
   - **Description**: نظام الشكاوى
   - **Execute as**: Me
   - **Who has access**: Anyone
10. اضغط **Deploy** وانسخ الرابط
11. **مهم جداً**: حدّث الرابط في ملفات المشروع:
    - في `js/app.js`: غيّر `APPS_SCRIPT_URL`
    - في `js/dashboard.js`: غيّر `APPS_SCRIPT_URL`

---

## ⚙️ الإعدادات

### تغيير معلومات المدرسة
في ملف `index.html`، عدّل:
```html
<div class="ministry-line">إدارة سمسطا التعليمية</div>
<div class="school-line">مدرسة: اسم المدرسة</div>
```

### تغيير كلمة مرور الإدارة
في ملف `backend/apps-script.js`، عدّل:
```javascript
const ADMIN_PASSWORD = 'كلمة_مرور_قوية_جديدة';
```

### تفعيل إشعارات البريد الإلكتروني
في ملف `backend/apps-script.js`، عدّل:
```javascript
const ADMIN_EMAIL = 'بريدك@gmail.com';
```

---

## 🔒 الأمان

- ✅ التحقق من المدخلات في الواجهة الأمامية والخلفية
- ✅ تقييد عدد الطلبات (Rate Limiting)
- ✅ حماية من هجمات XSS (تنقية المدخلات)
- ✅ كلمة المرور تُتحقق من الخادم فقط
- ✅ استخدام LockService لمنع التعارض
- ✅ تشفير الاتصال عبر HTTPS

---

## 📱 دعم PWA

النظام يدعم التثبيت كتطبيق على الهاتف:
1. افتح الموقع في Chrome
2. ستظهر رسالة "إضافة إلى الشاشة الرئيسية"
3. أو من قائمة Chrome: "تثبيت التطبيق"

---

## 📄 الرخصة

هذا المشروع مرخص تحت [رخصة MIT](LICENSE).

---

## 👨‍💻 المطور

تم تطوير هذا النظام لخدمة المنظومة التعليمية المصرية.

---

<div align="center">
  <p>صُنع بـ ❤️ لمدارسنا</p>
</div>
