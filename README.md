# Audit AI Assistant — موقع المراجعة الداخلية

موقع احترافي بالعربية (RTL) لإدارة وتحليل خطة المراجعة الداخلية لثلاث سنوات (2024/2025/2026)، مبني بالكامل على ملف `Audit_Plan_v2.xlsx`، مع مساعد ذكي مدمج بـ Claude AI وتحليلات CAATs.

## البنية
- `client/` — الواجهة (React + TypeScript + Vite + Tailwind v4)
- `server/` — خادم وسيط آمن للمساعد الذكي (Node + Express + Anthropic SDK)

## التشغيل

### 1) الخادم الوسيط (للمساعد الذكي)
```bash
cd server
npm install
copy .env.example .env   # ثم ضع مفتاح Anthropic API في ANTHROPIC_API_KEY
npm start
```
الخادم يعمل على المنفذ 8787.

### 2) الواجهة
```bash
cd client
npm install
npm run dev
```
افتح الرابط الذي يظهر (عادة http://localhost:5173). Vite يمرّر طلبات `/api` تلقائياً إلى الخادم.

> الواجهة تعمل كاملةً (الصفحات الثلاث + الرسوم + CAATs) حتى بدون مفتاح API — الشات وحده يحتاج المفتاح.

## البناء للإنتاج
```bash
cd client && npm run build
```

## تبديل البيانات
استبدل `client/public/data/Audit_Plan_v2.xlsx` بملف بنفس البنية (5 شيتات سنوية: 2022–2026، 22 عموداً، 20 عملية/سنة، + شيتي "دليل البيانات" و"القوائم المرجعية") دون الحاجة لإعادة البناء.
