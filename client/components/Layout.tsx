import { Link } from "react-router-dom";
import { Shield, Menu, User, Wallet, MessageSquare, FileText, Gavel, LogOut } from "lucide-react";
import { Button } from "./ui/button";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background font-vazir">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 rtl:space-x-reverse">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-zemano-500 to-zemano-600">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-zemano-600 to-zemano-500 bg-clip-text text-transparent">
              ضمانو
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link to="/projects" className="text-sm font-medium transition-colors hover:text-zemano-600">
              پروژه‌ها
            </Link>
            <Link to="/arbitration" className="text-sm font-medium transition-colors hover:text-zemano-600">
              داوری
            </Link>
            <Link to="/about" className="text-sm font-medium transition-colors hover:text-zemano-600">
              درباره ما
            </Link>
            <Link to="/contact" className="text-sm font-medium transition-colors hover:text-zemano-600">
              تماس
            </Link>
          </nav>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link to="/login">ورود</Link>
            </Button>
            <Button asChild className="bg-gradient-to-r from-zemano-500 to-zemano-600 hover:from-zemano-600 hover:to-zemano-700">
              <Link to="/register">ثبت نام</Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-background/95 backdrop-blur">
            <div className="container py-4 space-y-4">
              <nav className="flex flex-col space-y-2">
                <Link
                  to="/projects"
                  className="text-sm font-medium transition-colors hover:text-zemano-600 py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  پروژه‌ها
                </Link>
                <Link
                  to="/arbitration"
                  className="text-sm font-medium transition-colors hover:text-zemano-600 py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  داوری
                </Link>
                <Link
                  to="/about"
                  className="text-sm font-medium transition-colors hover:text-zemano-600 py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  درباره ما
                </Link>
                <Link
                  to="/contact"
                  className="text-sm font-medium transition-colors hover:text-zemano-600 py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  تماس
                </Link>
              </nav>
              <div className="flex flex-col space-y-2 pt-4 border-t">
                <Button variant="ghost" asChild>
                  <Link to="/login" onClick={() => setMobileMenuOpen(false)}>ورود</Link>
                </Button>
                <Button asChild className="bg-gradient-to-r from-zemano-500 to-zemano-600">
                  <Link to="/register" onClick={() => setMobileMenuOpen(false)}>ثبت نام</Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t bg-muted/50">
        <div className="container py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-zemano-500 to-zemano-600">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold">ضمانو</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                پلتفرم پرداخت امانی برای پروژه‌های خدماتی با تضمین امنیت و اطمینان
              </p>
            </div>

            {/* Quick Links */}
            <div className="space-y-4">
              <h3 className="font-semibold">دسترسی سریع</h3>
              <nav className="flex flex-col space-y-2">
                <Link to="/projects" className="text-sm text-muted-foreground hover:text-zemano-600 transition-colors">
                  پروژه‌ها
                </Link>
                <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-zemano-600 transition-colors">
                  داشبورد
                </Link>
                <Link to="/wallet" className="text-sm text-muted-foreground hover:text-zemano-600 transition-colors">
                  کیف پول
                </Link>
                <Link to="/arbitration" className="text-sm text-muted-foreground hover:text-zemano-600 transition-colors">
                  داوری
                </Link>
              </nav>
            </div>

            {/* Support */}
            <div className="space-y-4">
              <h3 className="font-semibold">پشتیبانی</h3>
              <nav className="flex flex-col space-y-2">
                <Link to="/help" className="text-sm text-muted-foreground hover:text-zemano-600 transition-colors">
                  راهنما
                </Link>
                <Link to="/contact" className="text-sm text-muted-foreground hover:text-zemano-600 transition-colors">
                  تماس با ما
                </Link>
                <Link to="/faq" className="text-sm text-muted-foreground hover:text-zemano-600 transition-colors">
                  سوالات متداول
                </Link>
                <Link to="/terms" className="text-sm text-muted-foreground hover:text-zemano-600 transition-colors">
                  قوانین و مقررات
                </Link>
              </nav>
            </div>

            {/* Contact */}
            <div className="space-y-4">
              <h3 className="font-semibold">تماس</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>پشتیبانی: ۰۲۱-۱۲۳۴۵۶۷۸</p>
                <p>ایمیل: support@zemano.ir</p>
                <p>آدرس: تهران، ایران</p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
            <p>© ۱۴۰۳ ضمانو. تمامی حقوق محفوظ است.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
