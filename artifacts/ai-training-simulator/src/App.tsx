import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk, useUser } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from 'wouter';
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import LandingPage from "@/pages/LandingPage";
import SignInPage from "@/pages/auth/SignInPage";
import AdminSignInPage from "@/pages/auth/AdminSignInPage";
import SignUpPage from "@/pages/auth/SignUpPage";
import DashboardPage from "@/pages/DashboardPage";
import AssignmentsPage from "@/pages/admin/AssignmentsPage";
import GradingPage from "@/pages/admin/GradingPage";
import ProgressPage from "@/pages/admin/ProgressPage";
import AccountsPage from "@/pages/admin/AccountsPage";
import ModuleBuilderPage from "@/pages/admin/ModuleBuilderPage";
import ModulesPage from "@/pages/admin/ModulesPage";
import AssignModulesPage from "@/pages/admin/AssignModulesPage";
import ProfilePage from "@/pages/admin/ProfilePage";
import SettingsPage from "@/pages/admin/SettingsPage";
import DbTablesPage from "@/pages/admin/DbTablesPage";
import DebugLogsPage from "@/pages/admin/DebugLogsPage";
import QaCenterPage from "@/pages/admin/QaCenterPage";

import LearnerHomePage from "@/pages/learner/LearnerHomePage";
import LearnerModulesPage from "@/pages/learner/LearnerModulesPage";
import LearnerWorkspacePage from "@/pages/learner/LearnerWorkspacePage";
import LearnerProgressPage from "@/pages/learner/LearnerProgressPage";
import LearnerProfilePage from "@/pages/learner/LearnerProfilePage";
import LearnerSettingsPage from "@/pages/learner/LearnerSettingsPage";

import { useCurrentUser } from "@/hooks/useCurrentUser";
import { OrganizationProvider } from "@/contexts/OrganizationContext";

const queryClient = new QueryClient();

// REQUIRED — copy verbatim
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

// REQUIRED — copy verbatim (empty in dev, auto-set in prod)
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY');

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(199, 89%, 48%)", // Primary electric blue
    colorForeground: "hsl(210, 40%, 98%)", // White-ish text for dark mode form
    colorMutedForeground: "hsl(215, 20.2%, 65.1%)",
    colorDanger: "hsl(0, 62.8%, 30.6%)",
    colorBackground: "hsl(222, 47%, 10%)", // Card background
    colorInput: "hsl(217.2, 32.6%, 17.5%)",
    colorInputForeground: "hsl(210, 40%, 98%)",
    colorNeutral: "hsl(222, 47%, 15%)", // Borders
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[#0A1128] border border-[#1e293b] rounded-2xl w-[440px] max-w-full overflow-hidden shadow-2xl",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-white font-display font-semibold",
    headerSubtitle: "text-slate-400",
    socialButtonsBlockButtonText: "text-slate-200 font-medium",
    formFieldLabel: "text-slate-300 font-medium",
    footerActionLink: "text-blue-400 hover:text-blue-300 font-medium",
    footerActionText: "text-slate-400",
    dividerText: "text-slate-500",
    identityPreviewEditButton: "text-blue-400 hover:text-blue-300",
    formFieldSuccessText: "text-emerald-400",
    alertText: "text-red-400",
    logoBox: "mb-6",
    logoImage: "w-10 h-10 object-contain",
    socialButtonsBlockButton: "border-slate-800 hover:bg-slate-800/50 bg-slate-900/50 text-white",
    formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-white font-medium border-0",
    formFieldInput: "bg-slate-900 border-slate-800 text-white focus:ring-blue-500 focus:border-blue-500",
    footerAction: "bg-transparent",
    dividerLine: "bg-slate-800",
    alert: "bg-red-900/20 border border-red-900/50",
    otpCodeFieldInput: "bg-slate-900 border-slate-800 text-white",
    formFieldRow: "mb-4",
    main: "p-8",
  },
};

// Helps user's webview stay up-to-date when the signed-in user changes by invalidating the QueryClient cache.
function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsubscribe = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (
        prevUserIdRef.current !== undefined &&
        prevUserIdRef.current !== userId
      ) {
        queryClient.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsubscribe;
  }, [addListener, queryClient]);

  return null;
}

function RoleRouter() {
  const { localUser, isLoading } = useCurrentUser();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && localUser) {
      if (localUser.role === 'admin' || localUser.role === 'developer') {
        setLocation('/dashboard');
      } else if (localUser.role === 'learner') {
        setLocation('/learner/home');
      }
    }
  }, [localUser, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-background">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return null;
}

function HomeRedirect() {
  return (
    <>
      <Show when="signed-in">
        <RoleRouter />
      </Show>
      <Show when="signed-out">
        <LandingPage />
      </Show>
    </>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <OrganizationProvider>
        <Switch>
          <Route path="/" component={HomeRedirect} />
          <Route path="/sign-in/*?" component={SignInPage} />
          <Route path="/admin/sign-in/*?" component={AdminSignInPage} />
          <Route path="/sign-up/*?" component={SignUpPage} />
          
          <Route path="/dashboard" component={DashboardPage} />
          <Route path="/admin/assignments" component={AssignmentsPage} />
          <Route path="/admin/grading" component={GradingPage} />
          <Route path="/admin/progress" component={ProgressPage} />
          <Route path="/admin/accounts" component={AccountsPage} />
          <Route path="/admin/module-builder" component={ModuleBuilderPage} />
          <Route path="/admin/modules" component={ModulesPage} />
          <Route path="/admin/assign-modules" component={AssignModulesPage} />
          <Route path="/admin/profile" component={ProfilePage} />
          <Route path="/admin/settings" component={SettingsPage} />
          <Route path="/admin/db-tables" component={DbTablesPage} />
          <Route path="/admin/debug-logs" component={DebugLogsPage} />
          <Route path="/admin/qa-center" component={QaCenterPage} />
          
          <Route path="/learner/home" component={LearnerHomePage} />
          <Route path="/learner/modules" component={LearnerModulesPage} />
          <Route path="/learner/workspace" component={LearnerWorkspacePage} />
          <Route path="/learner/progress" component={LearnerProgressPage} />
          <Route path="/learner/profile" component={LearnerProfilePage} />
          <Route path="/learner/settings" component={LearnerSettingsPage} />
        </Switch>
        </OrganizationProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <TooltipProvider>
      <WouterRouter base={basePath}>
        <ClerkProviderWithRoutes />
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
