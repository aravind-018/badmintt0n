import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ProtectedRoute } from './components/ProtectedRoute';

// Route-level code splitting via React.lazy
const HomePage = lazy(() => import('./pages/HomePage').then((m) => ({ default: m.HomePage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then((m) => ({ default: m.AdminDashboard })));
const ScorerDashboard = lazy(() => import('./pages/ScorerDashboard').then((m) => ({ default: m.ScorerDashboard })));
const ScorerConsolePage = lazy(() => import('./pages/ScorerConsolePage').then((m) => ({ default: m.ScorerConsolePage })));

const AdminTournamentsPage = lazy(() => import('./pages/admin/AdminTournamentsPage').then((m) => ({ default: m.AdminTournamentsPage })));
const AdminCategoriesPage = lazy(() => import('./pages/admin/AdminCategoriesPage').then((m) => ({ default: m.AdminCategoriesPage })));
const AdminTeamsPage = lazy(() => import('./pages/admin/AdminTeamsPage').then((m) => ({ default: m.AdminTeamsPage })));
const AdminPlayersPage = lazy(() => import('./pages/admin/AdminPlayersPage').then((m) => ({ default: m.AdminPlayersPage })));
const AdminCourtsPage = lazy(() => import('./pages/admin/AdminCourtsPage').then((m) => ({ default: m.AdminCourtsPage })));
const AdminFixturesPage = lazy(() => import('./pages/admin/AdminFixturesPage').then((m) => ({ default: m.AdminFixturesPage })));
const AdminAnnouncementsPage = lazy(() => import('./pages/admin/AdminAnnouncementsPage').then((m) => ({ default: m.AdminAnnouncementsPage })));
const AdminAuditLogsPage = lazy(() => import('./pages/admin/AdminAuditLogsPage').then((m) => ({ default: m.AdminAuditLogsPage })));
const AdminStatsReportsPage = lazy(() => import('./pages/admin/AdminStatsReportsPage').then((m) => ({ default: m.AdminStatsReportsPage })));

const FixturesPage = lazy(() => import('./pages/FixturesPage').then((m) => ({ default: m.FixturesPage })));
const StandingsPage = lazy(() => import('./pages/StandingsPage').then((m) => ({ default: m.StandingsPage })));
const ResultsPage = lazy(() => import('./pages/ResultsPage').then((m) => ({ default: m.ResultsPage })));
const TeamsPage = lazy(() => import('./pages/TeamsPage').then((m) => ({ default: m.TeamsPage })));
const PlayersPage = lazy(() => import('./pages/PlayersPage').then((m) => ({ default: m.PlayersPage })));
const MatchDetailPage = lazy(() => import('./pages/MatchDetailPage').then((m) => ({ default: m.MatchDetailPage })));
const TournamentDetailPage = lazy(() => import('./pages/TournamentDetailPage').then((m) => ({ default: m.TournamentDetailPage })));
const VisualBracketPage = lazy(() => import('./pages/VisualBracketPage').then((m) => ({ default: m.VisualBracketPage })));
const LivePage = lazy(() => import('./pages/LivePage').then((m) => ({ default: m.LivePage })));
const TvPage = lazy(() => import('./pages/TvPage').then((m) => ({ default: m.TvPage })));

const RouteLoadingFallback = () => (
  <div className="min-h-screen bg-dark-900 flex items-center justify-center text-slate-400">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-xs uppercase tracking-wider font-semibold text-slate-500">Loading Premier League...</span>
    </div>
  </div>
);

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Suspense fallback={<RouteLoadingFallback />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/fixtures" element={<FixturesPage />} />
              <Route path="/standings" element={<StandingsPage />} />
              <Route path="/results" element={<ResultsPage />} />
              <Route path="/teams" element={<TeamsPage />} />
              <Route path="/players" element={<PlayersPage />} />
              <Route path="/bracket" element={<VisualBracketPage />} />
              <Route path="/match/:id" element={<MatchDetailPage />} />
              <Route path="/tournament/:slug" element={<TournamentDetailPage />} />
              <Route path="/live" element={<LivePage />} />
              <Route path="/tv" element={<TvPage />} />

              {/* Protected Scorer Routes */}
              <Route
                path="/scorer"
                element={
                  <ProtectedRoute allowedRoles={['SCORER', 'SUPER_ADMIN', 'TOURNAMENT_ADMIN']}>
                    <ScorerConsolePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/scorer/match/:matchId"
                element={
                  <ProtectedRoute allowedRoles={['SCORER', 'SUPER_ADMIN', 'TOURNAMENT_ADMIN']}>
                    <ScorerConsolePage />
                  </ProtectedRoute>
                }
              />

              {/* Protected Admin Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'TOURNAMENT_ADMIN']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/tournaments"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'TOURNAMENT_ADMIN']}>
                    <AdminTournamentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/categories"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'TOURNAMENT_ADMIN']}>
                    <AdminCategoriesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/teams"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'TOURNAMENT_ADMIN']}>
                    <AdminTeamsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/players"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'TOURNAMENT_ADMIN']}>
                    <AdminPlayersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/courts"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'TOURNAMENT_ADMIN']}>
                    <AdminCourtsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/fixtures"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'TOURNAMENT_ADMIN']}>
                    <AdminFixturesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/announcements"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'TOURNAMENT_ADMIN']}>
                    <AdminAnnouncementsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/audit-logs"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'TOURNAMENT_ADMIN']}>
                    <AdminAuditLogsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/stats"
                element={
                  <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'TOURNAMENT_ADMIN']}>
                    <AdminStatsReportsPage />
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
};
