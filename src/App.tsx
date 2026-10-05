import { useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { ModeProvider, useMode } from '@/lib/mode';
import { ToastProvider } from '@/lib/toast';
import { RouterProvider, useRouter } from '@/lib/router';
import { AuthScreen } from '@/components/AuthScreen';
import { AppShell, type NavPage } from '@/components/AppShell';
import { ContractorShell, type ContractorNav } from '@/components/contractor/ContractorShell';
import { LoadingScreen } from '@/components/ui';
import { VerifyOnboarding } from '@/components/shared/VerifyOnboarding';

import { ClientHome } from '@/components/client/ClientHome';
import { ClientSearch } from '@/components/client/ClientSearch';
import { ClientProjects } from '@/components/client/ClientProjects';
import { NewRequest } from '@/components/client/NewRequest';
import { CompareBids } from '@/components/client/CompareBids';
import { ProjectDetail } from '@/components/client/ProjectDetail';
import { CategoryGallery } from '@/components/client/CategoryGallery';
import { ContractorDashboard } from '@/components/contractor/ContractorDashboard';
import { ContractorFeedPro } from '@/components/contractor/ContractorFeedPro';
import { EstimateCreator } from '@/components/contractor/EstimateCreator';
import { ContractorProjectsPro } from '@/components/contractor/ContractorProjectsPro';
import { ContractorWalletPro } from '@/components/contractor/ContractorWalletPro';
import { ContractorMessagesPro } from '@/components/contractor/ContractorMessagesPro';
import { Messages } from '@/components/shared/Messages';
import { TermsScreen } from '@/components/shared/TermsScreen';
import { VerificationScreen } from '@/components/shared/VerificationScreen';
import { PrivacyPolicy } from '@/components/shared/PrivacyPolicy';
import { AdminPanel } from '@/components/admin/AdminPanel';
import { ProfileSettings } from '@/components/shared/ProfileSettings';

function AppContent() {
  const { profile, loading, refreshProfile } = useAuth();
  const { mode } = useMode();
  const { route, navigate, goBack } = useRouter();
  // Auto-route admin users to admin panel on login
  const adminRouted = useRef(false);
  useEffect(() => {
    if (profile?.role === 'admin' && profile.verification_status === 'verified' && !adminRouted.current) {
      adminRouted.current = true;
      navigate('admin');
    }
  }, [profile, navigate]);

  if (loading) return <LoadingScreen />;
  if (!profile) return <AuthScreen />;

  const needsVerification =
    profile.verification_status === 'unverified' && !profile.document_id_url;

  if (needsVerification) {
    return (
      <VerifyOnboarding
        onComplete={() => {
          refreshProfile();
        }}
      />
    );
  }

  const handleNavigate = (page: string) => {
    window.dispatchEvent(new CustomEvent('pixio-navigate', { detail: page }));
  };

  const isContractor = mode === 'contractor';

  const contractorFullScreen = ['estimate', 'messages', 'verification', 'terms', 'privacy', 'admin', 'profile-settings'];
  const clientFullScreen = ['new-request', 'bid', 'project-detail', 'compare-bids', 'terms', 'verification', 'privacy', 'category-detail', 'admin', 'profile-settings'];

  const renderContractorPage = () => {
    switch (route.page) {
      case 'dashboard':
        return <ContractorDashboard onNavigate={handleNavigate} />;
      case 'feed':
        return <ContractorFeedPro />;
      case 'estimate':
        return <EstimateCreator projectId={route.params?.id || ''} />;
      case 'projects':
        return <ContractorProjectsPro />;
      case 'wallet':
        return <ContractorWalletPro />;
      case 'messages':
        if (route.params?.projectId) {
          return <Messages projectId={route.params.projectId} />;
        }
        return <ContractorMessagesPro />;
      case 'verification':
        return <VerificationScreen onBack={goBack} />;
      case 'terms':
        return <TermsScreen />;
      case 'privacy':
        return <PrivacyPolicy onBack={goBack} />;
      case 'admin':
        if (profile.role !== 'admin') { navigate('dashboard'); return <ContractorDashboard onNavigate={handleNavigate} />; }
        return <AdminPanel />;
      case 'profile':
      case 'profile-settings':
        return <ProfileSettings onBack={() => navigate('dashboard')} />;
      default:
        return <ContractorDashboard onNavigate={handleNavigate} />;
    }
  };

  const renderClientPage = () => {
    switch (route.page) {
      case 'home':
        return <ClientHome />;
      case 'search':
        return <ClientSearch initialCategoryId={route.params?.categoryId} />;
      case 'category-detail':
        return <CategoryGallery categoryId={route.params?.categoryId || ''} />;
      case 'new-request':
        return <NewRequest />;
      case 'compare-bids':
        return <CompareBids projectId={route.params?.id || ''} />;
      case 'project-detail':
        return <ProjectDetail projectId={route.params?.id || ''} />;
      case 'projects':
        return <ClientProjects />;
      case 'messages':
        return <Messages projectId={route.params?.projectId || ''} />;
      case 'terms':
        return <TermsScreen />;
      case 'verification':
        return <VerificationScreen onBack={goBack} />;
      case 'privacy':
        return <PrivacyPolicy onBack={goBack} />;
      case 'admin':
        if (profile.role !== 'admin') { navigate('home'); return <ClientHome />; }
        return <AdminPanel />;
      case 'profile':
      case 'profile-settings':
        return <ProfileSettings onBack={() => navigate('home')} />;
      default:
        return <ClientHome />;
    }
  };

  let content: React.ReactNode;

  if (isContractor) {
    const isFullScreen = contractorFullScreen.includes(route.page) || (route.page === 'messages' && route.params?.projectId);
    if (isFullScreen) {
      content = renderContractorPage();
    } else {
      const contractorNav: ContractorNav = (() => {
        if (['dashboard', 'feed', 'projects', 'messages', 'wallet'].includes(route.page)) {
          return route.page as ContractorNav;
        }
        return 'dashboard';
      })();
      content = (
        <ContractorShell page={contractorNav} onNavigate={handleNavigate}>
          {renderContractorPage()}
        </ContractorShell>
      );
    }
  } else {
    const isFullScreen = clientFullScreen.includes(route.page);
    if (isFullScreen) {
      content = renderClientPage();
    } else {
      const navPage: NavPage = (() => {
        if (['home', 'search', 'projects', 'feed', 'messages', 'wallet', 'profile'].includes(route.page)) {
          return route.page as NavPage;
        }
        return 'home';
      })();
      content = (
        <AppShell page={navPage} onNavigate={handleNavigate}>
          {renderClientPage()}
        </AppShell>
      );
    }
  }

  return <>{content}</>;
}

function AppWithProviders() {
  const { navigate } = useRouter();
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  useEffect(() => {
    const handler = ((e: CustomEvent) => navigateRef.current(e.detail)) as EventListener;
    window.addEventListener('pixio-navigate', handler);
    return () => window.removeEventListener('pixio-navigate', handler);
  }, []);

  return <AppContent />;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <RouterProvider>
          <ModeProvider>
            <AppWithProviders />
          </ModeProvider>
        </RouterProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
