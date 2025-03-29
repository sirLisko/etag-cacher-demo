import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";

// Initialize mock service worker in development
async function startApp() {
  if (import.meta.env.DEV) {
    const { worker } = await import("./mocks/server");
    await worker.start({
      onUnhandledRequest: "bypass",
    });
  }

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

startApp();
