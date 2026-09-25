import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ProtectedRoute } from './components/ProtectedRoute';

import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { ScorerDashboard } from './pages/ScorerDashboard';
import { ScorerConsolePage } from './pages/ScorerConsolePage';

import { AdminTournamentsPage } from './pages/admin/AdminTournamentsPage';
import { AdminCategoriesPage } from './pages/admin/AdminCategoriesPage';
import { AdminTeamsPage } from './pages/admin/AdminTeamsPage';
import { AdminPlayersPage } from './pages/admin/AdminPlayersPage';
import { AdminCourtsPage } from './pages/admin/AdminCourtsPage';
import { AdminFixturesPage } from './pages/admin/AdminFixturesPage';
import { AdminAnnouncementsPage } from './pages/admin/AdminAnnouncementsPage';
import { AdminAuditLogsPage } from './pages/admin/AdminAuditLogsPage';
import { AdminStatsReportsPage } from './pages/admin/AdminStatsReportsPage';

import { FixturesPage } from './pages/FixturesPage';
import { StandingsPage } from './pages/StandingsPage';
import { ResultsPage } from './pages/ResultsPage';
import { TeamsPage } from './pages/TeamsPage';
import { PlayersPage } from './pages/PlayersPage';
import { MatchDetailPage } from './pages/MatchDetailPage';
import { TournamentDetailPage } from './pages/TournamentDetailPage';
import { VisualBracketPage } from './pages/VisualBracketPage';
import { LivePage } from './pages/LivePage';
import { TvPage } from './pages/TvPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
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
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
};
