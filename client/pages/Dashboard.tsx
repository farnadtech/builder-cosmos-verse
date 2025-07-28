import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase,
  Wallet,
  MessageSquare,
  Gavel,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Users,
  DollarSign,
  Plus,
  Settings,
  BarChart3
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

// Mock data - این باید از API دریافت شود
const mockData = {
  user: {
    name: "علی احمدی",
    role: "employer",
    isVerified: true,
    balance: 2500000
  },
  stats: {
    totalProjects: 12,
    activeProjects: 3,
    completedProjects: 8,
    totalSpent: 45000000,
    totalEarned: 0
  },
  recentProjects: [
    {
      id: 1,
      title: "طراحی وب‌سایت فروشگاهی",
      status: "in_progress",
      budget: 15000000,
      contractor: "محمد رضایی",
      deadline: "1403/08/15"
    },
    {
      id: 2,
      title: "توسعه اپلیکیشن موبایل",
      status: "completed",
      budget: 25000000,
      contractor: "زهرا محمدی",
      deadline: "1403/07/20"
    }
  ],
  notifications: [
    {
      id: 1,
      title: "پیام جدید در پروژه",
      message: "پیام جدیدی در پروژه طراحی وب‌سایت دریافت شد",
      type: "message",
      time: "۲ ساعت پیش"
    },
    {
      id: 2,
      title: "تکمیل مرحله",
      message: "مرحله اول پروژه اپلیکیشن تکمیل شد",
      type: "project",
      time: "۱ روز پیش"
    }
  ]
};

export default function Dashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  if (!user) {
    return <div>Loading...</div>;
  }

  // تابع برای تبدیل نقش به فارسی
  const getRoleName = (role: string) => {
    switch (role) {
      case 'employer': return 'کارفرما';
      case 'contractor': return 'مجری';
      case 'arbitrator': return 'داور';
      case 'admin': return 'مدیر';
      default: return role;
    }
  };

  // تابع برای تبدیل وضعیت پروژه به فارسی
  const getStatusName = (status: string) => {
    switch (status) {
      case 'open': return 'باز';
      case 'assigned': return 'تخصیص یافته';
      case 'in_progress': return 'در حال انجام';
      case 'completed': return 'تکمیل شد��';
      case 'cancelled': return 'لغو شده';
      case 'disputed': return 'در حال داوری';
      default: return status;
    }
  };

  // تابع برای تبدیل نوع اعلان به رنگ
  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'message': return 'bg-blue-100 text-blue-800';
      case 'project': return 'bg-green-100 text-green-800';
      case 'payment': return 'bg-yellow-100 text-yellow-800';
      case 'arbitration': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                خوش آمدید، {mockData.user.name}
              </h1>
              <div className="flex items-center gap-3">
                <Badge variant={mockData.user.isVerified ? "default" : "secondary"}>
                  {getRoleName(mockData.user.role)}
                </Badge>
                {mockData.user.isVerified && (
                  <Badge className="bg-green-100 text-green-800">
                    <CheckCircle className="w-3 h-3 ml-1" />
                    تایید شده
                  </Badge>
                )}
              </div>
            </div>
            <div className="mt-4 md:mt-0">
              {mockData.user.role === 'employer' && (
                <Button asChild className="bg-gradient-to-r from-zemano-500 to-zemano-600">
                  <Link to="/projects/create">
                    <Plus className="w-4 h-4 ml-2" />
                    پروژه جدید
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">کل پروژه‌ها</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockData.stats.totalProjects}</div>
              <p className="text-xs text-muted-foreground">
                +{mockData.stats.activeProjects} فعال
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">موجودی کیف پول</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {mockData.user.balance.toLocaleString('fa-IR')} ریال
              </div>
              <p className="text-xs text-muted-foreground">
                آماده برداشت
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {mockData.user.role === 'employer' ? 'کل پرداختی' : 'کل درآمد'}
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(mockData.user.role === 'employer' 
                  ? mockData.stats.totalSpent 
                  : mockData.stats.totalEarned
                ).toLocaleString('fa-IR')} ریال
              </div>
              <p className="text-xs text-muted-foreground">
                از ابتدای سال
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">تکمیل شده</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{mockData.stats.completedProjects}</div>
              <p className="text-xs text-muted-foreground">
                نرخ موفقیت ۹۵٪
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Projects */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>پروژه‌های اخیر</CardTitle>
                    <CardDescription>وضعیت پروژه‌های جاری شما</CardDescription>
                  </div>
                  <Button variant="outline" asChild>
                    <Link to="/projects">مشاهده همه</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockData.recentProjects.map((project) => (
                    <div key={project.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 mb-1">{project.title}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>مجری: {project.contractor}</span>
                          <span>بودجه: {project.budget.toLocaleString('fa-IR')} ریال</span>
                          <span>مهلت: {project.deadline}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant={project.status === 'completed' ? 'default' : 'secondary'}
                          className={project.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : ''}
                        >
                          {getStatusName(project.status)}
                        </Badge>
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/projects/${project.id}`}>
                            مشاهده
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>عملیات سریع</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link to="/wallet">
                      <Wallet className="w-4 h-4 ml-2" />
                      مدیریت کیف پول
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link to="/chat">
                      <MessageSquare className="w-4 h-4 ml-2" />
                      پیام‌ها
                    </Link>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <Link to="/contracts">
                      <FileText className="w-4 h-4 ml-2" />
                      قراردادها
                    </Link>
                  </Button>
                  {mockData.user.role === 'arbitrator' && (
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <Link to="/arbitration">
                        <Gavel className="w-4 h-4 ml-2" />
                        پرونده‌های داوری
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Notifications */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>اعلان‌های اخیر</CardTitle>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/notifications">همه</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockData.notifications.map((notification) => (
                    <div key={notification.id} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium text-sm">{notification.title}</h4>
                        <span className={`text-xs px-2 py-1 rounded-full ${getNotificationColor(notification.type)}`}>
                          {notification.type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                      <p className="text-xs text-gray-500">{notification.time}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
