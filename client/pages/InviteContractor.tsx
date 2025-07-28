import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, Check, Mail, Phone, Link as LinkIcon, Send, UserPlus, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { toast } from "sonner";

interface InviteData {
  method: 'email' | 'phone' | 'link';
  email: string;
  phoneNumber: string;
  message: string;
}

export default function InviteContractor() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [formData, setFormData] = useState<InviteData>({
    method: 'email',
    email: '',
    phoneNumber: '',
    message: `سلام،

من شما را برای همکاری در پروژه زیر دعوت می‌کنم:

لطفاً لینک زیر را کلیک کنید تا جزئیات پروژه را مشاهده کرده و در صورت تمایل پذیرش کنید:

با تشکر`
  });

  const handleInputChange = (field: keyof InviteData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError("");
  };

  const generateInviteLink = async () => {
    if (!projectId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/invite-link`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('zemano_token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const link = `${window.location.origin}/projects/accept/${data.inviteToken}`;
        setInviteLink(link);
        setFormData(prev => ({
          ...prev,
          message: prev.message.replace(/لینک زیر را کلیک کنید:.*$/m, `لینک زیر را کلیک کنید:\n${link}`)
        }));
      } else {
        const errorData = await response.json();
        setError(errorData.message || "خطا در تولید لینک دعوت");
      }
    } catch (err) {
      setError("خطا در ارتباط با سرور");
    } finally {
      setLoading(false);
    }
  };

  const copyInviteLink = async () => {
    if (!inviteLink) return;

    try {
      await navigator.clipboard.writeText(inviteLink);
      setLinkCopied(true);
      toast.success("لینک کپی شد");
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      toast.error("خطا در کپی لینک");
    }
  };

  const sendInvite = async () => {
    if (formData.method === 'email' && !formData.email) {
      setError("آدرس ایمیل الزامی است");
      return;
    }

    if (formData.method === 'phone' && !formData.phoneNumber) {
      setError("شماره موبایل الزامی است");
      return;
    }

    if (formData.method === 'link' && !inviteLink) {
      setError("ابتدا لینک دعوت را تولید کنید");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/invite`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('zemano_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          method: formData.method,
          email: formData.email || undefined,
          phoneNumber: formData.phoneNumber || undefined,
          message: formData.message,
          inviteLink: inviteLink || undefined
        }),
      });

      if (response.ok) {
        toast.success("دعوت‌نامه ارسال شد");
        navigate(`/projects/${projectId}`);
      } else {
        const errorData = await response.json();
        setError(errorData.message || "خطا در ارسال دعوت‌نامه");
      }
    } catch (err) {
      setError("خطا در ارسال دعوت‌نامه");
    } finally {
      setLoading(false);
    }
  };

  // Generate invite link on component mount if method is 'link'
  useState(() => {
    if (formData.method === 'link' && !inviteLink) {
      generateInviteLink();
    }
  });

  return (
    <ProtectedRoute requiredRole={['employer']}>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto max-w-2xl px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">دعوت مجری</h1>
            <p className="text-gray-600">مجری موردنظر خود را برای این پروژه دعوت کنید</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                روش دعوت
              </CardTitle>
              <CardDescription>
                یکی از روش‌های زیر را برای دعوت مجری انتخاب کنید
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Invite Method Selection */}
              <div className="space-y-4">
                <Label>روش دعوت را انتخاب کنید:</Label>
                <RadioGroup
                  value={formData.method}
                  onValueChange={(value) => {
                    handleInputChange('method', value);
                    if (value === 'link' && !inviteLink) {
                      generateInviteLink();
                    }
                  }}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-2 rtl:space-x-reverse p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                    <RadioGroupItem value="email" id="email" />
                    <div className="flex items-center space-x-2 rtl:space-x-reverse flex-1">
                      <Mail className="h-4 w-4 text-blue-600" />
                      <div>
                        <Label htmlFor="email" className="font-medium cursor-pointer">ایمیل</Label>
                        <p className="text-xs text-gray-500">ارسال دعوت‌نامه از طریق ایمیل</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 rtl:space-x-reverse p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                    <RadioGroupItem value="phone" id="phone" />
                    <div className="flex items-center space-x-2 rtl:space-x-reverse flex-1">
                      <Phone className="h-4 w-4 text-green-600" />
                      <div>
                        <Label htmlFor="phone" className="font-medium cursor-pointer">پیامک</Label>
                        <p className="text-xs text-gray-500">ارسال دعوت‌نامه از طریق پیامک</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 rtl:space-x-reverse p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                    <RadioGroupItem value="link" id="link" />
                    <div className="flex items-center space-x-2 rtl:space-x-reverse flex-1">
                      <LinkIcon className="h-4 w-4 text-purple-600" />
                      <div>
                        <Label htmlFor="link" className="font-medium cursor-pointer">لینک اختصاصی</Label>
                        <p className="text-xs text-gray-500">تولید لینک برای ارسال دستی</p>
                      </div>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {/* Email Form */}
              {formData.method === 'email' && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="emailInput">آدرس ایمیل مجری</Label>
                    <Input
                      id="emailInput"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder="contractor@example.com"
                      dir="ltr"
                    />
                  </div>
                </div>
              )}

              {/* Phone Form */}
              {formData.method === 'phone' && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="phoneInput">شماره موبایل مجری</Label>
                    <Input
                      id="phoneInput"
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                      placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                      dir="ltr"
                    />
                  </div>
                </div>
              )}

              {/* Link Display */}
              {formData.method === 'link' && inviteLink && (
                <div className="space-y-4">
                  <Label>لینک دعوت اختصاصی:</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={inviteLink}
                      readOnly
                      className="font-mono text-sm"
                      dir="ltr"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={copyInviteLink}
                      className="shrink-0"
                    >
                      {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600">
                    این لینک را به مجری موردنظر ارسال کنید. او با کلیک روی آن می‌تواند جزئیات پروژه را مشاهده کند.
                  </p>
                </div>
              )}

              {/* Message Template */}
              {(formData.method === 'email' || formData.method === 'phone') && (
                <div className="space-y-2">
                  <Label htmlFor="message">متن پیام (قابل ویرایش)</Label>
                  <textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => handleInputChange('message', e.target.value)}
                    rows={8}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-zemano-500 focus:border-transparent resize-none"
                    placeholder="متن دعوت‌نامه..."
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between pt-6">
                <Button
                  variant="outline"
                  onClick={() => navigate(`/projects/${projectId}`)}
                  disabled={loading}
                >
                  انصراف
                </Button>

                {formData.method === 'link' ? (
                  <Button
                    onClick={copyInviteLink}
                    disabled={!inviteLink}
                    className="bg-zemano-600 hover:bg-zemano-700"
                  >
                    {linkCopied ? (
                      <>
                        <Check className="w-4 h-4 ml-2" />
                        کپی شد
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 ml-2" />
                        کپی لینک
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={sendInvite}
                    disabled={loading}
                    className="bg-zemano-600 hover:bg-zemano-700"
                  >
                    {loading ? (
                      "در حال ارسال..."
                    ) : (
                      <>
                        <Send className="w-4 h-4 ml-2" />
                        ارسال دعوت‌نامه
                      </>
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">نکات مهم:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• پس از ارسال دعوت، پروژه در وضعیت "در انتظار پذیرش مجری" قرار می‌گیرد</li>
              <li>• مجری باید ابتدا ��حراز هویت خود را تکمیل کند</li>
              <li>• پس از پذیرش توسط مجری، قرارداد نهایی تولید می‌شود</li>
              <li>• تا زمان پذیرش، امکان لغو دعوت وجود دارد</li>
            </ul>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
