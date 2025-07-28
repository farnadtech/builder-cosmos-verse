import axios from 'axios';
import { query } from '../database/connection';

interface PaymentRequest {
  amount: number; // In Rials
  description: string;
  mobile?: string;
  email?: string;
  callbackUrl: string;
}

interface PaymentResponse {
  success: boolean;
  authority?: string;
  paymentUrl?: string;
  message: string;
}

interface VerifyPaymentResponse {
  success: boolean;
  refId?: string;
  message: string;
}

class ZarinPalService {
  private merchantId: string;
  private baseUrl: string;
  private sandboxMode: boolean;

  constructor() {
    this.merchantId = process.env.ZARINPAL_MERCHANT_ID || '';
    this.sandboxMode = process.env.NODE_ENV !== 'production';
    this.baseUrl = this.sandboxMode 
      ? 'https://sandbox.zarinpal.com/pg/rest/WebGate'
      : 'https://payment.zarinpal.com/pg/rest/WebGate';
  }

  // Request payment from ZarinPal
  async requestPayment(paymentData: PaymentRequest): Promise<PaymentResponse> {
    try {
      const requestData = {
        MerchantID: this.merchantId,
        Amount: paymentData.amount,
        Description: paymentData.description,
        Mobile: paymentData.mobile || '',
        Email: paymentData.email || '',
        CallbackURL: paymentData.callbackUrl
      };

      const response = await axios.post(
        `${this.baseUrl}/PaymentRequest.json`,
        requestData,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      if (response.data.Status === 100) {
        const authority = response.data.Authority;
        const paymentUrl = this.sandboxMode
          ? `https://sandbox.zarinpal.com/pg/StartPay/${authority}`
          : `https://zarinpal.com/pg/StartPay/${authority}`;

        return {
          success: true,
          authority,
          paymentUrl,
          message: 'درخواست پرداخت با موفقیت ایجاد شد'
        };
      } else {
        return {
          success: false,
          message: this.getErrorMessage(response.data.Status)
        };
      }
    } catch (error) {
      console.error('ZarinPal request payment error:', error);
      return {
        success: false,
        message: 'خطا در اتصال به درگاه پرداخت'
      };
    }
  }

  // Verify payment
  async verifyPayment(authority: string, amount: number): Promise<VerifyPaymentResponse> {
    try {
      const verifyData = {
        MerchantID: this.merchantId,
        Authority: authority,
        Amount: amount
      };

      const response = await axios.post(
        `${this.baseUrl}/PaymentVerification.json`,
        verifyData,
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      if (response.data.Status === 100 || response.data.Status === 101) {
        return {
          success: true,
          refId: response.data.RefID.toString(),
          message: 'پرداخت با موفقیت تایید شد'
        };
      } else {
        return {
          success: false,
          message: this.getErrorMessage(response.data.Status)
        };
      }
    } catch (error) {
      console.error('ZarinPal verify payment error:', error);
      return {
        success: false,
        message: 'خطا در تایید پرداخت'
      };
    }
  }

  // Create escrow payment for project milestone
  async createEscrowPayment(
    projectId: number,
    milestoneId: number,
    employerId: number,
    contractorId: number,
    amount: number,
    description: string,
    callbackUrl: string
  ): Promise<{ success: boolean; paymentUrl?: string; transactionId?: number; message: string }> {
    try {
      // Create escrow transaction record
      const transactionResult = await query(
        `INSERT INTO escrow_transactions 
         (project_id, milestone_id, employer_id, contractor_id, amount, status, created_at)
         VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
         RETURNING id`,
        [projectId, milestoneId, employerId, contractorId, amount]
      );

      const transactionId = transactionResult.rows[0].id;

      // Request payment from ZarinPal
      const paymentRequest = await this.requestPayment({
        amount,
        description,
        callbackUrl: `${callbackUrl}?transaction_id=${transactionId}`
      });

      if (paymentRequest.success && paymentRequest.authority) {
        // Update transaction with ZarinPal authority
        await query(
          'UPDATE escrow_transactions SET zarinpal_authority = $1 WHERE id = $2',
          [paymentRequest.authority, transactionId]
        );

        return {
          success: true,
          paymentUrl: paymentRequest.paymentUrl,
          transactionId,
          message: paymentRequest.message
        };
      } else {
        // Delete failed transaction
        await query('DELETE FROM escrow_transactions WHERE id = $1', [transactionId]);
        
        return {
          success: false,
          message: paymentRequest.message
        };
      }
    } catch (error) {
      console.error('Create escrow payment error:', error);
      return {
        success: false,
        message: 'خطا در ایجاد پرداخت امانی'
      };
    }
  }

  // Verify and complete escrow payment
  async verifyEscrowPayment(transactionId: number, authority: string): Promise<VerifyPaymentResponse> {
    try {
      // Get transaction details
      const transactionResult = await query(
        'SELECT * FROM escrow_transactions WHERE id = $1 AND zarinpal_authority = $2',
        [transactionId, authority]
      );

      if (transactionResult.rows.length === 0) {
        return {
          success: false,
          message: 'تراکنش یافت نشد'
        };
      }

      const transaction = transactionResult.rows[0];

      // Verify payment with ZarinPal
      const verification = await this.verifyPayment(authority, transaction.amount);

      if (verification.success) {
        // Update transaction status
        await query(
          `UPDATE escrow_transactions 
           SET status = 'held', zarinpal_ref_id = $1, payment_date = NOW() 
           WHERE id = $2`,
          [verification.refId, transactionId]
        );

        // Update project status if first milestone
        await query(
          `UPDATE projects 
           SET status = 'in_progress' 
           WHERE id = $1 AND status = 'assigned'`,
          [transaction.project_id]
        );

        return {
          success: true,
          refId: verification.refId,
          message: 'پرداخت امانی با موفقیت انجام شد'
        };
      } else {
        // Mark transaction as failed
        await query(
          'UPDATE escrow_transactions SET status = \'failed\' WHERE id = $1',
          [transactionId]
        );

        return verification;
      }
    } catch (error) {
      console.error('Verify escrow payment error:', error);
      return {
        success: false,
        message: 'خطا در تایید پرداخت امانی'
      };
    }
  }

  // Release escrow payment to contractor
  async releaseEscrowPayment(transactionId: number, adminUserId: number): Promise<{ success: boolean; message: string }> {
    try {
      // Get transaction details
      const transactionResult = await query(
        `SELECT et.*, u.phone_number 
         FROM escrow_transactions et
         JOIN users u ON et.contractor_id = u.id
         WHERE et.id = $1 AND et.status = 'held'`,
        [transactionId]
      );

      if (transactionResult.rows.length === 0) {
        return {
          success: false,
          message: 'تراکنش امانی قابل آزادسازی یافت نشد'
        };
      }

      const transaction = transactionResult.rows[0];

      // Update escrow transaction
      await query(
        'UPDATE escrow_transactions SET status = \'released\', release_date = NOW() WHERE id = $1',
        [transactionId]
      );

      // Add amount to contractor's wallet
      await this.addToWallet(transaction.contractor_id, transaction.amount, 'earning', `آزادسازی وجه پروژه - تراکنش #${transactionId}`);

      // Update milestone status
      if (transaction.milestone_id) {
        await query(
          'UPDATE milestones SET status = \'completed\' WHERE id = $1',
          [transaction.milestone_id]
        );
      }

      // Send notification to contractor
      // TODO: Send SMS notification

      return {
        success: true,
        message: 'وجه امانی با موفقیت آزاد شد'
      };
    } catch (error) {
      console.error('Release escrow payment error:', error);
      return {
        success: false,
        message: 'خطا در آزادسازی وجه امانی'
      };
    }
  }

  // Add amount to user wallet
  private async addToWallet(userId: number, amount: number, type: string, description: string): Promise<void> {
    // Get or create wallet
    let walletResult = await query('SELECT id FROM wallets WHERE user_id = $1', [userId]);
    
    let walletId: number;
    if (walletResult.rows.length === 0) {
      const newWalletResult = await query(
        'INSERT INTO wallets (user_id, balance, total_earned) VALUES ($1, $2, $2) RETURNING id',
        [userId, amount, type === 'earning' ? amount : 0]
      );
      walletId = newWalletResult.rows[0].id;
    } else {
      walletId = walletResult.rows[0].id;
      
      // Update wallet balance
      await query(
        `UPDATE wallets 
         SET balance = balance + $1, 
             total_earned = total_earned + $2
         WHERE id = $3`,
        [amount, type === 'earning' ? amount : 0, walletId]
      );
    }

    // Add wallet transaction
    await query(
      `INSERT INTO wallet_transactions (wallet_id, type, amount, description, status)
       VALUES ($1, $2, $3, $4, 'completed')`,
      [walletId, type, amount, description]
    );
  }

  // Get error message based on ZarinPal status code
  private getErrorMessage(statusCode: number): string {
    const errorMessages: { [key: number]: string } = {
      '-1': 'اطلاعات ارسال شده ناقص است',
      '-2': 'IP یا مرچنت کد پذیرنده صحیح نیست',
      '-3': 'با توجه به محدودیت‌های شاپرک امکان پردازش وجود ندارد',
      '-4': 'سطح تایید پذیرنده پایین‌تر از سطح نقره‌ای است',
      '-11': 'درخواست مورد نظر یافت نشد',
      '-12': 'امکان ویرایش درخواست میسر نمی‌باشد',
      '-21': 'هیچ نوع عملیات مالی برای این تراکنش یافت نشد',
      '-22': 'تراکنش ناموفق میباشد',
      '-33': 'رقم تراکنش با رقم پرداخت شده مطابقت ندارد',
      '-34': 'سقف تقسیم تراکنش از لحاظ تعداد یا مبلغ عبور نموده است',
      '-40': 'اجازه دسترسی به متد مربوطه وجود ندارد',
      '-41': 'اطلاعات ارسال شده مربوط به AdditionalData غیرمعتبر می‌باشد',
      '-42': 'مدت زمان معتبر طول عمر شناسه پرداخت بایستی بین 30 دقیقه تا 45 روز مباشد',
      '-54': 'درخواست مورد نظر آرشیو شده است'
    };

    return errorMessages[statusCode] || 'خطای نامشخص در درگاه پرداخت';
  }
}

export const zarinpalService = new ZarinPalService();
