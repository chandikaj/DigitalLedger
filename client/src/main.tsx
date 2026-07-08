import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { captureUtmParams } from "./lib/utm";

captureUtmParams();

createRoot(document.getElementById("root")!).render(<App />);
