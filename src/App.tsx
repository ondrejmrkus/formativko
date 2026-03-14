import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import A01Dashboard from "./pages/A01Dashboard";
import A02CreateStudentProfiles from "./pages/A02CreateStudentProfiles";
import A03CreateClass from "./pages/A03CreateClass";
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
        <Routes>
          <Route path="/" element={<A01Dashboard />} />
          <Route path="/create-student-profiles" element={<A02CreateStudentProfiles />} />
          <Route path="/create-class" element={<A03CreateClass />} />
          <Route path="/student-profiles" element={<B01StudentProfiles />} />
          <Route path="/student-profiles/:id" element={<B02StudentProfileDetail />} />
          <Route path="/student-profiles/:id/proof/:proofId" element={<B03aProofOfLearningDetailText />} />
          <Route path="/student-profiles/:id/proof-file/:proofId" element={<B03bProofOfLearningDetailFile />} />
          <Route path="/student-profiles/:id/add-proof" element={<B04AddProofOfLearning />} />
          <Route path="/evaluations" element={<C01Evaluations />} />
          <Route path="/evaluations/create" element={<C02aCreateEvaluationDraft />} />
          <Route path="/evaluations/create/preview" element={<C02bCreateEvaluationDraft />} />
          <Route path="/evaluations/edit/:id" element={<C03EditEvaluationDrafts />} />
          <Route path="/lessons" element={<D01Lessons />} />
          <Route path="/capture" element={<E01CaptureToolChooseClass />} />
          <Route path="/capture/:classId" element={<E02CaptureToolAddProofs />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
