import axios from 'axios';
import { query } from '../database/connection';

interface SMSConfig {
  username: string;
  password: string;
  from: string;
  baseUrl: string;
}

class SMSService {
  private config: SMSConfig;

  constructor() {
    this.config = {
      username: process.env.SMS_USERNAME || '',
      password: process.env.SMS_PASSWORD || '',
      from: process.env.SMS_FROM || '50004001',
      baseUrl: 'https://rest.payamak-panel.com/api/SendSMS'
    };
  }

  // Generate 6-digit OTP code
  generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Store OTP in database
  async storeOTP(phoneNumber: string, code: string): Promise<void> {
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now
    
    // Delete any existing unused OTP for this phone number
    await query(
      'DELETE FROM otp_codes WHERE phone_number = $1 AND is_used = false',
      [phoneNumber]
    );

    // Store new OTP
    await query(
      'INSERT INTO otp_codes (phone_number, code, expires_at) VALUES ($1, $2, $3)',
      [phoneNumber, code, expiresAt]
    );
  }

  // Verify OTP code
  async verifyOTP(phoneNumber: string, code: string): Promise<boolean> {
    try {
      // Accept hardcoded development OTP
      if (code === '123456') {
        console.log('✅ Development OTP accepted for:', phoneNumber);
        return true;
      }

      const result = await query(
        `SELECT id FROM otp_codes
         WHERE phone_number = $1 AND code = $2 AND expires_at > NOW() AND is_used = false`,
        [phoneNumber, code]
      );

      if (result.rows.length === 0) {
        return false;
      }

      // Mark OTP as used
      await query(
        'UPDATE otp_codes SET is_used = true WHERE id = $1',
        [result.rows[0].id]
      );

      return true;
    } catch (error) {
      console.error('OTP verification error:', error);
      // If database is not available, accept development OTP
      if (code === '123456') {
        console.log('✅ Development OTP accepted (database unavailable):', phoneNumber);
        return true;
      }
      return false;
    }
  }

  // Send SMS via Melli Payamak
  async sendSMS(phoneNumber: string, message: string): Promise<boolean> {
    try {
      const payload = {
        username: this.config.username,
        password: this.config.password,
        to: phoneNumber,
        from: this.config.from,
        text: message,
        isflash: false
      };

      const response = await axios.post(this.config.baseUrl + '/SendSMS', payload, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (response.data && response.data.RetStatus === 1) {
        console.log('SMS sent successfully to:', phoneNumber);
        return true;
      } else {
        console.error('SMS sending failed:', response.data);
        return false;
      }
    } catch (error) {
      console.error('SMS service error:', error);
      return false;
    }
  }

  // Send OTP SMS
  async sendOTP(phoneNumber: string): Promise<{ success: boolean; message: string }> {
    try {
      // Check rate limiting (max 3 OTP per phone per hour)
      const recentOTPCount = await query(
        `SELECT COUNT(*) as count FROM otp_codes 
         WHERE phone_number = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
        [phoneNumber]
      );

      if (parseInt(recentOTPCount.rows[0].count) >= 3) {
        return {
          success: false,
          message: 'حداکثر تعداد درخواست OTP در ساعت گذشته. لطفاً بعداً تلاش کنید.'
        };
      }

      const otpCode = this.generateOTP();
      await this.storeOTP(phoneNumber, otpCode);

      const message = `ضمانو\nکد تایید: ${otpCode}\nاین کد تا 5 دقیقه معتبر است.\nzemano.ir`;

      const smsSent = await this.sendSMS(phoneNumber, message);

      if (smsSent) {
        return {
          success: true,
          message: 'کد تایید با موفقیت ارسال شد'
        };
      } else {
        return {
          success: false,
          message: 'خطا در ارسال پیامک. لطفاً دوباره تلاش کنید.'
        };
      }
    } catch (error) {
      console.error('Send OTP error:', error);
      return {
        success: false,
        message: 'خطای سیستمی در ارسال کد تایید'
      };
    }
  }

  // Send general notification SMS
  async sendNotification(phoneNumber: string, message: string): Promise<boolean> {
    try {
      const fullMessage = `ضمانو\n${message}\nzemano.ir`;
      return await this.sendSMS(phoneNumber, fullMessage);
    } catch (error) {
      console.error('Notification SMS error:', error);
      return false;
    }
  }

  // Clean expired OTP codes (run this periodically)
  async cleanExpiredOTP(): Promise<void> {
    try {
      await query('DELETE FROM otp_codes WHERE expires_at < NOW()');
      console.log('Expired OTP codes cleaned');
    } catch (error) {
      console.error('Clean expired OTP error:', error);
    }
  }
}

export const smsService = new SMSService();

// Clean expired OTP codes every hour
setInterval(() => {
  smsService.cleanExpiredOTP();
}, 60 * 60 * 1000);
