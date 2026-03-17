import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import Login from "./pages/Login";
import A01Dashboard from "./pages/A01Dashboard";
import A02CreateStudentProfiles from "./pages/A02CreateStudentProfiles";
import A03CreateClass from "./pages/A03CreateClass";
import A04EditClass from "./pages/A04EditClass";
import B01StudentProfiles from "./pages/B01StudentProfiles";
import B02StudentProfileDetail from "./pages/B02StudentProfileDetail";
import B03aProofOfLearningDetailText from "./pages/B03aProofOfLearningDetailText";
import B03bProofOfLearningDetailFile from "./pages/B03bProofOfLearningDetailFile";
import B04AddProofOfLearning from "./pages/B04AddProofOfLearning";
import C01Evaluations from "./pages/C01Evaluations";
import C02aCreateEvaluationDraft from "./pages/C02aCreateEvaluationDraft";
import C02bCreateEvaluationDraft from "./pages/C02bCreateEvaluationDraft";
import C03EditEvaluationDrafts from "./pages/C03EditEvaluationDrafts";
import D01Lessons from "./pages/D01Lessons";
import F01Classes from "./pages/F01Classes";
import E01CaptureToolChooseClass from "./pages/E01CaptureToolChooseClass";
import E02CaptureToolAddProofs from "./pages/E02CaptureToolAddProofs";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><A01Dashboard /></ProtectedRoute>} />
            <Route path="/create-student-profiles" element={<ProtectedRoute><A02CreateStudentProfiles /></ProtectedRoute>} />
            <Route path="/create-class" element={<ProtectedRoute><A03CreateClass /></ProtectedRoute>} />
            <Route path="/edit-class/:classId" element={<ProtectedRoute><A04EditClass /></ProtectedRoute>} />
            <Route path="/student-profiles" element={<ProtectedRoute><B01StudentProfiles /></ProtectedRoute>} />
            <Route path="/student-profiles/:id" element={<ProtectedRoute><B02StudentProfileDetail /></ProtectedRoute>} />
            <Route path="/student-profiles/:id/proof/:proofId" element={<ProtectedRoute><B03aProofOfLearningDetailText /></ProtectedRoute>} />
            <Route path="/student-profiles/:id/proof-file/:proofId" element={<ProtectedRoute><B03bProofOfLearningDetailFile /></ProtectedRoute>} />
            <Route path="/student-profiles/:id/add-proof" element={<ProtectedRoute><B04AddProofOfLearning /></ProtectedRoute>} />
            <Route path="/evaluations" element={<ProtectedRoute><C01Evaluations /></ProtectedRoute>} />
            <Route path="/evaluations/create" element={<ProtectedRoute><C02aCreateEvaluationDraft /></ProtectedRoute>} />
            <Route path="/evaluations/create/preview" element={<ProtectedRoute><C02bCreateEvaluationDraft /></ProtectedRoute>} />
            <Route path="/evaluations/edit/:id" element={<ProtectedRoute><C03EditEvaluationDrafts /></ProtectedRoute>} />
            <Route path="/lessons" element={<ProtectedRoute><D01Lessons /></ProtectedRoute>} />
            <Route path="/classes" element={<ProtectedRoute><F01Classes /></ProtectedRoute>} />
            <Route path="/capture" element={<ProtectedRoute><E01CaptureToolChooseClass /></ProtectedRoute>} />
            <Route path="/capture/:classId" element={<ProtectedRoute><E02CaptureToolAddProofs /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
