import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Shield, CheckCircle, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { toast } from "sonner";

export default function OTPVerification() {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const { user, verifyOTP, sendOTP } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const phoneNumber = searchParams.get("phone") || user?.phoneNumber || "";

  // Countdown timer for resend button
  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [resendTimer]);

  // Redirect if no phone number or already verified
  useEffect(() => {
    if (!phoneNumber) {
      navigate("/register");
      return;
    }
    if (user?.isVerified) {
      navigate("/dashboard");
      return;
    }
  }, [phoneNumber, user, navigate]);

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      setError("کد تأیید باید ۶ رقم باشد");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await verifyOTP(phoneNumber, otp);

      if (result.success) {
        toast.success("شماره موبایل با موفقیت تأیید شد");
        // Check if user needs identity verification
        if (user?.role === 'employer') {
          navigate("/verification");
        } else {
          navigate("/dashboard");
        }
      } else {
        setError(result.message);
      }
    } catch (error) {
      setError("خطا در تأیید کد");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setResendLoading(true);
    setError("");

    try {
      const result = await sendOTP(phoneNumber);

      if (result.success) {
        toast.success("کد تأیید مجدداً ارسال شد");
        setResendTimer(60);
        setCanResend(false);
        setOtp("");
      } else {
        setError(result.message);
      }
    } catch (error) {
      setError("خطا در ارسال مجدد کد");
    } finally {
      setResendLoading(false);
    }
  };

  const formatPhoneNumber = (phone: string) => {
    // Format +989123456789 to 0912***6789
    if (phone.startsWith('+98')) {
      const number = phone.substring(3);
      return `${number.substring(0, 4)}***${number.substring(7)}`;
    } else if (phone.startsWith('09')) {
      return `${phone.substring(0, 4)}***${phone.substring(7)}`;
    }
    return phone;
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-md mx-auto">
          {/* Brand Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-2 rtl:space-x-reverse mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-zemano-500 to-zemano-600">
                <Shield className="h-7 w-7 text-white" />
              </div>
              <span className="text-3xl font-bold bg-gradient-to-r from-zemano-600 to-zemano-500 bg-clip-text text-transparent">
                ضمانو
              </span>
            </div>
            <h1 className="text-2xl font-bold">تأیید شماره موبایل</h1>
            <p className="text-muted-foreground mt-2">
              کد تأی��د ارسال شده را وارد کنید
            </p>
          </div>

          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur">
            <CardHeader className="space-y-1 pb-6 text-center">
              <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-zemano-100 to-zemano-200 rounded-full">
                <CheckCircle className="w-8 h-8 text-zemano-600" />
              </div>
              <CardTitle className="text-xl">تأیید کد پیامک</CardTitle>
              <CardDescription>
                کد تأیید ۶ رقمی به شماره{" "}
                <span className="font-medium text-foreground">
                  {formatPhoneNumber(phoneNumber)}
                </span>{" "}
                ارسال شد
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* OTP Input */}
              <div className="space-y-4">
                <Label className="text-center block">کد تأی��د ۶ رقمی</Label>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={(value) => {
                      setOtp(value);
                      setError("");
                    }}
                    dir="rtl"
                    containerClassName="flex-row-reverse"
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={5} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={3} />
                    </InputOTPGroup>
                    <InputOTPSeparator />
                    <InputOTPGroup>
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={0} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              </div>

              {/* Verify Button */}
              <Button
                onClick={handleVerifyOTP}
                className="w-full bg-gradient-to-r from-zemano-500 to-zemano-600 hover:from-zemano-600 hover:to-zemano-700 text-lg py-6"
                disabled={loading || otp.length !== 6}
              >
                {loading ? "در حال تأیید..." : "تأیید کد"}
              </Button>

              {/* Resend Code */}
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  کد را دریافت نکردید؟
                </p>
                
                {canResend ? (
                  <Button
                    variant="outline"
                    onClick={handleResendOTP}
                    disabled={resendLoading}
                    className="text-sm"
                  >
                    {resendLoading ? "در حال ارسال..." : "ارسال مجدد کد"}
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    ارسال مجدد تا {resendTimer} ثانیه دیگر
                  </p>
                )}
              </div>

              {/* Back Link */}
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  شماره اشتباه است؟{" "}
                  <button
                    onClick={() => navigate("/register")}
                    className="text-zemano-600 hover:text-zemano-700 font-medium hover:underline"
                  >
                    ویرایش شماره موبایل
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Security Note */}
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground leading-relaxed">
              برای امنیت حساب شما، کد تأیید فقط ۱۰ دقیقه معتبر است.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
