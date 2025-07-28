# مستندات API پلتفرم ضمانو

## معرفی

پلتفرم ضمانو یک سیستم پرداخت امانی (Escrow) است که به کارفرمایان و مجریان امکان انجام پروژه‌ها با امنیت کامل را فراهم می‌کند.

### URL پایه
```
Production: https://api.zemano.ir
Development: http://localhost:8080
```

### احراز هویت

تمام API های محافظت شده نیاز به توکن JWT دارند که باید در header درخواست قرار گیرد:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

## 1. احراز هویت (Authentication)

### POST /api/auth/register
ثبت نام کاربر جدید

**Request Body:**
```json
{
  "firstName": "علی",
  "lastName": "احمدی", 
  "email": "ali@example.com",
  "phoneNumber": "09123456789",
  "password": "securePassword123",
  "role": "employer" // یا "contractor"
}
```

**Response:**
```json
{
  "success": true,
  "message": "ثبت نام با موفقیت انجام شد",
  "data": {
    "user": {
      "id": 1,
      "firstName": "علی",
      "lastName": "احمدی",
      "email": "ali@example.com",
      "phoneNumber": "+989123456789",
      "role": "employer",
      "isVerified": false
    },
    "tokens": {
      "accessToken": "jwt_token_here",
      "refreshToken": "refresh_token_here"
    },
    "otpSent": true
  }
}
```

### POST /api/auth/login
ورود کاربر

**Request Body:**
```json
{
  "phoneNumber": "09123456789",
  "password": "securePassword123"
}
```

### POST /api/auth/send-otp
ارسال کد تایید

**Request Body:**
```json
{
  "phoneNumber": "09123456789"
}
```

### POST /api/auth/verify-otp
تایید کد OTP

**Request Body:**
```json
{
  "phoneNumber": "09123456789",
  "code": "123456"
}
```

### POST /api/auth/refresh-token
تازه‌سازی توکن

**Request Body:**
```json
{
  "refreshToken": "refresh_token_here"
}
```

## 2. مدیریت پروژه‌ها (Projects)

### GET /api/projects
دریافت لیست پروژه‌ها

**Query Parameters:**
- `page`: شماره صفحه (پیش‌فرض: 1)
- `limit`: تعداد آیتم در صفحه (پیش‌فرض: 10)
- `status`: وضعیت پروژه (open, assigned, in_progress, completed, cancelled, disputed)
- `category`: دسته‌بندی پروژه
- `search`: جستجو در عنوان و توضیحات
- `myProjects`: فقط پروژه‌های خود کاربر (true/false)

**Response:**
```json
{
  "success": true,
  "data": {
    "projects": [
      {
        "id": 1,
        "title": "طراحی وب‌سایت",
        "description": "توضیحات پروژه",
        "budget": 5000000,
        "status": "open",
        "category": "طراحی وب",
        "deadline": "2024-03-15",
        "employerFirstName": "علی",
        "employerLastName": "احمدی",
        "contractorFirstName": null,
        "contractorLastName": null,
        "createdAt": "2024-01-15T10:30:00Z",
        "milestones": [...]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3
    }
  }
}
```

### GET /api/projects/:id
دریافت جزئیات پروژ��

### POST /api/projects
ایجاد پروژه جدید (فقط کارفرما)

**Request Body:**
```json
{
  "title": "طراحی وب‌سایت فروشگاهی",
  "description": "توضیحات کامل پروژه",
  "category": "طراحی وب",
  "budget": 5000000,
  "deadline": "2024-03-15",
  "milestones": [
    {
      "title": "طراحی اولیه",
      "description": "طراحی صفحات اصلی",
      "amount": 2000000,
      "deadline": "2024-02-15"
    },
    {
      "title": "پیاده‌سازی",
      "description": "کدنویسی و توسعه",
      "amount": 3000000,
      "deadline": "2024-03-10"
    }
  ]
}
```

### POST /api/projects/:id/apply
درخواست انجام پروژه (فقط مجری)

**Request Body:**
```json
{
  "proposal": "پیشنهاد من برای این پروژه",
  "estimatedDays": 30
}
```

### POST /api/projects/:id/assign
تخصیص پروژه به مجری (فقط کارفرما)

**Request Body:**
```json
{
  "contractorId": 15
}
```

## 3. کیف پول (Wallet)

### GET /api/wallet
دریافت اطلاعات کیف پول

**Response:**
```json
{
  "success": true,
  "data": {
    "wallet": {
      "id": 1,
      "userId": 1,
      "balance": 2500000,
      "totalEarned": 10000000,
      "totalSpent": 7500000,
      "availableBalance": 2400000,
      "pendingWithdrawals": 100000
    },
    "transactions": [...]
  }
}
```

### POST /api/wallet/deposit
درخواست واریز به کیف پول

**Request Body:**
```json
{
  "amount": 1000000
}
```

### POST /api/wallet/withdraw
درخواست برداشت از کیف پول

**Request Body:**
```json
{
  "amount": 500000,
  "bankAccount": "6037-9977-1234-5678",
  "accountHolder": "علی احمدی",
  "description": "برداشت برای خرید"
}
```

### GET /api/wallet/transactions
تاریخچه تراکنش‌های کیف پول

## 4. پرداخت امانی (Payment)

### POST /api/payment/escrow
ایجاد پرداخت امانی (فقط کارفرما)

**Request Body:**
```json
{
  "projectId": 1,
  "milestoneId": 1
}
```

### POST /api/payment/verify-escrow
تایید پرداخت امانی

**Request Body:**
```json
{
  "Authority": "zarinpal_authority",
  "Status": "OK",
  "transaction_id": 123
}
```

### POST /api/payment/release/:transactionId
آزادسازی وجه امانی

### GET /api/payment/history
تاریخچه پرداخت‌ها

## 5. چت (Chat)

### GET /api/chat/project/:projectId
دریافت پیام‌های چت پروژه

### POST /api/chat/project/:projectId/message
ارسال پیام متنی

**Request Body:**
```json
{
  "message": "سلام، پروژه چطور پیش می‌رود؟"
}
```

### POST /api/chat/project/:projectId/file
ارسال فایل

**Form Data:**
- `file`: فایل ضمیمه
- `description`: توضیحات (اختیاری)

### GET /api/chat/unread-count
تعداد پیام‌های خوانده نشده

## 6. داوری (Arbitration)

### POST /api/arbitration
ایجاد درخواست داوری

**Request Body:**
```json
{
  "projectId": 1,
  "reason": "دلیل درخواست داوری"
}
```

### GET /api/arbitration/cases
دریافت پرونده‌های داوری (فقط داور)

### PATCH /api/arbitration/:id/assign
تخصیص داور

### PATCH /api/arbitration/:id/decision
ثبت رأی داوری (فقط داور)

**Request Body:**
```json
{
  "decision": "contractor", // یا "employer" یا "split"
  "resolution": "توضیحات رأی داور",
  "contractorPercentage": 70 // فقط برای تقسیم
}
```

## 7. قراردادها (Contracts)

### POST /api/contracts/generate/:projectId
تولید قرارداد برای ��روژه

### GET /api/contracts/project/:projectId
دریافت اطلاعات قرارداد پروژه

### POST /api/contracts/:contractId/sign
امضای قرارداد

**Request Body:**
```json
{
  "role": "employer" // یا "contractor"
}
```

### GET /api/contracts/:contractId/download
دانلود PDF قرارداد

## 8. اعلان‌ها (Notifications)

### GET /api/notifications
دریافت اعلان‌های کاربر

**Query Parameters:**
- `page`: شماره صفحه
- `limit`: تعداد آیتم در صفحه
- `type`: نوع اعلان
- `read`: وضعیت خوانده شدن

### PATCH /api/notifications/:id/read
علامت‌گذاری اعلان به عنوان خوانده شده

### PATCH /api/notifications/mark-all-read
علامت‌گذاری همه اعلان‌ها

## 9. آپلود فایل (Upload)

### POST /api/upload/single
آپلود تک فایل

**Form Data:**
- `file`: فایل
- `purpose`: هدف آپلود
- `referenceId`: شناسه مرتبط (اختیاری)

### GET /api/upload/download/:fileId
دانلود فایل

## 10. مدیریت (Admin)

### GET /api/admin/dashboard
آمار داشبورد مدیریت

### GET /api/admin/users
لیست کاربران

### PATCH /api/admin/users/:id/status
تغییر و��عیت کاربر

### POST /api/admin/arbitrators
ایجاد داور جدید

### GET /api/admin/settings
تنظیمات سیستم

### PATCH /api/admin/settings
به‌روزرسانی تنظیمات

## کدهای خطا

| کد | معنی |
|----|------|
| 200 | موفق |
| 201 | ایجاد شده |
| 400 | درخواست نامعتبر |
| 401 | احراز هویت نشده |
| 403 | دسترسی مجاز نیست |
| 404 | یافت نشد |
| 409 | تضاد |
| 422 | اطلاعات نامعتبر |
| 429 | بیش از حد درخواست |
| 500 | خطای سرور |

## نمونه پاسخ خطا

```json
{
  "success": false,
  "message": "پیام خطا به فارسی",
  "messageFA": "پیام خطا به فارسی",
  "errors": [
    {
      "field": "email",
      "message": "فرمت ایمیل صحیح نیست"
    }
  ]
}
```

## محدودیت‌ها

### Rate Limiting
- کلی: 100 درخواست در 15 دقیقه
- احراز هویت: 5 درخواست در 15 دقیقه

### حجم فایل
- چت: 20 مگابایت
- پروژه: 10 مگابایت
- عمومی: 50 مگابایت

### فرمت‌های مجاز
- تصاویر: JPG, PNG, GIF, WebP
- اسناد: PDF, DOC, DOCX, TXT
- آرشیو: ZIP, RAR, 7Z
- صوت/تصویر: MP3, WAV, MP4, AVI

## احتیاطات امنیتی

1. همیشه از HTTPS استفاده کنید
2. توکن‌ها را امن نگهداری کنید
3. رمزهای عبور قوی انتخاب کنید
4. از rate limiting پیروی کنید
5. اطلاعات حساس را لاگ نکنید

## تست API

### با cURL:
```bash
# ثبت نام
curl -X POST https://api.zemano.ir/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "علی",
    "lastName": "احمدی",
    "email": "ali@example.com",
    "phoneNumber": "09123456789",
    "password": "securePassword123",
    "role": "employer"
  }'

# ورود
curl -X POST https://api.zemano.ir/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "09123456789",
    "password": "securePassword123"
  }'
```

### با Postman:
1. کالکشن Postman را import کنید
2. متغیر `baseUrl` را تنظیم کنید
3. توکن را در Authorization تنظیم کنید

## پشتیبانی

برای پشتیبانی تکنیکی:
- ایمیل: developer@zemano.ir
- تلفن: ۰۲۱-۱۲۳۴۵۶۷۸
- مستندات: https://docs.zemano.ir

## نسخه‌بندی

نسخه فعلی: v1.0.0

تغییرات در API در نسخه‌های آینده ممکن است backward compatibility را تحت تأثیر قرار دهد.
