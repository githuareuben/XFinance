// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

// If your App file is src/App.jsx:
import App from "./App.jsx";

// Global styles (import only what exists)
import "./styles/App.css";
import "./styles/Home.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);