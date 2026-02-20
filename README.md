<div align="center">

<img src="logo.png" alt="KGT Bot" width="120" style="border-radius:50%"/>

# 🤖 KGT Bot

**بوت ديسكورد متكامل للموديريشن مبني بـ discord.js v14**

[![discord.js](https://img.shields.io/badge/discord.js-v14-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.js.org)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![License](https://img.shields.io/badge/License-Private-red?style=for-the-badge)](.)
[![Status](https://img.shields.io/badge/Status-Online-43B581?style=for-the-badge)](.)

</div>

---

## 📖 عن البوت

**KGT Bot** هو بوت موديريشن متكامل تم تطويره خصيصاً لسيرفر **KGT Community**، يوفر أدوات إدارة شاملة، نظام تذاكر دعم احترافي، تسجيل أحداث السيرفر، وميزات تفاعلية متعددة.

> ⚠️ **هذا البوت خاص بـ KGT Community وغير مسموح باستخدامه أو نسخه أو توزيعه بأي شكل.**

---

## ✨ المميزات الرئيسية

- 🛡️ **موديريشن كامل** — ban, kick, mute, warn مع لوج لكل إجراء
- 🎫 **نظام تذاكر** — لوحة تذاكر مع 4 أزرار تفاعلية
- 📋 **Logging شامل** — يسجل جميع أحداث السيرفر
- 🎭 **Auto-React** — إيموجي تلقائية على القنوات المحددة
- ⚠️ **كتم تلقائي** — عند بلوغ حد التحذيرات
- 🤖 **كشف البوتات** — ينبه الأدمن فور دخول بوت جديد
- 🔤 **5 بادئات** — `!` `/` `&` `+` `-`
- 🆔 **دعم User ID** — جميع أوامر المود تقبل @mention أو ID أو اسم

---

## 🔧 متطلبات التشغيل

- [Node.js](https://nodejs.org) v18 أو أعلى
- [npm](https://npmjs.com) v9+
- توكن بوت ديسكورد من [Discord Developer Portal](https://discord.com/developers/applications)

---

## 🚀 طريقة التشغيل

```bash
# 1. نسخ المشروع
git clone https://github.com/KGT-Community/KGT-Bot.git
cd KGT-Bot

# 2. تثبيت المكتبات
npm install

# 3. إعداد config.js بالتوكن والمعلومات
nano config.js

# 4. تشغيل البوت
npm start
```

---

## ⚙️ إعداد config.js

```js
TOKEN:    "توكن البوت",
GUILD_ID: "ID السيرفر",
OWNER_ID: "ID مالك البوت",
PREFIXES: ["!", "/", "&", "+", "-"],
```

---

## 📋 قائمة الأوامر الكاملة

> البادئة الافتراضية: `!` — يمكن استبدالها بأي بادئة من القائمة أعلاه

### 🛡️ الموديريشن

| الأمر | الاستخدام | الوصف | الصلاحية المطلوبة |
|-------|-----------|-------|-----------------|
| `ban` | `!ban @user [سبب]` | حظر مستخدم من السيرفر مع إرسال رسالة خاصة وتسجيل في اللوج | Ban Members |
| `kick` | `!kick @user [سبب]` | طرد مستخدم مع إرسال رسالة خاصة | Kick Members |
| `mute` | `!mute @user [10m] [سبب]` | كتم مؤقت بـ Discord Timeout يدعم `m` `h` `d` | Moderate Members |
| `unmute` | `!unmute @user` | رفع الكتم قبل انتهاء المدة | Moderate Members |
| `warn` | `!warn @user [سبب]` | تحذير مع رسالة خاصة — عند 3 تحذيرات يُكتم تلقائياً | Moderate Members |
| `warns` | `!warns @user` | عرض قائمة تحذيرات عضو بالتفاصيل | Moderate Members |
| `clearwarns` | `!clearwarns @user` | مسح جميع تحذيرات عضو | Administrator |
| `purge` | `!purge [1-100]` | حذف رسائل من القناة | Manage Messages |
| `lock` | `!lock [#قناة]` | قفل قناة — لا أحد يستطيع الكتابة | Manage Channels |
| `unlock` | `!unlock [#قناة]` | فتح قناة مقفلة | Manage Channels |
| `slowmode` | `!slowmode [ثواني]` | وضع التباطؤ (`0` لإلغائه) | Manage Channels |

### 🎫 نظام التذاكر

| الأمر | الاستخدام | الوصف |
|-------|-----------|-------|
| `setup ticket` | `!setup ticket #قناة` | إنشاء لوحة تذاكر مع زر "فتح تذكرة" |
| `ticket staff` | `!ticket staff @role1 @role2 ...` | تحديد رولات الستاف (حتى 8 رولات) |
| `ticket list` | `!ticket list` | عرض جميع التذاكر المفتوحة |

**أزرار داخل كل تذكرة:**

| الزر | الصلاحية | الوظيفة |
|------|----------|---------|
| 🔒 إغلاق | الجميع | إغلاق التذكرة ومنع العضو من الكتابة |
| 🛡️ Claim | الإدارة | استلام التذكرة وإبلاغ العضو |
| 📢 Call User | الإدارة | إرسال رسالة خاصة للعضو لاستدعائه |
| 📄 Transcript | الإدارة | تصدير المحادثة كاملة كملف `.txt` إلى اللوج |

### 📊 المعلومات والإحصائيات

| الأمر | الاختصارات | الوصف |
|-------|-----------|-------|
| `!profile [@user]` | `p`, `بروفايل` | بطاقة شخصية: ترتيب الانضمام، تحذيرات، شارات، رولات، حالة |
| `!userinfo [@user]` | `uinfo`, `ui`, `whois` | معلومات تفصيلية عن عضو |
| `!serverinfo` | `sinfo`, `si` | معلومات السيرفر الكاملة |
| `!botinfo` | `about`, `info` | إحصائيات البوت: ping، uptime، إصدار |
| `!help [أمر]` | `h`, `مساعدة` | قائمة الأوامر أو تفاصيل أمر محدد |

### 📢 المراسلة والإعلانات

| الأمر | الاستخدام | الوصف | الصلاحية |
|-------|-----------|-------|----------|
| `dm` | `!dm @user [رسالة]` | إرسال رسالة خاصة لمستخدم عبر البوت | Manage Messages |
| `dmall` | `!dmall [رسالة]` | رسالة جماعية لجميع أعضاء السيرفر مع تأكيد ومؤشر تقدم | Administrator |
| `logs` | `!logs #قناة` | تفعيل نظام تسجيل أحداث السيرفر | Administrator |

### 🎭 Auto-React

| الأمر | الاستخدام | الوصف |
|-------|-----------|-------|
| `react` | `!react 👍 ❤️ 🔥 #قناة1 #قناة2` | إيموجي تلقائية على كل رسالة في القنوات المحددة (حتى 20 إيموجي / 4 قنوات) |
| `react list` | `!react list` | عرض إعدادات Auto-React الحالية |
| `react remove` | `!react remove #قناة` | إزالة Auto-React من قناة محددة |
| `react clear` | `!react clear` | حذف جميع إعدادات Auto-React |

---

## 📋 أحداث اللوج المُسجَّلة

| الحدث | الوصف |
|-------|-------|
| 🗑️ رسالة محذوفة | يسجل المحتوى والمستخدم والقناة |
| ✏️ رسالة معدّلة | يسجل القديم والجديد |
| 📥 عضو انضم | معلومات العضو الجديد |
| 📤 عضو غادر | من غادر ومتى |
| 🔨 حظر / رفع حظر | من حُظر ومن نفّذ الإجراء |
| 📁 قناة أُنشئت / حُذفت | اسم القناة والنوع |
| 🎭 رول أُنشئ / حُذف | اسم الرول والصلاحيات |
| 🔊 تغيير في الصوت | دخول / خروج / تبديل غرفة |
| 🤖 بوت جديد | تنبيه فوري للأدمن عبر رسالة خاصة |

---

## 📁 هيكل المشروع

```
KGT-Bot/
├── commands/
│   ├── moderation/     # ban, kick, mute, warn...
│   └── utility/        # help, profile, ticket, react...
├── events/             # ready, messageDelete, guildMemberAdd...
├── handlers/
│   ├── commandHandler.js
│   └── eventHandler.js
├── utils/
│   ├── embed.js        # نظام الإمبد الموحد
│   ├── getMember.js    # البحث عن عضو بـ @mention أو ID
│   └── ticketStorage.js
├── website/            # موقع التوثيق
├── config.js           # الإعدادات
├── index.js            # نقطة البداية
└── package.json
```

---

## 📦 المكتبات المستخدمة

```json
{
  "discord.js": "^14.x",
  "ms": "^2.x"
}
```

---

<div align="center">

## ⚖️ حقوق الملكية

```
Copyright © 2025 KGT Community — جميع الحقوق محفوظة
```

**هذا البوت ملك حصري لـ KGT Community.**

❌ غير مسموح بنسخ أو توزيع أو بيع أو إعادة استخدام هذا الكود بأي شكل  
❌ غير مسموح باستخدامه في سيرفرات أخرى دون إذن صريح من المالك  
✅ تم التطوير والتصميم الكامل بواسطة فريق KGT

---

**صُنع بـ ❤️ لـ KGT Community**

[![Discord](https://img.shields.io/badge/Discord-KGT_Community-5865F2?style=for-the-badge&logo=discord&logoColor=white)](.)

</div>
