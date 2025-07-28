import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertCircle,
  Upload,
  Camera,
  CheckCircle,
  FileText,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/contexts/AuthContext";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { PersianDateInput } from "@/components/ui/persian-date-input";
import moment from "moment-jalaali";

interface VerificationData {
  firstName: string;
  lastName: string;
  nationalId: string;
  phoneNumber: string;
  province: string;
  city: string;
  birthDate: string;
  otpCode: string;
  nationalCardImage?: File;
  selfieImage?: File;
}

const provinces = [
  "تهران",
  "اصفهان",
  "فارس",
  "خراسان رضوی",
  "کرمان",
  "خوزستان",
  "مازندران",
  "آذربایجان شرقی",
  "آذربایجان غربی",
  "کرمانشاه",
  "گیلان",
  "لرستان",
  "مرکزی",
  "هرمزگان",
  "همدان",
  "یزد",
  "کردستان",
  "ایلام",
  "بوشهر",
  "زنجان",
  "سمنان",
  "قزوین",
  "قم",
  "گلستان",
  "خراسان شمالی",
  "خراسان جنوبی",
  "البرز",
  "اردبیل",
  "چهارمحال و بختیاری",
  "کهگیلویه و بویراحمد",
];

export default function VerificationForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);

  // Total steps: 3 if phone verified, 4 if not
  const totalSteps = user?.isVerified ? 3 : 4;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [formData, setFormData] = useState<VerificationData>({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    nationalId: "",
    phoneNumber: user?.phoneNumber || "",
    province: "",
    city: "",
    birthDate: "",
    otpCode: "",
  });

  const handleInputChange = (field: keyof VerificationData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const handleFileUpload = (
    field: "nationalCardImage" | "selfieImage",
    file: File,
  ) => {
    if (file.size > 5 * 1024 * 1024) {
      // 5MB limit
      setError("حجم فایل نباید بیشتر از ۵ مگابایت باشد");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("فقط فایل‌های تصویری مجاز هستند");
      return;
    }

    setFormData((prev) => ({ ...prev, [field]: file }));
  };

  const sendOTP = async () => {
    if (!formData.phoneNumber) {
      setError("شماره موبایل الزامی است");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phoneNumber: formData.phoneNumber,
          type: "verification",
        }),
      });

      if (response.ok) {
        setOtpSent(true);
        setError("");
      } else {
        const data = await response.json();
        setError(data.message || "خطا در ارسال کد تأیید");
      }
    } catch (err) {
      setError("خطا در ارسال کد تأیید");
    } finally {
      setLoading(false);
    }
  };

  const validateStep1 = () => {
    if (!formData.firstName || !formData.lastName) {
      setError("نام و نام خانوادگی الزامی است");
      return false;
    }
    if (!formData.nationalId || formData.nationalId.length !== 10) {
      setError("شماره ملی باید ۱۰ رقم باشد");
      return false;
    }
    if (!formData.phoneNumber) {
      setError("شماره موبایل الزامی است");
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.province || !formData.city) {
      setError("انتخاب استان و شهر الزامی است");
      return false;
    }
    if (!formData.birthDate) {
      setError("تاریخ تولد ا��زامی است");
      return false;
    }

    // Validate age (18-120 years)
    try {
      const birth = moment(formData.birthDate);
      const today = moment();
      const age = today.diff(birth, "years");

      if (age < 18) {
        setError("سن شما باید بیشتر از ۱۸ سال باشد");
        return false;
      }
      if (age > 120) {
        setError("سن وارد شده معتبر نیست");
        return false;
      }
    } catch (error) {
      setError("تاریخ تولد وارد شده صحیح نیست");
      return false;
    }

    return true;
  };

  const validateStep3 = () => {
    if (!formData.nationalCardImage) {
      setError("آپلود تصویر کارت ملی الزامی است");
      return false;
    }
    if (!formData.selfieImage) {
      setError("آپلود عکس سلفی الزامی است");
      return false;
    }
    return true;
  };

  const validateStep4 = () => {
    if (!formData.otpCode || formData.otpCode.length !== 6) {
      setError("کد تأیید باید ۶ رقم باشد");
      return false;
    }
    return true;
  };

  const nextStep = () => {
    setError("");

    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    if (currentStep === 3 && !validateStep3()) return;

    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setError("");
    }
  };

  const submitVerification = async () => {
    // If this is step 4 and we need OTP verification
    if (currentStep === 4 && !user?.isVerified) {
      if (!validateStep4()) return;
    }

    setLoading(true);
    try {
      // Only verify OTP if user is not already verified
      if (!user?.isVerified && formData.otpCode) {
        const otpResponse = await fetch("/api/auth/verify-otp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            phoneNumber: formData.phoneNumber,
            code: formData.otpCode,
          }),
        });

        const otpData = await otpResponse.json();
        if (!otpData.success) {
          setError(otpData.message || "کد تأیید نامعتبر است");
          return;
        }
      }

      // Then submit identity verification with all documents
      const formDataToSend = new FormData();
      formDataToSend.append("firstName", formData.firstName);
      formDataToSend.append("lastName", formData.lastName);
      formDataToSend.append("nationalId", formData.nationalId);
      formDataToSend.append("phoneNumber", formData.phoneNumber);
      formDataToSend.append("province", formData.province);
      formDataToSend.append("city", formData.city);
      formDataToSend.append("birthDate", formData.birthDate);

      if (formData.nationalCardImage) {
        formDataToSend.append("nationalCardImage", formData.nationalCardImage);
      }
      if (formData.selfieImage) {
        formDataToSend.append("selfieImage", formData.selfieImage);
      }

      const response = await fetch("/api/auth/verify-identity", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("zemano_token")}`,
        },
        body: formDataToSend,
      });

      if (response.ok) {
        // Redirect based on user role
        if (user?.role === "employer") {
          navigate("/projects/create");
        } else {
          navigate("/dashboard");
        }
      } else {
        const data = await response.json();
        setError(data.message || "خطا در تکمیل احراز هویت");
      }
    } catch (err) {
      setError("خطا در ارسال اطلاعات");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto max-w-2xl px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            احراز هویت کامل
          </h1>
          <p className="text-gray-600">
            برای استفاده از تمام امکانات پلتفرم، لطفاً اطلاعات زیر را تکمیل کنید
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
              <div
                key={step}
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                  ${
                    step <= currentStep
                      ? "bg-zemano-600 text-white"
                      : "bg-gray-200 text-gray-500"
                  }`}
              >
                {step < currentStep ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  step
                )}
              </div>
            ))}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-zemano-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>اطلاعات پایه</span>
            <span>آدرس</span>
            <span>مدارک</span>
            {!user?.isVerified && <span>تأیید</span>}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {currentStep === 1 && "اطلاعات شخصی"}
              {currentStep === 2 && "اطلاعات آدرس"}
              {currentStep === 3 && "��پلود مدارک"}
              {currentStep === 4 && "تأیید شماره موبایل"}
            </CardTitle>
            <CardDescription>
              {currentStep === 1 && "لطفاً اطلاعات شخصی خود را وارد کنید"}
              {currentStep === 2 && "آدرس محل سکونت خود را مشخص کنید"}
              {currentStep === 3 && "تصاویر مدارک هویتی خود را آپلود کنید"}
              {currentStep === 4 &&
                "کد تأیید ارسال شده به موبایل خود را وارد کنید"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Step 1: Personal Information */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">نام</Label>
                    <Input
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) =>
                        handleInputChange("firstName", e.target.value)
                      }
                      placeholder="نام خود را وارد کنید"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">نام خانوادگی</Label>
                    <Input
                      id="lastName"
                      value={formData.lastName}
                      onChange={(e) =>
                        handleInputChange("lastName", e.target.value)
                      }
                      placeholder="نام خانواد��ی خود را وارد کنید"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="nationalId">شماره ملی</Label>
                  <Input
                    id="nationalId"
                    value={formData.nationalId}
                    onChange={(e) =>
                      handleInputChange("nationalId", e.target.value)
                    }
                    placeholder="شماره ملی ۱۰ رقم��"
                    maxLength={10}
                  />
                </div>

                <div>
                  <Label htmlFor="phoneNumber">شماره موبایل</Label>
                  <Input
                    id="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={(e) =>
                      handleInputChange("phoneNumber", e.target.value)
                    }
                    placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                    dir="ltr"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Address Information */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="province">استان</Label>
                  <Select
                    onValueChange={(value) =>
                      handleInputChange("province", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="استان خود را انتخاب کنید" />
                    </SelectTrigger>
                    <SelectContent>
                      {provinces.map((province) => (
                        <SelectItem key={province} value={province}>
                          {province}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="city">شهر</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                    placeholder="شهر خود را وارد کنید"
                  />
                </div>

                <PersianDateInput
                  id="birthDate"
                  label="تاریخ تولد (شمسی)"
                  value={formData.birthDate}
                  onChange={(value) => handleInputChange("birthDate", value)}
                />
              </div>
            )}

            {/* Step 3: Document Upload */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <Label>تصویر کارت ملی</Label>
                  <div className="mt-2">
                    <div className="flex items-center justify-center w-full">
                      <label
                        htmlFor="nationalCard"
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                      >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          {formData.nationalCardImage ? (
                            <div className="text-center">
                              <FileText className="w-8 h-8 mb-2 text-green-500" />
                              <p className="text-sm text-green-600">
                                {formData.nationalCardImage.name}
                              </p>
                            </div>
                          ) : (
                            <div className="text-center">
                              <Upload className="w-8 h-8 mb-2 text-gray-400" />
                              <p className="text-sm text-gray-500">
                                برای آپلود کلیک کنید
                              </p>
                            </div>
                          )}
                        </div>
                        <input
                          id="nationalCard"
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file)
                              handleFileUpload("nationalCardImage", file);
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <Label>عکس سلفی با کارت ملی</Label>
                  <div className="mt-2">
                    <div className="flex items-center justify-center w-full">
                      <label
                        htmlFor="selfie"
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
                      >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          {formData.selfieImage ? (
                            <div className="text-center">
                              <FileText className="w-8 h-8 mb-2 text-green-500" />
                              <p className="text-sm text-green-600">
                                {formData.selfieImage.name}
                              </p>
                            </div>
                          ) : (
                            <div className="text-center">
                              <Camera className="w-8 h-8 mb-2 text-gray-400" />
                              <p className="text-sm text-gray-500">
                                عکس سلفی با کارت
                              </p>
                            </div>
                          )}
                        </div>
                        <input
                          id="selfie"
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload("selfieImage", file);
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">نکات مهم:</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• تصاویر باید واضح و قابل خواندن باشند</li>
                    <li>• حجم هر فایل حداکثر ۵ مگابایت</li>
                    <li>• در عکس سلفی، کارت ملی را کنار صورت خود نگه دارید</li>
                  </ul>
                </div>

                {user?.isVerified && (
                  <div className="p-4 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">شماره موبایل تایید شده</span>
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                      شماره موبایل شما قبلاً تایید شده است. پس از آپلود مدارک، احراز هویت تکمیل خواهد شد.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: OTP Verification */}
            {currentStep === 4 && !user?.isVerified && (
              <div className="space-y-6">
                <div className="text-center">
                  <p className="text-gray-600 mb-4">
                    کد تأیید به شماره {formData.phoneNumber} ارسال شد
                  </p>

                  {!otpSent ? (
                    <Button onClick={sendOTP} disabled={loading}>
                      {loading ? "در حال ارسال..." : "ارسال کد تأیید"}
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <Label>کد تأیید ۶ رقمی</Label>
                      <div className="flex justify-center">
                        <InputOTP
                          maxLength={6}
                          value={formData.otpCode}
                          onChange={(value) =>
                            handleInputChange("otpCode", value)
                          }
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

                      <Button
                        variant="outline"
                        onClick={sendOTP}
                        disabled={loading}
                        className="text-sm"
                      >
                        ارسال مجدد کد
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
              >
                مرحله قبل
              </Button>

              {currentStep < totalSteps ? (
                <Button onClick={nextStep}>مرحله بعد</Button>
              ) : (
                <Button
                  onClick={submitVerification}
                  disabled={loading || (!user?.isVerified && !otpSent)}
                  className="bg-zemano-600 hover:bg-zemano-700"
                >
                  {loading ? "در حال تأیید..." : "تکمیل احراز هویت"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
