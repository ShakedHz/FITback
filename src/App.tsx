import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/auth/AuthContext';
import { AppProvider } from '@/context/AppContext';
import { LocaleProvider } from '@/i18n';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { BottomNav } from '@/components/BottomNav';
import { LoginPage, RegisterPage } from '@/pages/AuthPage';
import { GoogleCallbackPage } from '@/pages/GoogleCallbackPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { LessonDetailPage } from '@/pages/LessonDetailPage';
import { LibraryPage } from '@/pages/LibraryPage';
import { CreateLessonPage } from '@/pages/CreateLessonPage';
import { AiLessonPage } from '@/pages/AiLessonPage';
import { LessonBuilderPage } from '@/pages/LessonBuilderPage';
import { ExerciseLibraryPage } from '@/pages/ExerciseLibraryPage';
import { AddExercisePage } from '@/pages/AddExercisePage';
import { LessonPreviewPage } from '@/pages/LessonPreviewPage';
import { FeedbackPage } from '@/pages/FeedbackPage';
import { AnalyticsHubPage } from '@/pages/AnalyticsHubPage';
import { LessonAnalyticsPage } from '@/pages/LessonAnalyticsPage';
import { SchedulePage } from '@/pages/SchedulePage';
import { ProfilePage } from '@/pages/ProfilePage';
import { OnboardingPage } from '@/pages/OnboardingPage';
import { WeeklySurveyPage } from '@/pages/WeeklySurveyPage';
import { ScrollToTop } from '@/components/ScrollToTop';

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
          <Route path="/feedback/:id?" element={<FeedbackPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />

          <Route path="/dashboard" element={<Guard><DashboardPage /></Guard>} />
          <Route path="/schedule" element={<Guard><SchedulePage /></Guard>} />
          <Route path="/analytics" element={<Guard><AnalyticsHubPage /></Guard>} />
          <Route path="/analytics/:id" element={<Guard><LessonAnalyticsPage /></Guard>} />
          <Route path="/lesson/:id" element={<Guard><LessonDetailPage /></Guard>} />
          <Route path="/library" element={<Guard><LibraryPage /></Guard>} />
          <Route path="/create" element={<Guard><CreateLessonPage /></Guard>} />
          <Route path="/create/ai" element={<Guard><AiLessonPage /></Guard>} />
          <Route path="/builder" element={<Guard><LessonBuilderPage /></Guard>} />
          <Route path="/exercises" element={<Guard><ExerciseLibraryPage /></Guard>} />
          <Route path="/exercises/new" element={<Guard><AddExercisePage /></Guard>} />
          <Route path="/preview" element={<Guard><LessonPreviewPage /></Guard>} />
          <Route path="/profile" element={<Guard><ProfilePage /></Guard>} />
          <Route path="/survey" element={<Guard><WeeklySurveyPage /></Guard>} />

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
      <AuthProvider>
        <AppProvider>
          <BrowserRouter>
            <AppLayout />
          </BrowserRouter>
        </AppProvider>
      </AuthProvider>
    </LocaleProvider>
  );
}
