import App from "./app/App.tsx";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import GraphPage from "./pages/GraphPage/GraphPage.tsx";
import { CommentableText } from "./pages/MarkupPage/MarkupEditor.tsx";

const root = document.getElementById("root")!;

createRoot(root).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />}>
        <Route index element={<GraphPage />} />
        <Route path="markup" element={<CommentableText initialText="Москва является столицей России. В Москве находится Кремль. Россия - это большая страна." />} />
      </Route>
    </Routes>
  </BrowserRouter>
);
