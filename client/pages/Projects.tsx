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
  Clock
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

// Mock data - این باید از API دریافت شود
const mockProjects = [
  {
    id: 1,
    title: "طراحی وب‌سایت فروشگاهی مدرن",
    description: "طراحی و توسعه یک وب‌سایت فروشگاهی کامل با پنل مدیریت و درگاه پرداخت",
    budget: 15000000,
    status: "open",
    category: "طراحی وب",
    deadline: "1403/10/15",
    employerName: "احمد محمدی",
    contractorName: null,
    applicantsCount: 12,
    createdAt: "1403/08/01"
  },
  {
    id: 2,
    title: "اپلیکیشن موبایل سفارش غذا",
    description: "توسعه اپلیکیشن موبایل برای سفارش آنلاین غذا با قابلیت ردیابی",
    budget: 25000000,
    status: "in_progress",
    category: "توسعه موبایل",
    deadline: "1403/11/30",
    employerName: "فاطمه احمدی",
    contractorName: "علی رضایی",
    applicantsCount: 0,
    createdAt: "1403/07/15"
  },
  {
    id: 3,
    title: "طراحی لوگو و هویت بصری",
    description: "طراحی لوگو و هویت بصری کامل برای شرکت تکنولوژی",
    budget: 8000000,
    status: "completed",
    category: "طراحی گرافیک",
    deadline: "1403/09/01",
    employerName: "محمد کریمی",
    contractorName: "زهرا حسینی",
    applicantsCount: 0,
    createdAt: "1403/06/10"
  },
  {
    id: 4,
    title: "ترجمه متون تخصصی پزشکی",
    description: "ترجمه کتاب تخصصی پزشکی از انگلیسی به فارسی",
    budget: 12000000,
    status: "disputed",
    category: "ترجمه",
    deadline: "1403/09/20",
    employerName: "دکتر احمد نژاد",
    contractorName: "مریم فراهانی",
    applicantsCount: 0,
    createdAt: "1403/07/01"
  }
];

export default function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState(mockProjects);
  const [filteredProjects, setFilteredProjects] = useState(mockProjects);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Filter projects based on search and filters
  useEffect(() => {
    let filtered = projects;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(project =>
        project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(project => project.status === statusFilter);
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter(project => project.category === categoryFilter);
    }

    setFilteredProjects(filtered);
  }, [searchTerm, statusFilter, categoryFilter, projects]);

  const getStatusBadge = (status: string) => {
    const statusMap = {
      open: { label: "باز", className: "bg-green-100 text-green-800" },
      assigned: { label: "تخصیص یافته", className: "bg-blue-100 text-blue-800" },
      in_progress: { label: "در حال انجام", className: "bg-yellow-100 text-yellow-800" },
      completed: { label: "تکمیل شده", className: "bg-emerald-100 text-emerald-800" },
      cancelled: { label: "لغو شده", className: "bg-gray-100 text-gray-800" },
      disputed: { label: "در حال داوری", className: "bg-red-100 text-red-800" }
    };

    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.open;
    
    return (
      <Badge className={statusInfo.className}>
        {statusInfo.label}
      </Badge>
    );
  };

  const categories = [
    "طراحی وب",
    "توسعه موبایل", 
    "طراحی گراف��ک",
    "ترجمه",
    "تولید محتوا",
    "بازاریابی دیجیتال",
    "مشاوره کسب‌وکار"
  ];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">پروژه‌ها</h1>
                <p className="text-gray-600">
                  {user?.role === 'employer' ? 'پروژه‌های خود را مدیریت کنید' : 'پروژه‌های مناسب را پیدا کنید'}
                </p>
              </div>
              {user?.role === 'employer' && (
                <div className="mt-4 md:mt-0">
                  <Button asChild className="bg-gradient-to-r from-zemano-500 to-zemano-600">
                    <Link to="/projects/create">
                      <Plus className="w-4 h-4 ml-2" />
                      پروژه جدید
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="جستجو در پروژه‌ها..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10"
                  />
                </div>

                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="وضعیت" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">همه وضعیت‌ها</SelectItem>
                    <SelectItem value="open">باز</SelectItem>
                    <SelectItem value="assigned">تخصیص یافته</SelectItem>
                    <SelectItem value="in_progress">در حال انجام</SelectItem>
                    <SelectItem value="completed">تکمیل شده</SelectItem>
                    <SelectItem value="disputed">در حال داوری</SelectItem>
                  </SelectContent>
                </Select>

                {/* Category Filter */}
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="دسته‌بندی" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">همه دسته‌ها</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Clear Filters */}
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                    setCategoryFilter("all");
                  }}
                  className="w-full"
                >
                  <Filter className="w-4 h-4 ml-2" />
                  پاک کردن فیلترها
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Projects Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <Card key={project.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-2 mb-2">
                        {project.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-3">
                        {project.description}
                      </CardDescription>
                    </div>
                    {getStatusBadge(project.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Project Details */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-gray-500" />
                        <span>{project.budget.toLocaleString('fa-IR')} ریال</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span>{project.deadline}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-gray-500" />
                        <span>{project.category}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span>{project.employerName}</span>
                      </div>
                    </div>

                    {/* Additional Info */}
                    {project.status === 'open' && project.applicantsCount > 0 && (
                      <div className="text-sm text-gray-600">
                        {project.applicantsCount} نفر درخواست داده‌اند
                      </div>
                    )}

                    {project.contractorName && (
                      <div className="text-sm text-green-600">
                        مجری: {project.contractorName}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" asChild className="flex-1">
                        <Link to={`/projects/${project.id}`}>
                          <Eye className="w-4 h-4 ml-2" />
                          مشاهده
                        </Link>
                      </Button>
                      
                      {user?.role === 'contractor' && project.status === 'open' && (
                        <Button size="sm" className="flex-1 bg-zemano-600 hover:bg-zemano-700">
                          درخواست انجام
                        </Button>
                      )}

                      {((user?.role === 'employer' && project.employerName === `${user.firstName} ${user.lastName}`) ||
                        (user?.role === 'contractor' && project.contractorName === `${user.firstName} ${user.lastName}`)) &&
                        project.status === 'in_progress' && (
                        <Button variant="outline" size="sm">
                          <MessageSquare className="w-4 h-4 ml-2" />
                          چت
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Empty State */}
          {filteredProjects.length === 0 && (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">پروژه‌ای یافت نشد</h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || statusFilter !== "all" || categoryFilter !== "all"
                  ? "با فیلترهای انتخاب شده پروژه‌ای وجود ندارد"
                  : "هنوز پروژه‌ای ثبت نشده است"
                }
              </p>
              {user?.role === 'employer' && (
                <Button asChild className="bg-gradient-to-r from-zemano-500 to-zemano-600">
                  <Link to="/projects/create">
                    <Plus className="w-4 h-4 ml-2" />
                    اولین پروژه را ایجاد کنید
                  </Link>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
