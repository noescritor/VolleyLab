  import { createRoot } from "react-dom/client";
  import { BrowserRouter, Routes, Route } from "react-router";
  import App from "./app/App.tsx";
  import { AuthPage } from "./app/components/auth/AuthPage.tsx";
  import { ProtectedRoute } from "./app/components/auth/ProtectedRoute.tsx";
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