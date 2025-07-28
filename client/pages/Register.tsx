import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Shield, Eye, EyeOff, Phone, Lock, User, Mail, Briefcase, UserCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function Register() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    password: "",
    confirmPassword: "",
    userRole: "employer", // "employer" or "contractor"
    agreeToTerms: false,
    agreeToNewsletters: false
  });

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.firstName.trim()) {
      toast.error("نام الزامی است");
      return false;
    }
    if (!formData.lastName.trim()) {
      toast.error("نام خانوادگی الزامی است");
      return false;
    }
    if (!formData.email.trim()) {
      toast.error("ایمیل الزامی است");
      return false;
    }
    if (!formData.phoneNumber.trim()) {
      toast.error("شماره موبایل الزامی است");
      return false;
    }
    if (formData.password.length < 8) {
      toast.error("رمز عبور باید حداقل 8 کاراکتر باشد");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error("رمز عبور و تکرار آن یکسان نیست");
      return false;
    }
    if (!formData.agreeToTerms) {
      toast.error("باید قوانین و مقررات را بپذیرید");
      return false;
    }
    return true;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await register({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        password: formData.password,
        role: formData.userRole
      });

      if (result.success) {
        toast.success(result.message);
        navigate("/dashboard");
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("خطا در ثبت نام");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-20">
      <div className="container mx-auto px-4">
        <div className="max-w-lg mx-auto">
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
            <h1 className="text-2xl font-bold">ایجاد حساب کاربری</h1>
            <p className="text-muted-foreground mt-2">
              به جمع کاربران ضمانو بپیوندید
            </p>
          </div>

          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-center text-xl">ثبت نام</CardTitle>
              <CardDescription className="text-center">
                اطلاعات خود را برای ایجاد حساب وارد کنید
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRegister} className="space-y-6">
                {/* Name Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-right block">نام</Label>
                    <div className="relative">
                      <User className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="firstName"
                        type="text"
                        placeholder="نام خود را وارد کنید"
                        value={formData.firstName}
                        onChange={(e) => handleInputChange("firstName", e.target.value)}
                        className="pr-10"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-right block">نام خانوادگی</Label>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="نام خانوادگی"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange("lastName", e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-right block">آدرس ایمیل</Label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="example@email.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      className="pr-10 text-left"
                      dir="ltr"
                      required
                    />
                  </div>
                </div>

                {/* Phone Number */}
                <div className="space-y-2">
                  <Label htmlFor="phoneRegister" className="text-right block">شماره موبایل</Label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phoneRegister"
                      type="tel"
                      placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                      value={formData.phoneNumber}
                      onChange={(e) => handleInputChange("phoneNumber", e.target.value)}
                      className="pr-10 text-right"
                      dir="ltr"
                      required
                    />
                  </div>
                </div>

                {/* User Role */}
                <div className="space-y-3">
                  <Label className="text-right block">نقش کاربری</Label>
                  <RadioGroup
                    value={formData.userRole}
                    onValueChange={(value) => handleInputChange("userRole", value)}
                    className="space-y-3"
                  >
                    <div className="flex items-center space-x-2 rtl:space-x-reverse p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="employer" id="employer" />
                      <div className="flex items-center space-x-2 rtl:space-x-reverse flex-1">
                        <Briefcase className="h-4 w-4 text-zemano-600" />
                        <div>
                          <Label htmlFor="employer" className="font-medium cursor-pointer">کارفرما</Label>
                          <p className="text-xs text-muted-foreground">پروژه ایجاد می‌کنم و مجری استخدام می‌کنم</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 rtl:space-x-reverse p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="contractor" id="contractor" />
                      <div className="flex items-center space-x-2 rtl:space-x-reverse flex-1">
                        <UserCheck className="h-4 w-4 text-trust-600" />
                        <div>
                          <Label htmlFor="contractor" className="font-medium cursor-pointer">مجری</Label>
                          <p className="text-xs text-muted-foreground">پروژه‌ها را انجام می‌دهم و درآمد کسب می‌کنم</p>
                        </div>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="passwordRegister" className="text-right block">رمز عبور</Label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="passwordRegister"
                      type={showPassword ? "text" : "password"}
                      placeholder="رمز عبور قوی انتخاب کنید"
                      value={formData.password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                      className="pr-10 pl-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-3 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-right block">تکرار رمز عبور</Label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="رمز عبور را مجدداً وارد کنید"
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                      className="pr-10 pl-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute left-3 top-3 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Terms Agreement */}
                <div className="space-y-4">
                  <div className="flex items-start space-x-2 rtl:space-x-reverse">
                    <Checkbox
                      id="terms"
                      checked={formData.agreeToTerms}
                      onCheckedChange={(checked) => handleInputChange("agreeToTerms", checked === true)}
                      className="mt-1"
                      required
                    />
                    <Label htmlFor="terms" className="text-sm leading-relaxed cursor-pointer">
                      با{" "}
                      <Link to="/terms" className="text-zemano-600 hover:underline">
                        قوانین و مقررات
                      </Link>{" "}
                      و{" "}
                      <Link to="/privacy" className="text-zemano-600 hover:underline">
                        حریم خصو��ی
                      </Link>{" "}
                      ضمانو موافقم
                    </Label>
                  </div>
                  
                  <div className="flex items-start space-x-2 rtl:space-x-reverse">
                    <Checkbox
                      id="newsletter"
                      checked={formData.agreeToNewsletters}
                      onCheckedChange={(checked) => handleInputChange("agreeToNewsletters", checked === true)}
                      className="mt-1"
                    />
                    <Label htmlFor="newsletter" className="text-sm leading-relaxed cursor-pointer">
                      مایل به دریافت اخبار و پیشنهادات ضمانو هستم
                    </Label>
                  </div>
                </div>

                {/* Register Button */}
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-zemano-500 to-zemano-600 hover:from-zemano-600 hover:to-zemano-700 text-lg py-6"
                  disabled={!formData.agreeToTerms}
                >
                  ایجاد حساب کاربری
                </Button>

                {/* Login Link */}
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    قبلاً حساب دارید؟{" "}
                    <Link 
                      to="/login" 
                      className="text-zemano-600 hover:text-zemano-700 font-medium hover:underline"
                    >
                      وارد شوید
                    </Link>
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
