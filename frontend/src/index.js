import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { hydrateCache } from "./utils/storage";

const root = ReactDOM.createRoot(document.getElementById("root"));

async function init() {
  await hydrateCache();
  root.render(
    <React.StrictMode>
      <GoogleOAuthProvider clientId="562251581550-be0h2rg21ahk8e45vc93hpsvaub0ptlb.apps.googleusercontent.com">
        <App />
      </GoogleOAuthProvider>
    </React.StrictMode>
  );
}

init();
