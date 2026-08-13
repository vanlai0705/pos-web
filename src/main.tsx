import namDuongFavicon from "@assets/images/namduong.png"
import "dayjs/locale/vi"
import AppRoute from "./AppRoute.tsx"
import "./globals.css"
import i18next from "./i18n"
import { createRoot } from "react-dom/client"
import { I18nextProvider } from 'react-i18next'
import { Provider } from "react-redux"
import { PersistGate } from "redux-persist/integration/react"
import { Toaster } from "sonner"
import { ConfirmActionHost } from "./components/ui/use-confirm-action.tsx"
import { AppProvider } from "./context/app-provider.tsx"
import { SearchProvider } from "./context/search-context.tsx"
import { ToastProvider } from "./hooks/useToast.tsx"
import { persistor, store } from "./store/store.ts"

i18next.init({
  interpolation: { escapeValue: false }, // React already does escaping
});

const ensureFavicon = (href: string) => {
  const existing = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;

  if (existing) {
    existing.href = href;
    existing.type = "image/png";
    return;
  }

  const link = document.createElement("link");
  link.rel = "icon";
  link.type = "image/png";
  link.href = href;
  document.head.appendChild(link);
};

ensureFavicon(namDuongFavicon);

// Hide the pre-React splash once React mounts
const hideSplash = () => (window as any).__hideSplash?.()

createRoot(document.getElementById("root")!).render(
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <ToastProvider>
        <I18nextProvider i18n={i18next}>
          <AppProvider>
            <SearchProvider>
              <AppRoute />
            </SearchProvider>
          </AppProvider>
        </I18nextProvider>
      </ToastProvider>
      <ConfirmActionHost />
      <Toaster position="top-right" richColors expand visibleToasts={5} />
    </PersistGate>
  </Provider>,
);

hideSplash();
