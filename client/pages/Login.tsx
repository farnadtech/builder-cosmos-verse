import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Shield, Eye, EyeOff, Phone, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!phoneNumber.trim() || !password.trim()) {
      toast.error("لطفاً تمام فیلدها را پر کنید");
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(phoneNumber, password);

      if (result.success) {
        toast.success(result.message);
        navigate("/dashboard");
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error("خطا در ورود");
    } finally {
      setIsLoading(false);
    }
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
            <h1 className="text-2xl font-bold">ورود به حساب کاربری</h1>
            <p className="text-muted-foreground mt-2">
              با شماره موبایل و رمز عبور خود وارد شوید
            </p>
          </div>

          <Card className="border-0 shadow-xl bg-white/80 backdrop-blur">
            <CardHeader className="space-y-1 pb-6">
              <CardTitle className="text-center text-xl">خوش آمدید</CardTitle>
              <CardDescription className="text-center">
                اطلاعات ورود خود را وارد کنید
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-6">
                {/* Phone Number */}
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-right block">شماره موبایل</Label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="pr-10 text-right"
                      dir="ltr"
                      required
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-right block">رمز عبور</Label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="رمز عبور خود را وارد کنید"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
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

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <Checkbox
                      id="remember"
                      checked={rememberMe}
                      onCheckedChange={(checked) => setRememberMe(checked === true)}
                    />
                    <Label htmlFor="remember" className="text-sm cursor-pointer">
                      مرا به خاطر بسپار
                    </Label>
                  </div>
                  <Link 
                    to="/forgot-password" 
                    className="text-sm text-zemano-600 hover:text-zemano-700 hover:underline"
                  >
                    فراموشی رمز عبور
                  </Link>
                </div>

                {/* Login Button */}
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-zemano-500 to-zemano-600 hover:from-zemano-600 hover:to-zemano-700 text-lg py-6"
                >
                  ورود
                </Button>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">یا</span>
                  </div>
                </div>

                {/* Register Link */}
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    حساب کاربری ندارید؟{" "}
                    <Link 
                      to="/register" 
                      className="text-zemano-600 hover:text-zemano-700 font-medium hover:underline"
                    >
                      ثبت نام کنید
                    </Link>
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Security Notice */}
          <div className="mt-6 text-center">
            <p className="text-xs text-muted-foreground leading-relaxed">
              با ورود به سیستم، شما{" "}
              <Link to="/terms" className="text-zemano-600 hover:underline">
                قوانین و مقررات
              </Link>{" "}
              و{" "}
              <Link to="/privacy" className="text-zemano-600 hover:underline">
                حریم خصوصی
              </Link>{" "}
              ضمانو را می‌پذیرید.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
