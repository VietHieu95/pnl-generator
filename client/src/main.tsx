import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered:', registration);
                // Force check for sw.js updates every time the app loads
                // especially important for iOS standalone mode
                registration.update();
            })
            .catch((error) => {
                console.log('SW registration failed:', error);
            });
    });
}
