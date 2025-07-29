import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft,
  Calendar, 
  DollarSign, 
  User,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

interface Project {
  id: number;
  title: string;
  description: string;
  category: string;
  budget: number;
  deadline: string;
  status: string;
  created_at: string;
  employer_first_name?: string;
  employer_last_name?: string;
  contractor_first_name?: string;
  contractor_last_name?: string;
  milestones: Milestone[];
}

interface Milestone {
  id: number;
  title: string;
  description: string;
  amount: number;
  deadline?: string;
  status: string;
  order_index: number;
}

const statusColors = {
  'open': 'bg-green-100 text-green-800',
  'assigned': 'bg-blue-100 text-blue-800',
  'active': 'bg-purple-100 text-purple-800',
  'in_progress': 'bg-yellow-100 text-yellow-800',
  'completed': 'bg-gray-100 text-gray-800',
  'cancelled': 'bg-red-100 text-red-800',
  'disputed': 'bg-orange-100 text-orange-800',
  'waiting_for_acceptance': 'bg-cyan-100 text-cyan-800'
};

const statusLabels = {
  'open': 'باز',
  'assigned': 'تخصیص داده شده',
  'active': 'فعال',
  'in_progress': 'در حال انجام',
  'completed': 'تکمیل شده',
  'cancelled': 'لغو شده',
  'disputed': 'مورد اختلاف',
  'waiting_for_acceptance': 'در انتظار پذیرش'
};

const milestoneStatusColors = {
  'pending': 'bg-gray-100 text-gray-800',
  'in_progress': 'bg-yellow-100 text-yellow-800',
  'completed': 'bg-green-100 text-green-800',
  'rejected': 'bg-red-100 text-red-800'
};

const milestoneStatusLabels = {
  'pending': 'در انتظار',
  'in_progress': 'در حال انجام',
  'completed': 'تکمیل شده',
  'rejected': 'رد شده'
};

export default function ProjectDetails() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (id) {
      fetchProject();
    }
  }, [id]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('zemano_token');
      
      const response = await fetch(`/api/projects/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProject(data.data.project);
      } else {
        setError('خطا در دریافت اطلاعات پروژه');
      }
    } catch (error) {
      console.error('Error fetching project:', error);
      setError('خطا در دریافت اطلاعات پروژه');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('fa-IR').format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fa-IR');
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-zemano-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">در حال بارگذاری...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !project) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="text-center">
              <AlertCircle className="h-32 w-32 text-red-500 mx-auto" />
              <h2 className="mt-4 text-2xl font-bold text-gray-900">پروژه یافت نشد</h2>
              <p className="mt-2 text-gray-600">{error || 'پروژه مورد نظر یافت نشد'}</p>
              <Link to="/projects">
                <Button className="mt-4">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  بازگشت به لیست پروژه‌ها
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const employerName = project.employer_first_name && project.employer_last_name
    ? `${project.employer_first_name} ${project.employer_last_name}`
    : 'نامشخص';

  const contractorName = project.contractor_first_name && project.contractor_last_name
    ? `${project.contractor_first_name} ${project.contractor_last_name}`
    : null;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Header */}
          <div className="mb-8">
            <Link to="/projects">
              <Button variant="outline" className="mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                بازگشت به لیست پروژه‌ها
              </Button>
            </Link>
            
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{project.title}</h1>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1" />
                    {formatDate(project.created_at)}
                  </span>
                  <Badge className={statusColors[project.status]}>
                    {statusLabels[project.status]}
                  </Badge>
                </div>
              </div>
              
              <div className="mt-4 md:mt-0">
                <div className="text-2xl font-bold text-zemano-600">
                  {formatPrice(project.budget)} ریال
                </div>
                <div className="text-sm text-gray-600">بودجه کل</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Project Description */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    توضیحات پروژه
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {project.description}
                  </p>
                </CardContent>
              </Card>

              {/* Milestones */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2" />
                    مراحل پروژه ({project.milestones.length} مرحله)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {project.milestones
                      .sort((a, b) => a.order_index - b.order_index)
                      .map((milestone, index) => (
                        <div key={milestone.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center">
                              <span className="bg-zemano-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3">
                                {index + 1}
                              </span>
                              <h3 className="font-semibold">{milestone.title}</h3>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className={milestoneStatusColors[milestone.status]}>
                                {milestoneStatusLabels[milestone.status]}
                              </Badge>
                              <span className="font-semibold text-zemano-600">
                                {formatPrice(milestone.amount)} ریال
                              </span>
                            </div>
                          </div>
                          
                          {milestone.description && (
                            <p className="text-gray-600 mr-9 mb-2">{milestone.description}</p>
                          )}
                          
                          {milestone.deadline && (
                            <div className="flex items-center text-sm text-gray-500 mr-9">
                              <Clock className="w-4 h-4 mr-1" />
                              مهلت: {formatDate(milestone.deadline)}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div>
              {/* Project Info */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>اطلاعات پروژه</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-600">دسته‌بندی</div>
                    <div className="font-semibold">{project.category}</div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <div className="text-sm text-gray-600">مهلت پایان</div>
                    <div className="font-semibold">{formatDate(project.deadline)}</div>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <div className="text-sm text-gray-600 flex items-center">
                      <User className="w-4 h-4 mr-1" />
                      کارفرما
                    </div>
                    <div className="font-semibold">{employerName}</div>
                  </div>
                  
                  {contractorName && (
                    <>
                      <Separator />
                      <div>
                        <div className="text-sm text-gray-600 flex items-center">
                          <User className="w-4 h-4 mr-1" />
                          مجری
                        </div>
                        <div className="font-semibold">{contractorName}</div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Actions */}
              {user?.role === 'employer' && (
                <Card>
                  <CardHeader>
                    <CardTitle>عملیات</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {project.status === 'open' && (
                      <Link to={`/projects/${project.id}/invite`}>
                        <Button className="w-full">
                          دعوت مجری
                        </Button>
                      </Link>
                    )}
                    
                    <Button variant="outline" className="w-full">
                      ویرایش پروژه
                    </Button>
                  </CardContent>
                </Card>
              )}
              
              {user?.role === 'contractor' && project.status === 'open' && (
                <Card>
                  <CardHeader>
                    <CardTitle>درخواست همکاری</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button className="w-full">
                      ارسال درخواست
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
