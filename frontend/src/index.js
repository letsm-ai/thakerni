import "./instrument"; // Sentry init — must be first
import React from "react";
import ReactDOM from "react-dom/client";
import * as Sentry from "@sentry/react";
import "@/index.css";
import App from "@/App";

const root = ReactDOM.createRoot(document.getElementById("root"), {
  onUncaughtError: Sentry.reactErrorHandler(),
  onCaughtError: Sentry.reactErrorHandler(),
  onRecoverableError: Sentry.reactErrorHandler(),
});
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
