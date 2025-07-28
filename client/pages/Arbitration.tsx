import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  Filter, 
  Gavel, 
  Calendar, 
  DollarSign, 
  User,
  Eye,
  FileText,
  Clock,
  AlertCircle,
  CheckCircle,
  Scale
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

// Mock data - این باید از API دریافت شود
const mockArbitrations = [
  {
    id: 1,
    projectTitle: "طراحی وب‌سایت فروشگاهی",
    projectBudget: 15000000,
    status: "pending",
    initiatorName: "احمد محمدی",
    initiatorRole: "employer",
    respondentName: "علی رضایی",
    reason: "کیفیت کار تحویلی مطابق انتظارات نیست و مجری از تعهدات خود سرپیچی می‌کند",
    arbitratorName: null,
    createdAt: "1403/09/15",
    deadline: "1403/10/01"
  },
  {
    id: 2,
    projectTitle: "اپلیکیشن موبایل سفارش غذا",
    projectBudget: 25000000,
    status: "assigned",
    initiatorName: "فاطمه احمدی",
    initiatorRole: "employer",
    respondentName: "محمد حسینی",
    reason: "عدم تحویل پروژه در مهلت مقرر و عدم پاسخگویی مناسب",
    arbitratorName: "دکتر رضا نوری",
    createdAt: "1403/09/10",
    deadline: "1403/09/25"
  },
  {
    id: 3,
    projectTitle: "ترجمه متون تخصصی",
    projectBudget: 8000000,
    status: "resolved",
    initiatorName: "زهرا کریمی",
    initiatorRole: "contractor",
    respondentName: "مهندس صاد��ی",
    reason: "عدم پرداخت مرحله نهایی پروژه علی‌رغم تحویل کامل",
    arbitratorName: "دکتر مریم احمدی",
    createdAt: "1403/08/20",
    deadline: "1403/09/05",
    resolution: "بر اساس مدارک ارائه شده، مجری متعهد به تحویل کامل کار بوده و کارفرما موظف به پرداخت مرحله نهایی است.",
    decision: "contractor"
  }
];

export default function ArbitrationPage() {
  const { user } = useAuth();
  const [arbitrations, setArbitrations] = useState(mockArbitrations);
  const [filteredArbitrations, setFilteredArbitrations] = useState(mockArbitrations);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("all");

  // Filter arbitrations based on search and filters
  useEffect(() => {
    let filtered = arbitrations;

    // Tab filter
    if (activeTab === "my-cases") {
      filtered = filtered.filter(arb => 
        arb.initiatorName === `${user?.firstName} ${user?.lastName}` ||
        arb.respondentName === `${user?.firstName} ${user?.lastName}` ||
        (user?.role === 'arbitrator' && arb.arbitratorName === `${user?.firstName} ${user?.lastName}`)
      );
    } else if (activeTab === "my-arbitrations" && user?.role === 'arbitrator') {
      filtered = filtered.filter(arb => arb.arbitratorName === `${user?.firstName} ${user?.lastName}`);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(arb =>
        arb.projectTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        arb.reason.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(arb => arb.status === statusFilter);
    }

    setFilteredArbitrations(filtered);
  }, [searchTerm, statusFilter, arbitrations, activeTab, user]);

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { label: "در انتظار تخصیص", className: "bg-yellow-100 text-yellow-800", icon: Clock },
      assigned: { label: "در حال بررسی", className: "bg-blue-100 text-blue-800", icon: Scale },
      resolved: { label: "حل شده", className: "bg-green-100 text-green-800", icon: CheckCircle }
    };

    const statusInfo = statusMap[status as keyof typeof statusMap] || statusMap.pending;
    const Icon = statusInfo.icon;
    
    return (
      <Badge className={statusInfo.className}>
        <Icon className="w-3 h-3 ml-1" />
        {statusInfo.label}
      </Badge>
    );
  };

  const getDecisionBadge = (decision: string) => {
    const decisionMap = {
      employer: { label: "به نفع کارفرما", className: "bg-blue-100 text-blue-800" },
      contractor: { label: "به نفع مجری", className: "bg-green-100 text-green-800" },
      split: { label: "تقسیم مبلغ", className: "bg-purple-100 text-purple-800" }
    };

    const decisionInfo = decisionMap[decision as keyof typeof decisionMap];
    
    return decisionInfo ? (
      <Badge className={decisionInfo.className}>
        {decisionInfo.label}
      </Badge>
    ) : null;
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">سیستم داوری</h1>
            <p className="text-gray-600">
              {user?.role === 'arbitrator' 
                ? 'پرونده‌های داوری خود را مدیریت کنید'
                : 'اختلافات پروژه‌ها را از طریق داوری حل کنید'
              }
            </p>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">همه پرونده‌ها</TabsTrigger>
              <TabsTrigger value="my-cases">پرونده‌های من</TabsTrigger>
              {user?.role === 'arbitrator' && (
                <TabsTrigger value="my-arbitrations">داوری‌های من</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              {/* Filters */}
              <Card className="mb-6">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Search */}
                    <div className="relative">
                      <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="جستجو در پرونده‌ها..."
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
                        <SelectItem value="pending">در انتظار تخصیص</SelectItem>
                        <SelectItem value="assigned">در حال بررسی</SelectItem>
                        <SelectItem value="resolved">حل شده</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Clear Filters */}
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setSearchTerm("");
                        setStatusFilter("all");
                      }}
                      className="w-full"
                    >
                      <Filter className="w-4 h-4 ml-2" />
                      پاک کردن فیلترها
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Arbitrations List */}
              <div className="space-y-4">
                {filteredArbitrations.map((arbitration) => (
                  <Card key={arbitration.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <CardTitle className="text-lg">
                              {arbitration.projectTitle}
                            </CardTitle>
                            {getStatusBadge(arbitration.status)}
                          </div>
                          <div className="flex items-center gap-6 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4" />
                              <span>{arbitration.projectBudget.toLocaleString('fa-IR')} ریال</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              <span>{arbitration.createdAt}</span>
                            </div>
                            {arbitration.arbitratorName && (
                              <div className="flex items-center gap-1">
                                <Scale className="w-4 h-4" />
                                <span>داور: {arbitration.arbitratorName}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Parties */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-3 bg-blue-50 rounded-lg">
                            <div className="text-sm font-medium text-blue-800 mb-1">
                              درخواست‌کننده ({arbitration.initiatorRole === 'employer' ? 'کارفرما' : 'مجری'})
                            </div>
                            <div className="text-blue-700">{arbitration.initiatorName}</div>
                          </div>
                          <div className="p-3 bg-gray-50 rounded-lg">
                            <div className="text-sm font-medium text-gray-800 mb-1">
                              طرف مقابل ({arbitration.initiatorRole === 'employer' ? 'مجری' : 'کارفرما'})
                            </div>
                            <div className="text-gray-700">{arbitration.respondentName}</div>
                          </div>
                        </div>

                        {/* Reason */}
                        <div>
                          <div className="text-sm font-medium text-gray-800 mb-2">دلیل درخواست داوری:</div>
                          <p className="text-gray-600 text-sm leading-relaxed">
                            {arbitration.reason}
                          </p>
                        </div>

                        {/* Resolution (if resolved) */}
                        {arbitration.status === 'resolved' && arbitration.resolution && (
                          <div className="border-t pt-4">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="text-sm font-medium text-gray-800">رأی داور:</div>
                              {arbitration.decision && getDecisionBadge(arbitration.decision)}
                            </div>
                            <p className="text-gray-600 text-sm leading-relaxed bg-green-50 p-3 rounded-lg">
                              {arbitration.resolution}
                            </p>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 pt-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link to={`/arbitration/${arbitration.id}`}>
                              <Eye className="w-4 h-4 ml-2" />
                              مشاهده جزئیات
                            </Link>
                          </Button>
                          
                          {user?.role === 'arbitrator' && arbitration.status === 'pending' && (
                            <Button size="sm" className="bg-zemano-600 hover:bg-zemano-700">
                              <Gavel className="w-4 h-4 ml-2" />
                              پذیرش داوری
                            </Button>
                          )}

                          {user?.role === 'arbitrator' && 
                           arbitration.status === 'assigned' && 
                           arbitration.arbitratorName === `${user.firstName} ${user.lastName}` && (
                            <Button size="sm" className="bg-green-600 hover:bg-green-700">
                              <FileText className="w-4 h-4 ml-2" />
                              ثبت رأی
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Empty State */}
              {filteredArbitrations.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Gavel className="w-12 h-12 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">پرونده‌ای یافت نشد</h3>
                  <p className="text-gray-600">
                    {searchTerm || statusFilter !== "all"
                      ? "با فیلترهای انتخاب شده پرونده‌ای وجود ندارد"
                      : activeTab === "my-cases"
                      ? "شما هنوز پرونده داوری ندارید"
                      : "هنوز پرونده داوری‌ای ثبت نشده است"
                    }
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Info Card */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-900 mb-1">راهنمای سیستم داوری</h3>
                  <p className="text-sm text-blue-700 leading-relaxed">
                    سیستم داوری ضمانو برای حل اختلافات پروژه‌ها طراحی شده است. 
                    در صورت بروز مشکل، می‌توانید درخواست داوری ثبت کنید تا داوران متخصص 
                    به صورت منصفانه در مورد پرونده شما تصمیم‌گیری کنند.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
