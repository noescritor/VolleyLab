  import { createRoot } from "react-dom/client";
  import { BrowserRouter, Routes, Route } from "react-router";
  import App from "./app/App";
  import { AuthPage } from "./app/components/auth/AuthPage";
  import { ProtectedRoute } from "./app/components/auth/ProtectedRoute";
  import "./styles/index.css";

  import { Toaster } from "./app/components/ui/sonner";

  createRoot(document.getElementById("root")!).render(
    <BrowserRouter>
      <Toaster />
      <Routes>
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/*" element={
          <ProtectedRoute>
            <App />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );