import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";
import PlaceholderPage from "./pages/PlaceholderPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<PlaceholderPage title="ورود" description="صفحه ورود کاربران" />} />
            <Route path="/register" element={<PlaceholderPage title="ثبت نام" description="صفحه ثبت نام کاربران جدید" />} />
            <Route path="/dashboard" element={<PlaceholderPage title="داشبورد" description="پنل کاربری" />} />
            <Route path="/projects" element={<PlaceholderPage title="پروژه‌ها" description="مدیریت پروژه‌ها" />} />
            <Route path="/wallet" element={<PlaceholderPage title="کیف پول" description="مدیریت کیف پول" />} />
            <Route path="/arbitration" element={<PlaceholderPage title="داوری" description="سیستم داوری" />} />
            <Route path="/about" element={<PlaceholderPage title="درباره ما" description="اطلاعات درباره ضمانو" />} />
            <Route path="/contact" element={<PlaceholderPage title="تماس با ما" description="راه‌های ارتباط با پشتیبانی" />} />
            <Route path="/help" element={<PlaceholderPage title="راهنما" description="راهنمای استفاده از سیستم" />} />
            <Route path="/faq" element={<PlaceholderPage title="سوالات متداول" description="پاسخ سوالات پرتکرار" />} />
            <Route path="/terms" element={<PlaceholderPage title="قوانین و مقررات" description="شرایط و قوانین استفاده" />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
