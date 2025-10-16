import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import { ptBR } from '@mui/material/locale';

// Contextos
// CORRIGIDO: Mudei para importação nomeada ({ AuthProvider, useAuth }) e caminho relativo
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Componentes
// CORRIGIDO: Mudei todos os '@/' para './'
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';

// Páginas
// CORRIGIDO: Mudei todos os '@/' para './'
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import StudentDashboard from './pages/student/StudentDashboard';
import WorkoutPlansPage from './pages/admin/WorkoutPlansPage';
import StudentsPage from './pages/admin/StudentsPage';
import EventsPage from './pages/admin/EventsPage';
import EvaluationsPage from './pages/admin/EvaluationsPage';
import MyWorkoutsPage from './pages/student/MyWorkoutsPage';
import MyEventsPage from './pages/student/MyEventsPage';
import MyEvaluationsPage from './pages/student/MyEvaluationsPage';
import EvolutionDashboard from './pages/admin/EvolutionDashboard';
import StudentEvolutionDashboard from './pages/student/StudentEvolutionDashboard';

// Tema personalizado
const theme = createTheme({
    palette: {
        primary: {
            main: '#081F3E', // Azul Z4
            light: '#0A2548',
            dark: '#051122',
        },
        secondary: {
            main: '#FFEA00', // Amarelo Z4
            light: '#FFF566',
            dark: '#E6D300',
        },
        background: {
            default: '#f5f5f5',
            paper: '#ffffff',
        },
    },
    typography: {
        fontFamily: '"Poppins", "Roboto", "Helvetica", "Arial", sans-serif',
        h1: {
            fontWeight: 700,
        },
        h2: {
            fontWeight: 600,
        },
        h3: {
            fontWeight: 600,
        },
        h4: {
            fontWeight: 500,
        },
        h5: {
            fontWeight: 500,
        },
        h6: {
            fontWeight: 500,
        },
    },
    shape: {
        borderRadius: 8,
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    fontWeight: 500,
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                },
            },
        },
    },
}, ptBR);

// Componente de rota protegida
const ProtectedRoute: React.FC<{ children: React.ReactNode; adminOnly?: boolean }> = ({
    children,
    adminOnly = false
}) => {
    const { isAuthenticated, isAdmin, loading } = useAuth();

    if (loading) {
        return <LoadingSpinner />;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (adminOnly && !isAdmin) {
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
};

// Componente de rota pública (redireciona se já logado)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated, isAdmin, loading } = useAuth();

    if (loading) {
        return <LoadingSpinner />;
    }

    if (isAuthenticated) {
        return <Navigate to={isAdmin ? "/admin" : "/dashboard"} replace />;
    }

    return <>{children}</>;
};

// Componente principal da aplicação
const AppContent: React.FC = () => {
    const { isAuthenticated, isAdmin } = useAuth();

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            <CssBaseline />

            <Routes>
                {/* Rotas públicas */}
                <Route
                    path="/login"
                    element={
                        <PublicRoute>
                            <LoginPage />
                        </PublicRoute>
                    }
                />

                {/* Rotas protegidas - Admin */}
                <Route
                    path="/admin/*"
                    element={
                        <ProtectedRoute adminOnly>
                            <Layout>
                                <Routes>
                                    <Route path="/" element={<AdminDashboard />} />
                                    <Route path="/students" element={<StudentsPage />} />
                                    <Route path="/workout-plans" element={<WorkoutPlansPage />} />
                                    <Route path="/events" element={<EventsPage />} />
                                    <Route path="/evaluations" element={<EvaluationsPage />} />
                                    <Route path="/evolution" element={<EvolutionDashboard />} />
                                </Routes>
                            </Layout>
                        </ProtectedRoute>
                    }
                />

                {/* Rotas protegidas - Aluno */}
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <Layout>
                                <StudentDashboard />
                            </Layout>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/my-workouts"
                    element={
                        <ProtectedRoute>
                            <Layout>
                                <MyWorkoutsPage />
                            </Layout>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/my-events"
                    element={
                        <ProtectedRoute>
                            <Layout>
                                <MyEventsPage />
                            </Layout>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/my-evaluations"
                    element={
                        <ProtectedRoute>
                            <Layout>
                                <MyEvaluationsPage />
                            </Layout>
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/my-evolution"
                    element={
                        <ProtectedRoute>
                            <Layout>
                                <StudentEvolutionDashboard />
                            </Layout>
                        </ProtectedRoute>
                    }
                />

                {/* Rota padrão */}
                <Route
                    path="/"
                    element={
                        <Navigate
                            to={isAuthenticated ? (isAdmin ? "/admin" : "/dashboard") : "/login"}
                            replace
                        />
                    }
                />

                {/* Rota não encontrada */}
                <Route
                    path="*"
                    element={
                        <Navigate
                            to={isAuthenticated ? (isAdmin ? "/admin" : "/dashboard") : "/login"}
                            replace
                        />
                    }
                />
            </Routes>
        </Box>
    );
};

// Componente principal
const App: React.FC = () => {
    return (
        <ThemeProvider theme={theme}>
            <AuthProvider>
                <Router>
                    <AppContent />
                </Router>
            </AuthProvider>
        </ThemeProvider>
    );
};

export default App;