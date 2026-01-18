import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// React.StrictMode로 감싸주면 오류를 잡기에 더 좋습니다.
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);