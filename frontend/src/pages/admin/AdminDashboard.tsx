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
  IconButton,
  Tooltip,
  Button,
} from '@mui/material';
import {
  People,
  FitnessCenter,
  Event,
  Assessment,
  TrendingUp,
  DirectionsRun,
  CalendarToday,
  BarChart,
  Refresh,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { userService, workoutService, eventService, evaluationService } from '../../services/api';
import { User, Workout, Event as EventType, Evaluation } from '../../types';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalWorkouts: 0,
    totalEvents: 0,
    totalEvaluations: 0,
    recentWorkouts: [] as Workout[],
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Buscar dados reais das APIs
        console.log('=== BUSCANDO ESTATÍSTICAS DO DASHBOARD ===');
        
        // Buscar alunos diretamente
        const studentsResponse = await fetch('http://localhost:5000/api/users/students', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        console.log('Status da resposta de alunos:', studentsResponse.status);
        console.log('Headers da resposta de alunos:', studentsResponse.headers);
        
        let studentsData = [];
        if (studentsResponse.ok) {
          const studentsResult = await studentsResponse.json();
          console.log('=== RESPOSTA COMPLETA DE ALUNOS ===');
          console.log('Resposta bruta:', studentsResult);
          console.log('Tipo da resposta:', typeof studentsResult);
          console.log('É array?', Array.isArray(studentsResult));
          console.log('Chaves disponíveis:', Object.keys(studentsResult));
          
          // Tentar diferentes estruturas de dados
          if (studentsResult.data) {
            studentsData = studentsResult.data;
            console.log('Usando studentsResult.data:', studentsData.length);
          } else if (Array.isArray(studentsResult)) {
            studentsData = studentsResult;
            console.log('Usando array direto:', studentsData.length);
          } else if (studentsResult.students) {
            studentsData = studentsResult.students;
            console.log('Usando studentsResult.students:', studentsData.length);
          } else if (studentsResult.users) {
            studentsData = studentsResult.users;
            console.log('Usando studentsResult.users:', studentsData.length);
          }
          
          console.log('=== RESULTADO FINAL ===');
          console.log('Dados finais de alunos:', studentsData);
          console.log('Quantidade final:', studentsData.length);
        } else {
          console.error('Erro na resposta de alunos:', studentsResponse.status, studentsResponse.statusText);
        }
        
        // Buscar planilhas
        const plansResponse = await fetch('http://localhost:5000/api/workouts/plans', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        let plansData = [];
        if (plansResponse.ok) {
          const plansResult = await plansResponse.json();
          console.log('Resposta de planilhas:', plansResult);
          
          if (plansResult.data) {
            plansData = plansResult.data;
          } else if (Array.isArray(plansResult)) {
            plansData = plansResult;
          } else if (plansResult.plans) {
            plansData = plansResult.plans;
          }
        }
        
        // Buscar eventos
        const eventsResponse = await fetch('http://localhost:5000/api/events', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        let eventsData = [];
        if (eventsResponse.ok) {
          const eventsResult = await eventsResponse.json();
          console.log('Resposta de eventos:', eventsResult);
          
          if (eventsResult.data) {
            eventsData = eventsResult.data;
          } else if (Array.isArray(eventsResult)) {
            eventsData = eventsResult;
          } else if (eventsResult.events) {
            eventsData = eventsResult.events;
          }
        }
        
        // Avaliações removidas do sistema
        let evaluationsData = [];
        
        console.log('Estatísticas calculadas:', {
          totalStudents: studentsData.length,
          totalWorkouts: plansData.length,
          totalEvents: eventsData.length,
          totalEvaluations: evaluationsData.length
        });

        // Atualizar estado com os dados obtidos
        console.log('=== ATUALIZANDO ESTATÍSTICAS ===');
        console.log('Alunos:', studentsData.length);
        console.log('Planilhas:', plansData.length);
        console.log('Eventos:', eventsData.length);
        console.log('Avaliações:', evaluationsData.length);
        
        const newStats = {
          totalStudents: studentsData.length,
          totalWorkouts: plansData.length,
          totalEvents: eventsData.length,
          totalEvaluations: 0, // Removido do sistema
          recentWorkouts: [],
        };
        
        console.log('Novas estatísticas:', newStats);
        setStats(newStats);
        
      } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
        // Em caso de erro, definir valores padrão
        setStats({
          totalStudents: 0,
          totalWorkouts: 0,
          totalEvents: 0,
          totalEvaluations: 0,
          recentWorkouts: [],
        });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    {
      title: 'Total de Alunos',
      value: stats.totalStudents,
      icon: <People />,
      color: '#1976d2',
      path: '/admin/students',
    },
    {
      title: 'Planilhas Criadas',
      value: stats.totalWorkouts,
      icon: <FitnessCenter />,
      color: '#388e3c',
      path: '/admin/workout-plans',
    },
    {
      title: 'Eventos Ativos',
      value: stats.totalEvents,
      icon: <Event />,
      color: '#f57c00',
      path: '/admin/events',
    },
  ];

  const quickActions = [
    {
      title: 'Cadastrar Aluno',
      description: 'Adicionar novo aluno ao sistema',
      icon: <People />,
      path: '/admin/students',
      color: '#1976d2',
    },
    {
      title: 'Criar Planilha',
      description: 'Criar nova planilha de treino',
      icon: <FitnessCenter />,
      path: '/admin/workout-plans',
      color: '#388e3c',
    },
    {
      title: 'Novo Evento',
      description: 'Criar evento ou competição',
      icon: <Event />,
      path: '/admin/events',
      color: '#f57c00',
    },
  ];

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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Carregando dashboard...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" component="h1">
          Painel Administrativo
        </Typography>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => window.location.reload()}
            disabled={loading}
          >
            Atualizar
          </Button>
          <Button
            variant="outlined"
            color="warning"
            onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              window.location.href = '/login';
            }}
          >
            Renovar Sessão
          </Button>
        </Box>
      </Box>

      {/* Cards de estatísticas */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statCards.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card
              sx={{
                cursor: 'pointer',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                },
              }}
              onClick={() => navigate(stat.path)}
            >
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      {stat.title}
                    </Typography>
                    <Typography variant="h4" component="div" sx={{ fontWeight: 'bold' }}>
                      {stat.value}
                    </Typography>
                  </Box>
                  <Avatar
                    sx={{
                      backgroundColor: stat.color,
                      width: 56,
                      height: 56,
                    }}
                  >
                    {stat.icon}
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Ações rápidas */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Ações Rápidas
            </Typography>
            <Grid container spacing={2}>
              {quickActions.map((action, index) => (
                <Grid item xs={12} sm={6} key={index}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      transition: 'transform 0.2s',
                      '&:hover': {
                        transform: 'translateY(-2px)',
                      },
                    }}
                    onClick={() => navigate(action.path)}
                  >
                    <CardContent sx={{ p: 2 }}>
                      <Box display="flex" alignItems="center" gap={2}>
                        <Avatar
                          sx={{
                            backgroundColor: action.color,
                            width: 40,
                            height: 40,
                          }}
                        >
                          {action.icon}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {action.title}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {action.description}
                          </Typography>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>

        {/* Treinos recentes */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="h6">
                Treinos Recentes
              </Typography>
              <Tooltip title="Ver todos os treinos">
                <IconButton
                  size="small"
                  onClick={() => navigate('/admin/workout-plans')}
                >
                  <BarChart />
                </IconButton>
              </Tooltip>
            </Box>
            
            {stats.recentWorkouts.length > 0 ? (
              <List>
                {stats.recentWorkouts.slice(0, 5).map((workout, index) => (
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
                            {workout.user?.name}
                          </Typography>
                          <Chip
                            label={workout.modality}
                            size="small"
                            sx={{
                              backgroundColor: getModalityColor(workout.modality),
                              color: 'white',
                              fontSize: '0.7rem',
                            }}
                          />
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
      </Grid>
    </Box>
  );
};

export default AdminDashboard;
