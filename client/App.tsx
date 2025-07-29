import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import OTPVerification from "./pages/OTPVerification";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import CreateProject from "./pages/CreateProject";
import Arbitration from "./pages/Arbitration";
import VerificationForm from "./pages/VerificationForm";
import InviteContractor from "./pages/InviteContractor";
import AcceptProject from "./pages/AcceptProject";
import AcceptProjectMinimal from "./pages/AcceptProjectMinimal";
import ProjectDetails from "./pages/ProjectDetails";
import NotFound from "./pages/NotFound";
import PlaceholderPage from "./pages/PlaceholderPage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/otp-verification" element={<OTPVerification />} />
              <Route path="/verification" element={<VerificationForm />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/projects/create" element={<CreateProject />} />
              <Route path="/projects/:id" element={<ProjectDetails />} />
              <Route path="/projects/:projectId/invite" element={<InviteContractor />} />
              <Route path="/projects/accept/:inviteToken" element={<AcceptProjectMinimal />} />
              <Route path="/wallet" element={<PlaceholderPage title="کیف پول" description="مدیریت کیف پول" />} />
              <Route path="/arbitration" element={<Arbitration />} />
              <Route path="/about" element={<PlaceholderPage title="درباره ما" description="اطلاعات درباره ضمانو" />} />
              <Route path="/contact" element={<PlaceholderPage title="تماس با ما" description="راه‌های ارتباط با پشتیبانی" />} />
              <Route path="/help" element={<PlaceholderPage title="راهنما" description="راهنمای استفاده از سیستم" />} />
              <Route path="/faq" element={<PlaceholderPage title="سوالات متداول" description="پاسخ سوالات پرتکرار" />} />
              <Route path="/terms" element={<PlaceholderPage title="قوانین و مقررات" description="شرایط و قوانین استفاده" />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);
