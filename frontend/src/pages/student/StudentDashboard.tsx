import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Chip,
  Button,
  LinearProgress,
} from '@mui/material';
import {
  DirectionsRun,
  FitnessCenter,
  CalendarToday,
  TrendingUp,
  Assessment,
  Add,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { workoutService, eventService, evaluationService } from '../../services/api';
import { Workout, Event, Evaluation, WorkoutStats } from '@/types';

const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<WorkoutStats | null>(null);
  const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) {
        console.log('Usuário não autenticado, pulando busca de dados');
        return;
      }
      
      try {
        setLoading(true);
        
        // Buscar estatísticas de treinos
        const statsResponse = await fetch('http://localhost:5000/api/workouts/stats?period=month', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData);
        }

        // Buscar treinos recentes
        const workoutsResponse = await fetch('http://localhost:5000/api/workouts/my-workouts?page=1&limit=5', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (workoutsResponse.ok) {
          const workoutsData = await workoutsResponse.json();
          setRecentWorkouts(workoutsData.workouts || []);
        }


        // Buscar eventos próximos
        const eventsResponse = await fetch('http://localhost:5000/api/events/my-events', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (eventsResponse.ok) {
          const eventsData = await eventsResponse.json();
          // Filtrar apenas eventos futuros
          const now = new Date();
          const upcomingEvents = eventsData.events?.filter((event: any) => 
            new Date(event.date) > now
          ).slice(0, 5) || [];
          setUpcomingEvents(upcomingEvents);
        }
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();

    // Listener para recarregar dados quando um treino for registrado
    const handleWorkoutRegistered = () => {
      fetchDashboardData();
    };

    window.addEventListener('workoutRegistered', handleWorkoutRegistered);

    return () => {
      window.removeEventListener('workoutRegistered', handleWorkoutRegistered);
    };
  }, [user]);

  const getModalityIcon = (modality: string) => {
    switch (modality) {
      case 'RUNNING':
        return <DirectionsRun />;
      case 'MUSCLE_TRAINING':
        return <FitnessCenter />;
      case 'FUNCTIONAL':
        return <TrendingUp />;
      default:
        return <FitnessCenter />;
    }
  };

  const getModalityColor = (modality: string) => {
    switch (modality) {
      case 'RUNNING':
        return '#1976d2';
      case 'MUSCLE_TRAINING':
        return '#388e3c';
      case 'FUNCTIONAL':
        return '#f57c00';
      default:
        return '#666';
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'TRAINING':
        return '#1976d2';
      case 'COMPETITION':
        return '#d32f2f';
      case 'WORKSHOP':
        return '#f57c00';
      case 'SOCIAL':
        return '#7b1fa2';
      default:
        return '#666';
    }
  };


  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Carregando dashboard...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4 }}>
        Olá, {user?.name}! 👋
      </Typography>

      {/* Cards de estatísticas */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Treinos Este Mês
                  </Typography>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                    {stats?.totalWorkouts || 0}
                  </Typography>
                </Box>
                <Avatar sx={{ backgroundColor: '#1976d2', width: 56, height: 56 }}>
                  <DirectionsRun />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Distância Total
                  </Typography>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                    {stats?.totalDistance ? `${stats.totalDistance.toFixed(1)}km` : '0km'}
                  </Typography>
                </Box>
                <Avatar sx={{ backgroundColor: '#388e3c', width: 56, height: 56 }}>
                  <TrendingUp />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Calorias Queimadas
                  </Typography>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                    {stats?.totalCalories || 0}
                  </Typography>
                </Box>
                <Avatar sx={{ backgroundColor: '#f57c00', width: 56, height: 56 }}>
                  <FitnessCenter />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Tempo Total
                  </Typography>
                  <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                    {stats?.totalDuration ? `${Math.round(stats.totalDuration / 60)}h` : '0h'}
                  </Typography>
                </Box>
                <Avatar sx={{ backgroundColor: '#d32f2f', width: 56, height: 56 }}>
                  <CalendarToday />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Ações rápidas */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Ações Rápidas
            </Typography>
            <Box display="flex" flexDirection="column" gap={2}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => navigate('/my-workouts')}
                sx={{ justifyContent: 'flex-start' }}
              >
                Registrar Treino
              </Button>
              <Button
                variant="outlined"
                startIcon={<CalendarToday />}
                onClick={() => navigate('/my-events')}
                sx={{ justifyContent: 'flex-start' }}
              >
                Ver Eventos
              </Button>
              <Button
                variant="outlined"
                startIcon={<Assessment />}
                onClick={() => navigate('/my-evaluations')}
                sx={{ justifyContent: 'flex-start' }}
              >
                Minhas Avaliações
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Treinos recentes */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Treinos Recentes
            </Typography>
            
            {recentWorkouts && recentWorkouts.length > 0 ? (
              <List>
                {recentWorkouts.map((workout, index) => (
                  <ListItem key={index} sx={{ px: 0 }}>
                    <ListItemIcon>
                      <Avatar
                        sx={{
                          backgroundColor: getModalityColor(workout.modality),
                          width: 32,
                          height: 32,
                        }}
                      >
                        {getModalityIcon(workout.modality)}
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body2" fontWeight="medium">
                            {workout.modality === 'RUNNING' ? 'Corrida' : 
                             workout.modality === 'MUSCLE_TRAINING' ? 'Musculação' : 
                             workout.modality === 'FUNCTIONAL' ? 'Funcional' : workout.modality}
                          </Typography>
                          {workout.pace && (
                            <Chip
                              label={workout.pace}
                              size="small"
                              sx={{ fontSize: '0.7rem' }}
                            />
                          )}
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" color="textSecondary">
                          {workout.completedAt 
                            ? new Date(workout.completedAt).toLocaleDateString('pt-BR')
                            : 'Data não disponível'}
                          {workout.distance && ` • ${workout.distance}km`}
                          {workout.duration && ` • ${workout.duration}min`}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="textSecondary" textAlign="center" py={2}>
                Nenhum treino registrado ainda
              </Typography>
            )}
          </Paper>
        </Grid>


        {/* Próximos eventos */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Próximos Eventos
            </Typography>
            
            {upcomingEvents && upcomingEvents.length > 0 ? (
              <List>
                {upcomingEvents.map((event, index) => (
                  <ListItem key={index} sx={{ px: 0 }}>
                    <ListItemIcon>
                      <Avatar
                        sx={{
                          backgroundColor: getEventTypeColor(event.type),
                          width: 32,
                          height: 32,
                        }}
                      >
                        <CalendarToday />
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography variant="body2" fontWeight="medium">
                            {event.title}
                          </Typography>
                          <Chip
                            label={event.type}
                            size="small"
                            sx={{
                              backgroundColor: getEventTypeColor(event.type),
                              color: 'white',
                              fontSize: '0.7rem',
                            }}
                          />
                        </Box>
                      }
                      secondary={
                        <Typography variant="caption" color="textSecondary">
                          {new Date(event.date).toLocaleDateString('pt-BR')}
                          {event.location && ` • ${event.location}`}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="textSecondary" textAlign="center" py={2}>
                Nenhum evento próximo
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Progresso do mês */}
      {stats && stats.totalWorkouts > 0 && (
        <Paper sx={{ p: 3, mt: 3 }}>
          <Typography variant="h6" gutterBottom>
            Progresso do Mês
          </Typography>
          <Box sx={{ mb: 2 }}>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2">Meta de treinos</Typography>
              <Typography variant="body2">{stats.totalWorkouts}/20</Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={(stats.totalWorkouts / 20) * 100}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
          <Typography variant="caption" color="textSecondary">
            Continue assim! Você está no caminho certo para alcançar seus objetivos.
          </Typography>
        </Paper>
      )}

    </Box>
  );
};

export default StudentDashboard;
