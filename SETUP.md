# راهنمای نصب و راه‌اندازی پلتفرم ضمانو

این راهنما مراحل کامل نصب و راه‌اندازی پلتفرم ضمانو را شرح می‌دهد.

## پیش‌نیازها

- Node.js (نسخه 18 یا بالاتر)
- PostgreSQL (نسخه 12 یا بالاتر)
- npm یا yarn

## مرحله 1: کلون کردن پروژه

```bash
git clone <repository-url>
cd zemano-platform
```

## مرحله 2: نصب وابستگی‌ها

```bash
npm install
```

## مرحله 3: تنظیم پایگاه داده

### 3.1 نصب PostgreSQL

#### Ubuntu/Debian:
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
```

#### macOS:
```bash
brew install postgresql
brew services start postgresql
```

#### Windows:
PostgreSQL را از سایت رسمی دانلود و نصب کنید.

### 3.2 ایجاد پایگاه داده

```bash
sudo -u postgres psql

CREATE DATABASE zemano_db;
CREATE USER zemano_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE zemano_db TO zemano_user;
\q
```

### 3.3 اجرای Schema

```bash
psql -U zemano_user -d zemano_db -f server/database/schema.sql
```

## مرحله 4: تنظیم متغیرهای محیطی

### 4.1 کپی کردن فایل تنظیمات

```bash
cp .env.example .env
```

### 4.2 ویرایش فایل .env

```bash
nano .env
```

حداقل تنظیمات زیر را تکمیل کنید:

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=zemano_db
DB_USER=zemano_user
DB_PASSWORD=your_secure_password

# JWT Secrets (کلیدهای قوی تولید کنید)
JWT_SECRET=your_very_long_secret_key_here
JWT_REFRESH_SECRET=your_very_long_refresh_secret_key_here

# ZarinPal (برای پرداخت)
ZARINPAL_MERCHANT_ID=your_zarinpal_merchant_id

# SMS (برای ارسال OTP)
SMS_USERNAME=your_sms_username
SMS_PASSWORD=your_sms_password
```

## مرحله 5: تنظیم سرویس‌های خارجی

### 5.1 ZarinPal (درگاه پرداخت)

1. وارد سایت ZarinPal شوید
2. حساب پذیرنده ایجاد کنید
3. کد پذیرنده (Merchant ID) را در `.env` قرار دهید

### 5.2 ملی پیامک (SMS)

1. وارد سایت ملی پیامک شوید
2. حساب ایجاد کنید و اعتبار شارژ کنید
3. نام کاربری و رمز عبور را در `.env` قرار دهید

## مرحله 6: اجرای برنامه

### محیط توسعه:
```bash
npm run dev
```

### محیط تولید:
```bash
npm run build
npm start
```

## مرحله 7: تست اولیه

### 7.1 بررسی سلامت API

```bash
curl http://localhost:8080/api/health
```

### 7.2 ورود با حساب مدیر

- ایمیل: `admin@zemano.ir`
- رمز عبور: `admin123`

**نکته مهم:** حتماً رمز عبور مدیر را بعد از اولین ورود تغییر دهید.

## مرحله 8: تنظیمات امنیتی

### 8.1 تغییر رمز عبور مدیر

پس از ورود با حساب مدیر، بلافاصله رمز عبور را تغییر دهید.

### 8.2 تنظیم Firewall

```bash
# فقط پورت‌های ضروری را باز کنید
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw allow 8080  # API (فقط در صورت نیاز)
sudo ufw enable
```

### 8.3 تنظیم SSL/TLS

برای محیط تولید حتماً SSL استفاده کنید:

```bash
# با Certbot
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

## مرحله 9: تنظیمات اضافی

### 9.1 پیکربندی Nginx (اختیاری)

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 9.2 تنظیم Process Manager

```bash
# نصب PM2
npm install -g pm2

# اجرای برنامه با PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 9.3 ایجاد فایل ecosystem.config.js

```javascript
module.exports = {
  apps: [{
    name: 'zemano-api',
    script: 'dist/server/node-build.mjs',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 8080
    }
  }]
};
```

## مرحله 10: مانیتورینگ و لاگ‌ها

### 10.1 مشاهده لاگ‌ها

```bash
# لاگ‌های PM2
pm2 logs zemano-api

# لاگ‌های PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-*.log
```

### 10.2 پشتیبان‌گیری

```bash
# پشتیبان‌گیری از پایگاه داده
pg_dump -U zemano_user zemano_db > backup-$(date +%Y%m%d).sql

# بازیابی
psql -U zemano_user zemano_db < backup-20231201.sql
```

## عیب‌یابی مشکلات رایج

### مشکل اتصال به پایگاه داده

```bash
# بررسی وضعیت PostgreSQL
sudo systemctl status postgresql

# راه‌اندازی مجدد
sudo systemctl restart postgresql
```

### مشکل دسترسی‌ها

```bash
# بررسی دسترسی‌های فایل
ls -la uploads/
chmod 755 uploads/
chown -R www-data:www-data uploads/
```

### مشکل پورت‌ها

```bash
# بررسی پورت‌های در حال استفاده
netstat -tulpn | grep :8080
lsof -i :8080
```

## پشتیبانی

در صورت مواجهه با مشکل:

1. ابتدا لاگ‌های سیستم را بررسی کنید
2. مستندات API را مطالعه کنید
3. GitHub Issues را چک کنید
4. با تیم پشتیبانی تماس بگیرید

## لایسنس

این پروژه تحت لایسنس MIT منتشر شده است.
