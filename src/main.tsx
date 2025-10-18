import App from "./app/App.tsx";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import GraphPage from "./pages/GraphPage/GraphPage.tsx";
import { MarkupEditor } from "./pages/MarkupPage/MarkupEditor.tsx";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { AuthProvider, ProtectedRoute } from "./app/providers";

const root = document.getElementById("root")!;

createRoot(root).render(
  <BrowserRouter>
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <App />
            </ProtectedRoute>
          }
        >
          <Route index element={<GraphPage />} />
          <Route path="markup" element={<MarkupEditor />} />
        </Route>
      </Routes>
    </AuthProvider>
  </BrowserRouter>
);
