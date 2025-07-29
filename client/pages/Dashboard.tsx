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
  BarChart3,
  Inbox
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { toast } from "sonner";

interface UserStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  balance: number;
  totalSpent?: number;
  totalEarned?: number;
  totalUsers?: number;
  totalTransactions?: number;
  platformRevenue?: number;
}

interface Project {
  id: number;
  title: string;
  status: string;
  budget: number;
  contractor?: string;
  employer?: string;
  deadline?: string;
  created_at: string;
}

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UserStats>({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    balance: 0
  });
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('zemano_token');
      
      // Fetch user statistics
      const statsResponse = await fetch('/api/dashboard/stats', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Fetch recent projects
      const projectsResponse = await fetch('/api/dashboard/recent-projects', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Fetch notifications
      const notificationsResponse = await fetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.data || {
          totalProjects: 0,
          activeProjects: 0,
          completedProjects: 0,
          balance: 0
        });
      }

      if (projectsResponse.ok) {
        const projectsData = await projectsResponse.json();
        setRecentProjects(projectsData.data || []);
      }

      if (notificationsResponse.ok) {
        const notificationsData = await notificationsResponse.json();
        setNotifications(notificationsData.data || []);
      }

    } catch (error) {
      console.error('خطا در دریافت اطلاعات داشبورد:', error);
      // Don't show error to user, just keep default empty state
    } finally {
      setLoading(false);
    }
  };

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

  // تابع برای تبدیل وضعیت پروژه ب�� فارسی
  const getStatusName = (status: string) => {
    switch (status) {
      case 'open': return 'باز';
      case 'assigned': return 'تخصیص یافته';
      case 'in_progress': return 'در حال انجام';
      case 'completed': return 'تکمیل شده';
      case 'cancelled': return 'لغو شده';
      case 'disputed': return 'در حال داوری';
      default: return status;
    }
  };

  // تابع برای تبدیل وضعیت به رنگ
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'assigned': return 'bg-purple-100 text-purple-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'disputed': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
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

  // تابع برای فرمت کردن قیمت
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fa-IR').format(price);
  };

  // تابع برای فرمت کردن تاریخ
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fa-IR');
  };

  // Empty state component
  const EmptyState = ({ icon: Icon, title, description, actionText, actionLink }: {
    icon: any;
    title: string;
    description: string;
    actionText: string;
    actionLink: string;
  }) => (
    <div className="text-center py-12">
      <Icon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 mb-6">{description}</p>
      <Button asChild>
        <Link to={actionLink}>
          <Plus className="h-4 w-4 mr-2" />
          {actionText}
        </Link>
      </Button>
    </div>
  );

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  خوش آمدید، {user.firstName} {user.lastName}
                </h1>
                <div className="flex items-center gap-3">
                  <Badge variant={user.isVerified ? "default" : "secondary"}>
                    {getRoleName(user.role)}
                  </Badge>
                  {!user.isVerified && (
                    <Badge variant="outline" className="text-orange-600 border-orange-600">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      احراز هویت ناتمام
                    </Badge>
                  )}
                </div>
              </div>
              <div className="mt-4 md:mt-0">
                <Button asChild variant="outline">
                  <Link to="/verification">
                    <Settings className="h-4 w-4 mr-2" />
                    تنظیمات حساب
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">
                          {user.role === 'employer' ? 'کل پروژه‌ها' : user.role === 'contractor' ? 'پروژه‌های من' : 'کل پروژه‌ها'}
                        </p>
                        <p className="text-2xl font-bold">{stats.totalProjects}</p>
                      </div>
                      <Briefcase className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">پروژه‌های فعال</p>
                        <p className="text-2xl font-bold">{stats.activeProjects}</p>
                      </div>
                      <Clock className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">پروژه‌های تکمیل شده</p>
                        <p className="text-2xl font-bold">{stats.completedProjects}</p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">موجودی کیف پول</p>
                        <p className="text-2xl font-bold">{formatPrice(stats.balance)} ریال</p>
                      </div>
                      <Wallet className="h-8 w-8 text-muted-foreground" />
                    </div>
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
                        <CardTitle>پروژه‌های اخیر</CardTitle>
                        <Button asChild variant="outline" size="sm">
                          <Link to="/projects">
                            مشاهده همه
                          </Link>
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {recentProjects.length === 0 ? (
                        <EmptyState
                          icon={Briefcase}
                          title="هنوز ��روژه‌ای ندارید"
                          description={
                            user.role === 'employer' 
                              ? "اولین پروژه خود را ایجاد کنید و با بهترین مجریان کار کنید"
                              : "در پروژه‌های موجود شرکت کنید و درآمد کسب کنید"
                          }
                          actionText={user.role === 'employer' ? "ایجاد پروژه" : "مشاهده پروژه‌ها"}
                          actionLink={user.role === 'employer' ? "/projects/create" : "/projects"}
                        />
                      ) : (
                        <div className="space-y-4">
                          {recentProjects.slice(0, 5).map((project) => (
                            <div key={project.id} className="flex items-center justify-between p-4 border rounded-lg">
                              <div className="flex-1">
                                <h4 className="font-medium">{project.title}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge className={getStatusColor(project.status)}>
                                    {getStatusName(project.status)}
                                  </Badge>
                                  {project.deadline && (
                                    <span className="text-sm text-muted-foreground">
                                      موعد: {formatDate(project.deadline)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-left">
                                <p className="font-medium">{formatPrice(project.budget)} ریال</p>
                                {project.contractor && (
                                  <p className="text-sm text-muted-foreground">مجری: {project.contractor}</p>
                                )}
                                {project.employer && (
                                  <p className="text-sm text-muted-foreground">کارفرما: {project.employer}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Notifications */}
                <div>
                  <Card>
                    <CardHeader>
                      <CardTitle>اعلان‌ها</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {notifications.length === 0 ? (
                        <div className="text-center py-8">
                          <Inbox className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                          <p className="text-gray-500">اعلانی وجود ندارد</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {(notifications || []).slice(0, 5).map((notification) => (
                            <div
                              key={notification.id}
                              className={`p-3 rounded-lg border ${
                                !notification.is_read ? 'bg-blue-50 border-blue-200' : 'bg-gray-50'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h5 className="font-medium text-sm">{notification.title}</h5>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {notification.message}
                                  </p>
                                </div>
                                <Badge className={getNotificationColor(notification.type)} size="sm">
                                  {notification.type}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground mt-2">
                                {formatDate(notification.created_at)}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="mt-8">
                <Card>
                  <CardHeader>
                    <CardTitle>عملیات سریع</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {user.role === 'employer' && (
                        <Button asChild className="h-auto p-4">
                          <Link to="/projects/create" className="flex flex-col items-center gap-2">
                            <Plus className="h-6 w-6" />
                            <span>ایجاد پروژه جدید</span>
                          </Link>
                        </Button>
                      )}
                      
                      <Button asChild variant="outline" className="h-auto p-4">
                        <Link to="/projects" className="flex flex-col items-center gap-2">
                          <Briefcase className="h-6 w-6" />
                          <span>مشاهده پروژه‌ها</span>
                        </Link>
                      </Button>

                      <Button asChild variant="outline" className="h-auto p-4">
                        <Link to="/wallet" className="flex flex-col items-center gap-2">
                          <Wallet className="h-6 w-6" />
                          <span>کیف پول</span>
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
