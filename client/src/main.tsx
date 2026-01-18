import React from "react"; // 1. 이 줄을 맨 위에 추가했습니다.
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// React.StrictMode로 감싸주면 오류를 잡기에 더 좋습니다.
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);