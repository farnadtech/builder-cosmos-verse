import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  Download,
  MessageSquare
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
  attachments: Array<{
    name: string;
    url: string;
    size: number;
  }>;
  contractTerms: string;
  status: string;
}

export default function AcceptProject() {
  console.log('🚀 AcceptProject component loading...');

  const params = useParams();
  const { inviteToken } = params;

  console.log('📋 URL params:', params);
  console.log('🔑 Extracted inviteToken:', inviteToken);

  // Early return if no token
  if (!inviteToken) {
    console.error('❌ No invite token found in URL');
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">خطا در لینک دعوت</h1>
          <p className="text-gray-600">لینک دعوت نامعتبر است</p>
        </div>
      </div>
    );
  }

  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState("");
  const [project, setProject] = useState<ProjectData | null>(null);

  useEffect(() => {
    console.log('AcceptProject loaded with token:', inviteToken);
    console.log('Current URL:', window.location.href);
    fetchProjectData();
  }, [inviteToken]);

  const fetchProjectData = async () => {
    if (!inviteToken) {
      console.error('No invite token provided');
      setError("لینک دعوت معتبر نیست");
      setLoading(false);
      return;
    }

    console.log('Fetching project data for token:', inviteToken);

    try {
      const url = `/api/projects/invite/${inviteToken}`;
      console.log('Fetching URL:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Remove authorization as this should be a public endpoint
        },
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Response data:', data);

        if (data.success && data.data && data.data.project) {
          setProject(data.data.project);
        } else if (data.project) {
          // Fallback for direct project data
          setProject(data.project);
        } else {
          console.error('Invalid response structure:', data);
          setError(`ساختار پاسخ سرور نامعتبر است. دریافت شده: ${JSON.stringify(data)}`);
        }
      } else {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        setError(errorData.message || "خطا در دریافت اطلاعات پروژه");
      }
    } catch (err) {
      console.error('Fetch error:', err);
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

    if (!user.isVerified) {
      navigate('/verification');
      return;
    }

    setAccepting(true);
    try {
      const response = await fetch(`/api/projects/accept/${inviteToken}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('zemano_token')}`,
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'waiting_for_acceptance':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">در انتظار پذیرش</Badge>;
      case 'active':
        return <Badge className="bg-green-100 text-green-800">فعال</Badge>;
      case 'completed':
        return <Badge className="bg-blue-100 text-blue-800">تکمیل شده</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zemano-600 mx-auto mb-4"></div>
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
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle>خطا در دریافت اطلاعات</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild>
              <a href="/">بازگشت به صفحه اصلی</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto max-w-4xl px-4">
        {/* Header */}
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

        {user && !user.isVerified && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              برای پذیرش این پروژه باید ابتدا احراز هویت خود را تکمیل کنید.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Project Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Project Overview */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl mb-2">{project.title}</CardTitle>
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
                  </div>
                  {getStatusBadge(project.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">توضیحات پروژه:</h4>
                    <p className="text-gray-700 leading-relaxed">{project.description}</p>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-zemano-50 rounded-lg">
                    <span className="font-medium">بودجه کل:</span>
                    <span className="text-2xl font-bold text-zemano-600">
                      {formatCurrency(project.budget)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Milestones */}
            {project.milestones && project.milestones.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>مراحل پروژه</CardTitle>
                  <CardDescription>پروژه به مراحل زیر تقسیم شده است</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {project.milestones.map((milestone, index) => (
                      <div key={milestone.id} className="border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium">مرحله {index + 1}: {milestone.title}</h4>
                          <span className="font-medium text-zemano-600">
                            {formatCurrency(milestone.amount)}
                          </span>
                        </div>
                        {milestone.description && (
                          <p className="text-gray-600 text-sm mb-2">{milestone.description}</p>
                        )}
                        {milestone.deadline && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            مهلت: {milestone.deadline}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Attachments */}
            {project.attachments && project.attachments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>فایل‌های ضمی��ه</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {project.attachments.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-500" />
                          <span className="text-sm">{file.name}</span>
                          <span className="text-xs text-gray-500">
                            ({(file.size / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        </div>
                        <Button variant="ghost" size="sm" asChild>
                          <a href={file.url} download>
                            <Download className="w-4 h-4" />
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Contract Terms */}
            <Card>
              <CardHeader>
                <CardTitle>قرارداد پیشنهادی</CardTitle>
                <CardDescription>شرایط و قوانین همکاری</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                    {project.contractTerms}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Employer Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  اطلاعات کارفرما
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="font-medium">{project.employer.firstName} {project.employer.lastName}</p>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>امتیاز:</span>
                    <span className="font-medium">{project.employer.rating}/۵</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>پروژه‌های تکمیل شده:</span>
                    <span className="font-medium">{project.employer.completedProjects}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <Card>
              <CardHeader>
                <CardTitle>عملیات</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!user ? (
                  <>
                    <Button asChild className="w-full bg-zemano-600 hover:bg-zemano-700">
                      <a href="/login">ورود به سیستم</a>
                    </Button>
                    <Button asChild variant="outline" className="w-full">
                      <a href="/register">ثبت‌نام</a>
                    </Button>
                  </>
                ) : !user.isVerified ? (
                  <Button asChild className="w-full bg-yellow-600 hover:bg-yellow-700">
                    <a href="/verification">تکمیل احراز هویت</a>
                  </Button>
                ) : project.status === 'waiting_for_acceptance' ? (
                  <>
                    <Button
                      onClick={acceptProject}
                      disabled={accepting}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      {accepting ? (
                        "در حال پذیرش..."
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 ml-2" />
                          پذیرش پروژه
                        </>
                      )}
                    </Button>
                    <Button variant="outline" className="w-full">
                      <MessageSquare className="w-4 h-4 ml-2" />
                      گفتگو با کارفرما
                    </Button>
                  </>
                ) : (
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">این پروژه دیگر قابل پذیرش نیست</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Important Notes */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">نکات مهم:</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>��� با پذیرش پروژه، قرارداد بین شما و کارفرما منعقد می‌شود</li>
                <li>• پرداخت‌ها طبق مراحل تعریف شده انجام می‌��ود</li>
                <li>• در صورت اختلاف، امکان مراجعه به داوری وجود دارد</li>
                <li>• رعایت مهلت‌های تعیین شده الزامی است</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
