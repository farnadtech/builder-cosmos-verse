import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle,
  AlertCircle,
  Calendar,
  DollarSign,
  User,
  FileText,
  Clock,
  Briefcase,
  Loader2
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ProjectData {
  id: number;
  title: string;
  description: string;
  category: string;
  budget: number;
  deadline: string;
  status: string;
  milestones: Array<{
    id: string;
    title: string;
    description: string;
    amount: number;
    deadline?: string;
  }>;
  employer: {
    firstName: string;
    lastName: string;
    rating: number;
    completedProjects: number;
  };
  contractTerms: string;
}

export default function AcceptProject() {
  const { inviteToken } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");
  const [project, setProject] = useState<ProjectData | null>(null);

  console.log('🚀 AcceptProject loaded with token:', inviteToken);

  useEffect(() => {
    if (inviteToken) {
      fetchProjectData();
    } else {
      setError("لینک دعوت نامعتبر است");
      setLoading(false);
    }
  }, [inviteToken]);

  const fetchProjectData = async () => {
    console.log('📡 Fetching project data...');

    try {
      const response = await fetch(`/api/projects/invite/${inviteToken}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('📡 Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('📡 Response data:', data);

        if (data.success && data.data && data.data.project) {
          setProject(data.data.project);
        } else {
          setError("خطا در دریافت اطلاعات پروژه");
        }
      } else {
        const errorData = await response.json();
        setError(errorData.message || "خطا در دریافت اطلاعات پروژه");
      }
    } catch (err) {
      console.error('📡 Fetch error:', err);
      setError("خطا در ارتباط با سرور");
    } finally {
      setLoading(false);
    }
  };

  const acceptProject = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    setAccepting(true);
    try {
      const token = localStorage.getItem('zemano_token');
      const response = await fetch(`/api/projects/accept/${inviteToken}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast.success("پروژه با موفقیت پذیرش شد");
        navigate(`/projects/${project?.id}`);
      } else {
        const errorData = await response.json();
        setError(errorData.message || "خطا در پذیرش پروژه");
      }
    } catch (err) {
      setError("خطا در پذیرش پروژه");
    } finally {
      setAccepting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fa-IR').format(amount) + ' ریال';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <CardTitle>خطا در دریافت اطلاعات</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={() => window.location.href = '/'}>
              بازگشت به صفحه اصلی
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto max-w-4xl px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">دعوت به همکاری</h1>
          <p className="text-gray-600">شما برای همکاری در پروژه زیر دعوت شده‌اید</p>
        </div>

        {!user && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              برای پذیرش این پروژه باید ابتدا وارد سیستم شوید یا ثبت‌نام کنید.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">{project.title}</CardTitle>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Briefcase className="w-4 h-4" />
                    {project.category}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    مهلت: {project.deadline}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">توضیحات پروژه:</h4>
                    <p className="text-gray-700 leading-relaxed">{project.description}</p>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                    <span className="font-medium">بودجه کل:</span>
                    <span className="text-2xl font-bold text-blue-600">
                      {formatCurrency(project.budget)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {project.milestones && project.milestones.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle>مراحل پروژه</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {project.milestones.map((milestone, index) => (
                      <div key={milestone.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium">مرحله {index + 1}: {milestone.title}</h4>
                          <span className="font-medium text-blue-600">
                            {formatCurrency(milestone.amount)}
                          </span>
                        </div>
                        {milestone.description && (
                          <p className="text-gray-600 text-sm">{milestone.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  اطلاعات کارفرما
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="font-medium">{project.employer.firstName} {project.employer.lastName}</p>
                  <div className="flex justify-between text-sm">
                    <span>امتیاز:</span>
                    <span className="font-medium">{project.employer.rating}/۵</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>پروژه‌های تکمیل شده:</span>
                    <span className="font-medium">{project.employer.completedProjects}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>عملیات</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!user ? (
                  <>
                    <Button asChild className="w-full">
                      <a href="/login">ورود به سیستم</a>
                    </Button>
                    <Button asChild variant="outline" className="w-full">
                      <a href="/register">ثبت‌نام</a>
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={acceptProject}
                    disabled={accepting}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {accepting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        در حال پذیرش...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        پذیرش پروژه
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
