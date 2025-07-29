import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Plus,
  Trash2,
  Upload,
  CalendarIcon,
  AlertCircle,
  FileText,
  DollarSign,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { faIR } from "date-fns/locale";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/contexts/AuthContext";

interface Milestone {
  id: string;
  title: string;
  description: string;
  amount: number;
  deadline?: Date;
}

export default function CreateProject() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Check if user has completed identity verification
  useEffect(() => {
    if (user && !user.isVerified) {
      // Redirect to verification page if user hasn't completed identity verification
      navigate("/verification");
    }
  }, [user, navigate]);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    budget: "",
    deadline: undefined as Date | undefined,
    attachment: null as File | null,
  });

  const [milestones, setMilestones] = useState<Milestone[]>([
    {
      id: "1",
      title: "",
      description: "",
      amount: 0,
      deadline: undefined,
    },
  ]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Categories
  const categories = [
    "طراحی وب",
    "توسعه نرم‌افزار",
    "طر��حی گرافیک",
    "تولید محتوا",
    "ترجمه",
    "بازاریابی دیجیتال",
    "مشاوره کسب‌وکار",
    "عکاسی و فیلمبرداری",
    "معماری و طراحی",
    "سایر",
  ];

  // Add new milestone
  const addMilestone = () => {
    const newMilestone: Milestone = {
      id: Date.now().toString(),
      title: "",
      description: "",
      amount: 0,
      deadline: undefined,
    };
    setMilestones([...milestones, newMilestone]);
  };

  // Remove milestone
  const removeMilestone = (id: string) => {
    if (milestones.length > 1) {
      setMilestones(milestones.filter((m) => m.id !== id));
    }
  };

  // Update milestone
  const updateMilestone = (id: string, field: keyof Milestone, value: any) => {
    setMilestones(
      milestones.map((m) => (m.id === id ? { ...m, [field]: value } : m)),
    );
  };

  // Calculate total amount from milestones
  const totalMilestonesAmount = milestones.reduce(
    (sum, m) => sum + (m.amount || 0),
    0,
  );

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setErrors({
          ...errors,
          attachment: "حجم فایل نباید بیش از ۱۰ مگابایت باشد",
        });
        return;
      }

      // Check file type
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/zip",
        "application/x-rar-compressed",
      ];

      if (!allowedTypes.includes(file.type)) {
        setErrors({ ...errors, attachment: "فرمت فایل مجاز نیست" });
        return;
      }

      setFormData({ ...formData, attachment: file });
      setErrors({ ...errors, attachment: "" });
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "عنوان پروژه الزامی است";
    }

    if (!formData.description.trim() || formData.description.length < 20) {
      newErrors.description = "توضیحات پروژه باید حداقل ۲۰ کاراکتر باشد";
    }

    if (!formData.category) {
      newErrors.category = "انتخاب دسته‌بندی الزامی است";
    }

    if (!formData.budget || parseFloat(formData.budget) < 10000) {
      newErrors.budget = "بودجه پروژه باید حداقل ۱۰,۰۰۰ ریال باشد";
    }

    if (!formData.deadline) {
      newErrors.deadline = "تاریخ پایان پروژه الزامی است";
    }

    // Validate milestones
    let hasMilestoneError = false;
    milestones.forEach((milestone, index) => {
      if (!milestone.title.trim()) {
        newErrors[`milestone_title_${index}`] = "عنوان مرحله الزامی است";
        hasMilestoneError = true;
      }
      if (!milestone.amount || milestone.amount < 1000) {
        newErrors[`milestone_amount_${index}`] =
          "مبلغ مرحله باید حداقل ۱,۰۰۰ ریال ب��شد";
        hasMilestoneError = true;
      }
    });

    // Check if milestones total equals budget
    const budget = parseFloat(formData.budget) || 0;
    if (Math.abs(totalMilestonesAmount - budget) > 0.01) {
      newErrors.milestones_total =
        "مجموع مبالغ مراحل باید برابر بودجه کل پروژه باشد";
      hasMilestoneError = true;
    }

    if (hasMilestoneError) {
      newErrors.milestones = "لطفاً خطاهای مراحل را اصلاح کنید";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Use authenticated fetch if available, fallback to regular fetch
      const fetchFn = window.authenticatedFetch || fetch;
      const headers: HeadersInit = {};

      if (!window.authenticatedFetch) {
        headers["Authorization"] =
          `Bearer ${localStorage.getItem("zemano_token")}`;
      }
      headers["Content-Type"] = "application/json";

      const response = await fetchFn("/api/projects", {
        method: "POST",
        headers,
        body: JSON.stringify({
          ...formData,
          milestones,
          totalAmount: totalMilestonesAmount,
        }),
      });

      // Check if response is ok first
      if (response.ok) {
        try {
          const data = await response.json();
          console.log("Create project response:", data);

          const projectId = data.data?.project?.id || data.project?.id;
          console.log("Extracted project ID:", projectId);

          if (projectId) {
            // Navigate to project details page
            navigate(`/projects/${projectId}`);
          } else {
            console.error("Project ID not found in response:", data);
            setErrors({ submit: "خطا در دریافت شناسه پروژه" });
          }
        } catch (jsonError) {
          console.error("Error parsing success response:", jsonError);
          setErrors({ submit: "خطا در پردازش پاسخ سرور" });
        }
      } else {
        // Handle error response
        try {
          const errorData = await response.json();
          console.error("Project creation error:", errorData);

          if (response.status === 401) {
            setErrors({ submit: "لطفاً دوباره وارد شوید" });
            // Optionally redirect to login
            // navigate('/login');
          } else {
            setErrors({ submit: errorData.message || "خطا در ایجاد پروژه" });
          }
        } catch (jsonError) {
          console.error("Error parsing error response:", jsonError);
          setErrors({ submit: `خطا در ایجاد پروژه (کد ${response.status})` });
        }
      }
    } catch (error) {
      console.error("Error creating project:", error);
      setErrors({ submit: "خطا در ایجاد پروژه. لطفاً دوباره تلاش ک��ید." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ProtectedRoute requiredRole={["employer"]}>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              ایجاد پروژه جد��د
            </h1>
            <p className="text-gray-600">اطلاعات کامل پروژه خود را وارد کنید</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  اطلاعات کلی
                </CardTitle>
                <CardDescription>
                  عنوان، توضیحات و دسته‌بندی پروژه را مشخص ��نید
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Project Title */}
                <div className="space-y-2">
                  <Label htmlFor="title">��نوان پروژه *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="عنوان جذاب و توصیفی برای پروژه خود بنویسید"
                    className={errors.title ? "border-red-500" : ""}
                  />
                  {errors.title && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.title}
                    </p>
                  )}
                </div>

                {/* Project Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">توضیحات پروژه *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="توضیحات کامل و دقیق از پروژه، نیازمندی‌ها و انتظارات خود بنویسید..."
                    rows={6}
                    className={errors.description ? "border-red-500" : ""}
                  />
                  <p className="text-sm text-gray-500">
                    {formData.description.length} کاراکتر (حد��قل ۲۰ کاراکتر)
                  </p>
                  {errors.description && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.description}
                    </p>
                  )}
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label htmlFor="category">دسته‌بندی *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData({ ...formData, category: value })
                    }
                  >
                    <SelectTrigger
                      className={errors.category ? "border-red-500" : ""}
                    >
                      <SelectValue placeholder="دسته‌بندی پروژه را انتخاب ک��ید" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.category && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.category}
                    </p>
                  )}
                </div>

                {/* File Attachment */}
                <div className="space-y-2">
                  <Label htmlFor="attachment">ضمیمه (اختیاری)</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                    <input
                      type="file"
                      id="attachment"
                      onChange={handleFileUpload}
                      className="hidden"
                      accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.zip,.rar"
                    />
                    <label htmlFor="attachment" className="cursor-pointer">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 mb-1">
                        {formData.attachment
                          ? formData.attachment.name
                          : "��ایل خود را بارگذاری کنید"}
                      </p>
                      <p className="text-xs text-gray-500">
                        فرمت‌��ای مجاز: JPG, PNG, PDF, DOC, ZIP (حداکثر ۱۰
                        مگابایت)
                      </p>
                    </label>
                  </div>
                  {errors.attachment && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.attachment}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Budget and Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  بودجه و زمان‌بندی
                </CardTitle>
                <CardDescription>
                  بودجه کل و مهلت تحویل پروژه را تعیین کنید
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Budget */}
                  <div className="space-y-2">
                    <Label htmlFor="budget">بودجه ��ل (ریال) *</Label>
                    <Input
                      id="budget"
                      type="number"
                      value={formData.budget}
                      onChange={(e) =>
                        setFormData({ ...formData, budget: e.target.value })
                      }
                      placeholder="مثال: 5000000"
                      className={errors.budget ? "border-red-500" : ""}
                    />
                    {formData.budget && (
                      <p className="text-sm text-gray-600">
                        {parseFloat(formData.budget).toLocaleString("fa-IR")}{" "}
                        ریال
                      </p>
                    )}
                    {errors.budget && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.budget}
                      </p>
                    )}
                  </div>

                  {/* Deadline */}
                  <div className="space-y-2">
                    <Label>مهلت تحویل *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.deadline && "text-muted-foreground",
                            errors.deadline && "border-red-500",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.deadline
                            ? format(formData.deadline, "PPP", { locale: faIR })
                            : "تاریخ پایان را انتخاب کنید"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.deadline}
                          onSelect={(date) =>
                            setFormData({ ...formData, deadline: date })
                          }
                          disabled={(date) =>
                            date < new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {errors.deadline && (
                      <p className="text-sm text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.deadline}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Milestones */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  مراحل انجام کار
                </CardTitle>
                <CardDescription>
                  پروژه را به مراحل مختلف تقسیم ��نید تا پرداخت‌ها مرحله‌ای
                  انجام شود
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {milestones.map((milestone, index) => (
                  <div
                    key={milestone.id}
                    className="p-4 border rounded-lg space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">مرحله {index + 1}</h3>
                      {milestones.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMilestone(milestone.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Milestone Title */}
                      <div className="space-y-2">
                        <Label>عنوان مر��له *</Label>
                        <Input
                          value={milestone.title}
                          onChange={(e) =>
                            updateMilestone(
                              milestone.id,
                              "title",
                              e.target.value,
                            )
                          }
                          placeholder="مثال: طراحی اولیه"
                          className={
                            errors[`milestone_title_${index}`]
                              ? "border-red-500"
                              : ""
                          }
                        />
                        {errors[`milestone_title_${index}`] && (
                          <p className="text-sm text-red-500">
                            {errors[`milestone_title_${index}`]}
                          </p>
                        )}
                      </div>

                      {/* Milestone Amount */}
                      <div className="space-y-2">
                        <Label>مبلغ (ریال) *</Label>
                        <Input
                          type="number"
                          value={milestone.amount || ""}
                          onChange={(e) =>
                            updateMilestone(
                              milestone.id,
                              "amount",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          placeholder="مثال: 2000000"
                          className={
                            errors[`milestone_amount_${index}`]
                              ? "border-red-500"
                              : ""
                          }
                        />
                        {errors[`milestone_amount_${index}`] && (
                          <p className="text-sm text-red-500">
                            {errors[`milestone_amount_${index}`]}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Milestone Description */}
                    <div className="space-y-2">
                      <Label>توضیحات مرحله</Label>
                      <Textarea
                        value={milestone.description}
                        onChange={(e) =>
                          updateMilestone(
                            milestone.id,
                            "description",
                            e.target.value,
                          )
                        }
                        placeholder="توضیحات تکمیلی برای این مرحله..."
                        rows={2}
                      />
                    </div>

                    {/* Milestone Deadline */}
                    <div className="space-y-2">
                      <Label>مهلت مرحله (اختیاری)</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !milestone.deadline && "text-muted-foreground",
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {milestone.deadline
                              ? format(milestone.deadline, "PPP", {
                                  locale: faIR,
                                })
                              : "مهلت این مرحله (اختیاری)"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={milestone.deadline}
                            onSelect={(date) =>
                              updateMilestone(milestone.id, "deadline", date)
                            }
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                ))}

                {/* Add Milestone Button */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={addMilestone}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 ml-2" />
                  افزودن مرحله جدید
                </Button>

                {/* Total Amount Summary */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">مجموع م��الغ مراحل:</span>
                    <span className="text-lg font-bold">
                      {totalMilestonesAmount.toLocaleString("fa-IR")} ریال
                    </span>
                  </div>
                  {formData.budget && (
                    <div className="flex justify-between items-center text-sm text-gray-600 mt-1">
                      <span>بودجه کل پروژه:</span>
                      <span>
                        {parseFloat(formData.budget).toLocaleString("fa-IR")}{" "}
                        ریال
                      </span>
                    </div>
                  )}
                  {errors.milestones_total && (
                    <p className="text-sm text-red-500 mt-2 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.milestones_total}
                    </p>
                  )}
                </div>

                {errors.milestones && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.milestones}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/dashboard")}
                disabled={isSubmitting}
              >
                انصراف
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-zemano-500 to-zemano-600 hover:from-zemano-600 hover:to-zemano-700"
              >
                {isSubmitting ? "در حال ایجاد..." : "ایجاد پروژه"}
              </Button>
            </div>

            {errors.submit && (
              <div className="text-center">
                <p className="text-sm text-red-500 flex items-center justify-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.submit}
                </p>
              </div>
            )}
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
}
