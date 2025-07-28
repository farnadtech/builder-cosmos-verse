import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Users, Clock, CheckCircle, ArrowRight, Star, Zap, Lock, Globe } from "lucide-react";

export default function Index() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-zemano-50 via-white to-trust-50"></div>
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))]"></div>
        
        <div className="relative container mx-auto px-4">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-zemano-100 text-zemano-700 text-sm font-medium mb-8">
              <Shield className="w-4 h-4 ml-2" />
              پلتفرم پرداخت امانی ایران
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-zemano-600 via-zemano-500 to-trust-600 bg-clip-text text-transparent mb-6 leading-tight">
              ضمانو
            </h1>
            
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
              پلتفرم امن پرداخت امانی برای پروژه‌های خدماتی
              <br />
              <span className="text-zemano-600 font-semibold">با تضمین ۱۰۰٪ امنیت</span>
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
              <Button size="lg" asChild className="bg-gradient-to-r from-zemano-500 to-zemano-600 hover:from-zemano-600 hover:to-zemano-700 text-lg px-8 py-6">
                <Link to="/register">
                  شروع رایگان
                  <ArrowRight className="mr-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="text-lg px-8 py-6">
                <Link to="/about">
                  بیشتر بدانید
                </Link>
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap justify-center items-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-trust-500" />
                ۱۰۰+ پروژه موفق
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-trust-500" />
                تضمین امنیت کامل
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-trust-500" />
                رضایت ۹۸٪ کاربران
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">چرا ضمانو؟</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              امنیت، سرعت و اطمینان در هر تراکنش
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-white/50 backdrop-blur">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-zemano-500 to-zemano-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <CardTitle>پرداخت امانی</CardTitle>
                <CardDescription>
                  پول در حساب واسط امان نگهداری می‌شود تا پس از تحویل کامل پروژه آزاد گردد
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-white/50 backdrop-blur">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-trust-500 to-trust-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <CardTitle>سیستم داوری</CardTitle>
                <CardDescription>
                  در صورت بروز اختلاف، داوران متخصص به صورت منصفانه رأی صادر می‌کنند
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-white/50 backdrop-blur">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-warning-500 to-warning-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <CardTitle>پرداخت مرحله‌ای</CardTitle>
                <CardDescription>
                  امکان تقسیم پروژه به مراحل مختلف و پرداخت تدریجی بر اساس پیشرفت کار
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-white/50 backdrop-blur">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-success-500 to-success-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <CardTitle>پردازش سریع</CardTitle>
                <CardDescription>
                  تراکنش‌های آنی و پردازش سریع پرداخت‌ها از طریق زرین‌پال
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-white/50 backdrop-blur">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Lock className="w-6 h-6 text-white" />
                </div>
                <CardTitle>امنیت بالا</CardTitle>
                <CardDescription>
                  استفاده از آخرین تکنولوژی‌های امنیتی و رمزنگاری اطلاعات
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="group hover:shadow-lg transition-all duration-300 border-0 bg-white/50 backdrop-blur">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Globe className="w-6 h-6 text-white" />
                </div>
                <CardTitle>پشتیبانی ۲۴/۷</CardTitle>
                <CardDescription>
                  تیم پشتیبانی متخصص آماده پاسخگویی در تمام ساعات شبانه‌روز
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">چگونه کار می‌کند؟</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              فرآیند ساده و امن در ۴ قدم
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                step: "۱",
                title: "ثبت پروژه",
                description: "��ارفرما پروژه خود را با تمام جزئیات ثبت می‌کند",
                color: "from-zemano-500 to-zemano-600"
              },
              {
                step: "۲", 
                title: "پرداخت امانی",
                description: "مبلغ پروژه به حساب امانی واریز می‌شود",
                color: "from-trust-500 to-trust-600"
              },
              {
                step: "۳",
                title: "انجام پروژه", 
                description: "مجری پروژه را اجرا و تحویل می‌دهد",
                color: "from-warning-500 to-warning-600"
              },
              {
                step: "۴",
                title: "آزادسازی وجه",
                description: "پس از تایید، وجه به مجری پرداخت می‌شود",
                color: "from-success-500 to-success-600"
              }
            ].map((item, index) => (
              <div key={index} className="text-center group">
                <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${item.color} flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-zemano-500 to-zemano-600">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            آماده شروع هستید؟
          </h2>
          <p className="text-xl text-zemano-100 mb-8 max-w-2xl mx-auto">
            همین حالا ثبت نام کنید و اولین پروژه امانی خود را شروع کنید
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="bg-white text-zemano-600 hover:bg-zemano-50 text-lg px-8 py-6">
              <Link to="/register">
                ثبت نام رایگان
                <ArrowRight className="mr-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="border-white text-white hover:bg-white hover:text-zemano-600 text-lg px-8 py-6">
              <Link to="/contact">
                تماس با ما
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
