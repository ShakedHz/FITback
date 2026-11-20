import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/auth/AuthContext';
import { AppProvider } from '@/context/AppContext';
import { LocaleProvider } from '@/i18n';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { BottomNav } from '@/components/BottomNav';
import { LoginPage, RegisterPage } from '@/pages/AuthPage';
import { GoogleCallbackPage } from '@/pages/GoogleCallbackPage';
import { LessonDetailPage } from '@/pages/LessonDetailPage';
import { LibraryPage } from '@/pages/LibraryPage';
import { CreateLessonPage } from '@/pages/CreateLessonPage';
import { LessonBuilderPage } from '@/pages/LessonBuilderPage';
import { ExerciseLibraryPage } from '@/pages/ExerciseLibraryPage';
import { AddExercisePage } from '@/pages/AddExercisePage';
import { SchedulePage } from '@/pages/SchedulePage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { ScrollToTop } from '@/components/ScrollToTop';
import { ThemeProvider } from '@/theme';

function Guard({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

function AppLayout() {
  return (
    <div className="app-shell" id="app-shell">
      <ScrollToTop />
      <div className="app-content">
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/auth/google/callback" element={<GoogleCallbackPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/dashboard" element={<Guard><DashboardPage /></Guard>} />
          <Route path="/schedule" element={<Guard><SchedulePage /></Guard>} />
          <Route path="/lesson/:id" element={<Guard><LessonDetailPage /></Guard>} />
          <Route path="/library" element={<Guard><LibraryPage /></Guard>} />
          <Route path="/create" element={<Guard><CreateLessonPage /></Guard>} />
          <Route path="/builder" element={<Guard><LessonBuilderPage /></Guard>} />
          <Route path="/exercises" element={<Guard><ExerciseLibraryPage /></Guard>} />
          <Route path="/exercises/new" element={<Guard><AddExercisePage /></Guard>} />
          <Route path="/exercises/:exerciseId/edit" element={<Guard><AddExercisePage /></Guard>} />
          <Route path="/profile" element={<Guard><ProfilePage /></Guard>} />

          <Route path="/home" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <LocaleProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppProvider>
            <BrowserRouter>
              <AppLayout />
            </BrowserRouter>
          </AppProvider>
        </AuthProvider>
      </ThemeProvider>
    </LocaleProvider>
  );
}
