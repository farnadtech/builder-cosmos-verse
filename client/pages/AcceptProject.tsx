import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, User, DollarSign, Clock, CheckCircle } from "lucide-react";

interface Project {
  id: number;
  title: string;
  description: string;
  budget: number;
  deadline: string;
  status: string;
  employer: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

export default function AcceptProject() {
  const { inviteToken } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  console.log("AcceptProject component loaded with token:", inviteToken);
  console.log("Current location:", window.location.href);

  useEffect(() => {
    const fetchInviteData = async () => {
      try {
        // Use production API endpoint
        const API_BASE_URL = window.location.hostname.includes('bc26f25ef94748d9abb2f5dcb4730530')
          ? window.location.origin
          : '';

        console.log("API_BASE_URL:", API_BASE_URL);
        console.log("Full API URL:", `${API_BASE_URL}/api/projects/invite/${inviteToken}`);

        const response = await fetch(`${API_BASE_URL}/api/projects/invite/${inviteToken}`);
        console.log("Response status:", response.status);

        const data = await response.json();
        console.log("Response data:", data);

        if (data.success) {
          console.log("Project data received:", data.data.project);
          setProject(data.data.project);
        } else {
          console.log("API error:", data.message);
          setError(data.message || "دعوت‌نامه معتبر نیست");
        }
      } catch (err) {
        console.error("Fetch error:", err);
        setError("خطا در بارگذاری اطلاعات دعوت");
      } finally {
        setLoading(false);
      }
    };

    if (inviteToken) {
      console.log("Starting fetch for invite token:", inviteToken);
      fetchInviteData();
    } else {
      console.log("No invite token found");
      setError("توکن دعوت معتبر نیست");
      setLoading(false);
    }
  }, [inviteToken]);

  const handleAcceptInvite = async () => {
    setAccepting(true);
    try {
      // Use production API endpoint
      const API_BASE_URL = window.location.hostname.includes('bc26f25ef94748d9abb2f5dcb4730530')
        ? window.location.origin
        : '/api';

      const response = await fetch(`${API_BASE_URL}/api/projects/accept/${inviteToken}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (data.success) {
        navigate("/login", {
          state: {
            message: "دعوت با موفقیت پذیرفته شد. لطفاً وارد شوید.",
            redirectTo: `/projects/${project?.id}`,
          },
        });
      } else {
        setError(data.message || "خطا در پذیرش دعوت");
      }
    } catch (err) {
      setError("خطا در پذیرش دعوت");
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-zemano-600 mx-auto mb-4"></div>
          <p className="text-gray-600">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">خطا</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              className="w-full mt-4"
            >
              بازگشت به صفحه اصلی
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>پروژه‌ای یافت نشد</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            دعوت برای همکاری در پروژه
          </h1>
          <p className="text-gray-600">
            شما برای همکاری در پروژه زیر دعوت شده‌اید
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">{project.title}</CardTitle>
              <Badge variant="secondary">{project.status}</Badge>
            </div>
            <CardDescription className="text-right">
              {project.description}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Project Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-zemano-600" />
                <div>
                  <p className="text-sm font-medium">بودجه</p>
                  <p className="text-lg font-semibold">
                    {project.budget.toLocaleString()} تومان
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <CalendarDays className="h-5 w-5 text-zemano-600" />
                <div>
                  <p className="text-sm font-medium">مهلت تحویل</p>
                  <p className="text-lg font-semibold">
                    {new Date(project.deadline).toLocaleDateString("fa-IR")}
                  </p>
                </div>
              </div>
            </div>

            {/* Employer Info */}
            <div className="border-t pt-4">
              <div className="flex items-center gap-3 mb-3">
                <User className="h-5 w-5 text-zemano-600" />
                <h3 className="font-medium">کارفرما</h3>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-medium">
                  {project.employer.firstName} {project.employer.lastName}
                </p>
                <p className="text-gray-600">{project.employer.email}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 pt-6">
              <Button
                onClick={handleAcceptInvite}
                disabled={accepting}
                className="flex-1 bg-zemano-600 hover:bg-zemano-700"
              >
                {accepting ? (
                  <>
                    <Clock className="h-4 w-4 ml-2 animate-spin" />
                    در حال پردازش...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 ml-2" />
                    پذیرش دعوت
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={() => navigate("/")}
                className="flex-1"
              >
                انصراف
              </Button>
            </div>

            <Alert>
              <AlertDescription>
                با پذیرش این دعوت، شما متعهد می‌شوید که پروژه را طبق شرایط مشخص شده انجام دهید.
                در صورت عدم وجود حساب کاربری، پس از پذیرش دعوت به صفحه ثبت نام هدایت خواهید شد.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
