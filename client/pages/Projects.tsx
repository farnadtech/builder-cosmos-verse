import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Filter, 
  Plus, 
  Briefcase, 
  Calendar, 
  DollarSign, 
  User,
  Eye,
  MessageSquare,
  Clock,
  FileText
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

interface Project {
  id: number;
  title: string;
  description: string;
  budget: number;
  status: string;
  category?: string;
  deadline?: string;
  employer_name?: string;
  contractor_name?: string;
  applicants_count?: number;
  created_at: string;
}

export default function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('zemano_token');
      
      const response = await fetch('/api/projects', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProjects(data.data || []);
      } else {
        console.error('خطا در دریافت پروژه‌ها');
      }
    } catch (error) {
      console.error('خطا در دریافت پروژه‌ها:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter projects based on search and filters
  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || project.status === statusFilter;
    const matchesCategory = categoryFilter === "all" || project.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  // تابع برای تبدیل وضعیت پروژه به فارسی
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

  // تابع برای رنگ وضعیت
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

  // تابع برای فرمت کردن قیمت
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fa-IR').format(price);
  };

  // تابع برای فرمت کردن تاریخ
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('fa-IR');
  };

  // Empty state component
  const EmptyState = () => (
    <div className="text-center py-16">
      <Briefcase className="h-16 w-16 text-gray-400 mx-auto mb-6" />
      <h3 className="text-xl font-medium text-gray-900 mb-4">
        {user?.role === 'employer' ? 'هنوز پروژه‌ای ایجاد نکرده‌اید' : 'پروژه‌ای موجود نیست'}
      </h3>
      <p className="text-gray-500 mb-8 max-w-md mx-auto">
        {user?.role === 'employer' 
          ? 'اولین پروژه خود را ایجاد کنید و با بهترین مجریان کار کنید'
          : 'هنوز پروژه‌ای برای شرکت در آن موجود نیست'
        }
      </p>
      {user?.role === 'employer' && (
        <Button asChild>
          <Link to="/projects/create">
            <Plus className="h-4 w-4 mr-2" />
            ایجاد پروژه جدید
          </Link>
        </Button>
      )}
    </div>
  );

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {user.role === 'employer' ? 'پروژه‌های من' : 'پروژه‌ها'}
                </h1>
                <p className="text-gray-600">
                  {user.role === 'employer' 
                    ? 'مدیریت و نظارت بر پروژه‌های شما'
                    : 'مشاهده و شرکت در پروژه‌های موجود'
                  }
                </p>
              </div>
              {user.role === 'employer' && (
                <div className="mt-4 md:mt-0">
                  <Button asChild>
                    <Link to="/projects/create">
                      <Plus className="h-4 w-4 mr-2" />
                      ایجاد پروژه جدید
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Search */}
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="جستجو در پروژه‌ها..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pr-10"
                      />
                    </div>
                  </div>
                  
                  {/* Status Filter */}
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="وضعیت" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                      <SelectItem value="open">باز</SelectItem>
                      <SelectItem value="assigned">تخصیص یافته</SelectItem>
                      <SelectItem value="in_progress">در حال انجام</SelectItem>
                      <SelectItem value="completed">تکمیل شده</SelectItem>
                      <SelectItem value="cancelled">لغو شده</SelectItem>
                      <SelectItem value="disputed">در حال داوری</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Category Filter */}
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-full md:w-48">
                      <SelectValue placeholder="دسته‌بندی" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">همه دسته‌ها</SelectItem>
                      <SelectItem value="طراحی وب">طراحی وب</SelectItem>
                      <SelectItem value="توسعه موبایل">توسعه موبایل</SelectItem>
                      <SelectItem value="طراحی گرافیک">طراحی گرافیک</SelectItem>
                      <SelectItem value="تولید محتوا">تولید محتوا</SelectItem>
                      <SelectItem value="ترجمه">ترجمه</SelectItem>
                      <SelectItem value="سایر">سایر</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Projects List */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 rounded"></div>
                      <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                      <div className="h-8 bg-gray-200 rounded w-1/3 mt-4"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProjects.map((project) => (
                <Card key={project.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg line-clamp-2">{project.title}</CardTitle>
                        <CardDescription className="mt-2 line-clamp-2">
                          {project.description}
                        </CardDescription>
                      </div>
                      <Badge className={getStatusColor(project.status)}>
                        {getStatusName(project.status)}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-4">
                      {/* Budget */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">بودجه:</span>
                        <span className="font-semibold text-zemano-600">
                          {formatPrice(project.budget)} ریال
                        </span>
                      </div>

                      {/* Category */}
                      {project.category && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">دسته‌بندی:</span>
                          <span className="text-sm">{project.category}</span>
                        </div>
                      )}

                      {/* Deadline */}
                      {project.deadline && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">موعد تحویل:</span>
                          <span className="text-sm flex items-center">
                            <Calendar className="h-3 w-3 ml-1" />
                            {formatDate(project.deadline)}
                          </span>
                        </div>
                      )}

                      {/* Employer/Contractor */}
                      {project.employer_name && user.role !== 'employer' && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">کارفرما:</span>
                          <span className="text-sm">{project.employer_name}</span>
                        </div>
                      )}
                      
                      {project.contractor_name && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">مجری:</span>
                          <span className="text-sm">{project.contractor_name}</span>
                        </div>
                      )}

                      {/* Applicants count for open projects */}
                      {project.status === 'open' && project.applicants_count !== undefined && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">متقاضیان:</span>
                          <span className="text-sm">{project.applicants_count} نفر</span>
                        </div>
                      )}

                      {/* Created date */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500">ایجاد شده:</span>
                        <span className="text-sm">{formatDate(project.created_at)}</span>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-4 border-t">
                        <Button asChild variant="outline" size="sm" className="flex-1">
                          <Link to={`/projects/${project.id}`}>
                            <Eye className="h-3 w-3 ml-1" />
                            مشاهده
                          </Link>
                        </Button>
                        
                        {user.role === 'contractor' && project.status === 'open' && (
                          <Button asChild size="sm" className="flex-1">
                            <Link to={`/projects/${project.id}/apply`}>
                              <FileText className="h-3 w-3 ml-1" />
                              درخواست
                            </Link>
                          </Button>
                        )}
                        
                        {(project.status === 'in_progress' || project.status === 'assigned') && (
                          <Button asChild variant="outline" size="sm">
                            <Link to={`/projects/${project.id}/chat`}>
                              <MessageSquare className="h-3 w-3" />
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination would go here if needed */}
        </div>
      </div>
    </ProtectedRoute>
  );
}
