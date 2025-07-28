import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, LogIn, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string[];
  showLoginPrompt?: boolean;
  requiresVerification?: boolean;
}

export default function ProtectedRoute({
  children,
  requiredRole,
  showLoginPrompt = true,
  requiresVerification = true
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zemano-600 mx-auto mb-4"></div>
          <p className="text-gray-600">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (showLoginPrompt) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center py-20">
          <div className="container mx-auto px-4">
            <Card className="max-w-md mx-auto text-center">
              <CardHeader className="space-y-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-zemano-500 to-zemano-600 flex items-center justify-center mx-auto">
                  <Lock className="w-8 h-8 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold mb-2">ورود مورد نیاز</CardTitle>
                  <CardDescription className="text-lg">
                    برای دسترسی به این صفحه ابتدا وارد حساب کاربری خود شوید
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button asChild className="bg-gradient-to-r from-zemano-500 to-zemano-600 hover:from-zemano-600 hover:to-zemano-700">
                    <Link to={`/login?redirect=${encodeURIComponent(location.pathname)}`}>
                      <LogIn className="mr-2 h-4 w-4" />
                      ورود به حساب
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/register">
                      ثبت نام
                    </Link>
                  </Button>
                </div>
                <div className="pt-4">
                  <Button variant="ghost" asChild>
                    <Link to="/">
                      بازگشت به صفحه اصلی
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    } else {
      return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
    }
  }

  // Check verification requirement
  if (requiresVerification && !user.isVerified) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center py-20">
        <div className="container mx-auto px-4">
          <Card className="max-w-md mx-auto text-center">
            <CardHeader className="space-y-6">
              <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8 text-yellow-600" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold mb-2">احراز هویت مورد نیاز</CardTitle>
                <CardDescription className="text-lg">
                  برای دسترسی به این صفحه باید احراز هویت خود را تکمیل کنید
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button asChild className="bg-gradient-to-r from-zemano-500 to-zemano-600 hover:from-zemano-600 hover:to-zemano-700">
                <Link to="/verification">
                  تکمیل احراز هویت
                </Link>
              </Button>
              <div className="pt-4">
                <Button variant="ghost" asChild>
                  <Link to="/dashboard">
                    بازگشت به داشبورد
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Check role permission
  if (requiredRole && !requiredRole.includes(user.role)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center py-20">
        <div className="container mx-auto px-4">
          <Card className="max-w-md mx-auto text-center">
            <CardHeader className="space-y-6">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                <Lock className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold mb-2">دسترسی محدود</CardTitle>
                <CardDescription className="text-lg">
                  شما دسترسی لازم برای مشاهده این صفحه را ندارید
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <Button variant="ghost" asChild>
                <Link to="/dashboard">
                  بازگشت به داشبورد
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
