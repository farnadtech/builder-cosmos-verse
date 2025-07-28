import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { query } from '../database/connection';
import { generateAccessToken, generateRefreshToken, refreshToken, authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { smsService } from '../services/sms';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Simple test endpoint
router.post('/test', async (req: Request, res: Response) => {
  try {
    console.log('Test endpoint called with body:', req.body);
    res.json({ success: true, message: 'Test successful', body: req.body });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({ success: false, message: 'Test failed' });
  }
});

// Configure multer for verification documents
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/verification';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.jpg', '.jpeg', '.png'];
    const fileExt = path.extname(file.originalname).toLowerCase();

    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('فقط فایل‌های تصویری مج��ز هستند'));
    }
  }
});

// Validation rules
const registerValidation = [
  body('firstName').trim().isLength({ min: 2, max: 50 }).withMessage('نام باید بین 2 تا 50 کاراکتر باشد'),
  body('lastName').trim().isLength({ min: 2, max: 50 }).withMessage('نام خانوادگی باید بین 2 تا 50 کاراکتر باشد'),
  body('email').isEmail().withMessage('فرمت ایمیل صحیح نیست').normalizeEmail(),
  body('phoneNumber').matches(/^(\+98|0)?9\d{9}$/).withMessage('شماره موبایل صحیح نیست'),
  body('password').isLength({ min: 8 }).withMessage('رمز عبور باید حداقل 8 کاراکتر باشد'),
  body('role').isIn(['employer', 'contractor']).withMessage('نقش کاربری نامعتبر اس��')
];

const loginValidation = [
  body('phoneNumber').matches(/^(\+98|0)?9\d{9}$/).withMessage('شماره موبایل صحیح نیست'),
  body('password').isLength({ min: 1 }).withMessage('رمز عبور الزامی است')
];

// Register new user
router.post('/register', registerValidation, async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'اطلاعات ورودی نامعتبر است',
        errors: errors.array()
      });
    }

    const { firstName, lastName, email, phoneNumber, password, role } = req.body;

    // Normalize phone number
    const normalizedPhone = phoneNumber.replace(/^(\+98|0)/, '+98');

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1 OR phone_number = $2',
      [email, normalizedPhone]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'کاربری با این ایمیل یا شماره موبایل قبلاً ثبت نام کرده است',
        messageFA: 'کاربری با این ایمیل یا شماره موبایل قبلاً ثبت نام کرده است'
      });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const userResult = await query(
      `INSERT INTO users (first_name, last_name, email, phone_number, password_hash, role, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id, email, role`,
      [firstName, lastName, email, normalizedPhone, passwordHash, role]
    );

    const user = userResult.rows[0];

    // Create wallet for user
    await query(
      'INSERT INTO wallets (user_id, balance, total_earned, total_spent) VALUES ($1, 0, 0, 0)',
      [user.id]
    );

    // Send OTP for phone verification
    const otpResult = await smsService.sendOTP(normalizedPhone);

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    const refreshTokenValue = generateRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    const responseData = {
      success: true,
      message: 'ثبت نام با موفقیت انجام شد. لطفاً شماره موبایل خود را تایید کنید',
      data: {
        user: {
          id: user.id,
          firstName,
          lastName,
          email: user.email,
          phoneNumber: normalizedPhone,
          role: user.role,
          isVerified: false
        },
        tokens: {
          accessToken,
          refreshToken: refreshTokenValue
        },
        otpSent: otpResult.success
      }
    };

    console.log('Sending registration response:', responseData);
    res.status(201).json(responseData);

  } catch (error) {
    console.error('Register error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: 'خطای سیستمی در ثبت نام',
        messageFA: 'خطای سیستمی در ثبت نام'
      });
    }
  }
});

// Login user
router.post('/login', loginValidation, async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'اطلاعات ورودی نامعتبر است',
        errors: errors.array()
      });
    }

    const { phoneNumber, password } = req.body;
    const normalizedPhone = phoneNumber.replace(/^(\+98|0)/, '+98');

    // Get user by phone number
    const userResult = await query(
      `SELECT id, first_name, last_name, email, phone_number, password_hash, role, is_verified, is_active
       FROM users WHERE phone_number = $1`,
      [normalizedPhone]
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'شماره موبایل یا رمز عبور اشتباه است',
        messageFA: 'شماره موبایل یا رمز عبور اشتباه است'
      });
    }

    const user = userResult.rows[0];

    // Check if account is active
    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'حساب کاربری شما غیرفعال شده است',
        messageFA: 'حساب کاربری ��ما غیرفعال شده است'
      });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'شماره موبایل یا رمز عبور اشتباه است',
        messageFA: 'شماره موبایل یا رمز عبور اشتباه است'
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    const refreshTokenValue = generateRefreshToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    res.json({
      success: true,
      message: 'ورود با موفقیت انجام شد',
      data: {
        user: {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          phoneNumber: user.phone_number,
          role: user.role,
          isVerified: user.is_verified
        },
        tokens: {
          accessToken,
          refreshToken: refreshTokenValue
        }
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'خطای سیستمی در ��رود',
      messageFA: 'خطای سیستمی در ورود'
    });
  }
});

// Send OTP for phone verification
router.post('/send-otp', async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber || !phoneNumber.match(/^(\+98|0)?9\d{9}$/)) {
      return res.status(400).json({
        success: false,
        message: 'شماره موبایل صحیح نیست',
        messageFA: 'شماره موبایل صحیح نیست'
      });
    }

    const normalizedPhone = phoneNumber.replace(/^(\+98|0)/, '+98');
    const result = await smsService.sendOTP(normalizedPhone);

    res.json({
      success: result.success,
      message: result.message
    });

  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'خطای سیستمی در ارسال کد تایید',
      messageFA: 'خطای سیستمی در ارسال کد تایید'
    });
  }
});

// Verify OTP
router.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const { phoneNumber, code } = req.body;

    if (!phoneNumber || !code) {
      return res.status(400).json({
        success: false,
        message: 'شماره موبایل و کد تایید الزامی است',
        messageFA: 'شماره موبایل و کد تایید الزامی است'
      });
    }

    const normalizedPhone = phoneNumber.replace(/^(\+98|0)/, '+98');
    const isValid = await smsService.verifyOTP(normalizedPhone, code);

    if (isValid) {
      // Update user verification status
      await query(
        'UPDATE users SET is_verified = true WHERE phone_number = $1',
        [normalizedPhone]
      );

      res.json({
        success: true,
        message: 'شماره موبایل با موفقیت تایید شد'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'کد تایید نامعتبر یا منقضی شده است',
        messageFA: 'کد تایید نامعتبر یا منقضی شده است'
      });
    }

  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'خطای سیستمی در تایید کد',
      messageFA: 'خطای سیستمی در تایید کد'
    });
  }
});

// Refresh token
router.post('/refresh-token', refreshToken);

// Forgot password - send OTP
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber || !phoneNumber.match(/^(\+98|0)?9\d{9}$/)) {
      return res.status(400).json({
        success: false,
        message: 'شماره موبایل صحیح نیست'
      });
    }

    const normalizedPhone = phoneNumber.replace(/^(\+98|0)/, '+98');

    // Check if user exists
    const userResult = await query(
      'SELECT id FROM users WHERE phone_number = $1',
      [normalizedPhone]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'کاربری با این شماره موبایل یافت نشد'
      });
    }

    const result = await smsService.sendOTP(normalizedPhone);

    res.json({
      success: result.success,
      message: result.message
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'خطای سیستمی در ارسال کد بازیابی'
    });
  }
});

// Reset password
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { phoneNumber, otpCode, newPassword } = req.body;

    if (!phoneNumber || !otpCode || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'تمام فیلدها الزامی است'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'رمز عبور باید حداقل 8 کاراکتر باشد'
      });
    }

    const normalizedPhone = phoneNumber.replace(/^(\+98|0)/, '+98');

    // Verify OTP
    const isValidOTP = await smsService.verifyOTP(normalizedPhone, otpCode);
    if (!isValidOTP) {
      return res.status(400).json({
        success: false,
        message: 'کد تایید نامعتبر یا منقضی شده است'
      });
    }

    // Hash new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    const updateResult = await query(
      'UPDATE users SET password_hash = $1 WHERE phone_number = $2 RETURNING id',
      [passwordHash, normalizedPhone]
    );

    if (updateResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'کاربر یافت نشد'
      });
    }

    res.json({
      success: true,
      message: 'رمز عبور با موفقیت تغییر ک��د'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'خطای سیس��می در تغییر رمز عبو��'
    });
  }
});

// Complete identity verification
router.post('/verify-identity', authenticateToken, upload.fields([
  { name: 'nationalCardImage', maxCount: 1 },
  { name: 'selfieImage', maxCount: 1 }
]), async (req: AuthenticatedRequest, res) => {
  try {
    const {
      firstName,
      lastName,
      nationalId,
      phoneNumber,
      province,
      city,
      birthDate,
      otpCode
    } = req.body;

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    // Validation
    if (!firstName || !lastName || !nationalId || !phoneNumber || !province || !city || !birthDate || !otpCode) {
      return res.status(400).json({
        success: false,
        message: 'تمام فیلدهای الزامی را پر کنید'
      });
    }

    if (!files.nationalCardImage || !files.selfieImage) {
      return res.status(400).json({
        success: false,
        message: 'آپلود تصاویر مدارک الزامی است'
      });
    }

    // Verify OTP
    const normalizedPhone = phoneNumber.replace(/^(\+98|0)/, '+98');
    const isValidOTP = await smsService.verifyOTP(normalizedPhone, otpCode);
    if (!isValidOTP) {
      return res.status(400).json({
        success: false,
        message: 'کد تایید نامعتبر ی�� منقضی شده است'
      });
    }

    // Update user information
    await query(
      `UPDATE users SET
         first_name = $1,
         last_name = $2,
         national_id = $3,
         phone_number = $4,
         birth_date = $5,
         address = $6,
         is_verified = true,
         updated_at = NOW()
       WHERE id = $7`,
      [firstName, lastName, nationalId, normalizedPhone, birthDate, `${city}, ${province}`, req.user!.id]
    );

    // Save verification documents
    await query(
      `INSERT INTO verification_documents (
         user_id,
         national_card_image,
         selfie_image,
         national_id,
         province,
         city,
         birth_date,
         verification_status,
         created_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'approved', NOW())`,
      [
        req.user!.id,
        files.nationalCardImage[0].path,
        files.selfieImage[0].path,
        nationalId,
        province,
        city,
        birthDate
      ]
    );

    res.json({
      success: true,
      message: 'احراز هویت با موفقیت تکمیل شد'
    });

  } catch (error) {
    console.error('Verify identity error:', error);

    // Clean up uploaded files on error
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    if (files) {
      Object.values(files).flat().forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }

    res.status(500).json({
      success: false,
      message: 'خطای سیستمی در احراز هویت'
    });
  }
});

export default router;
