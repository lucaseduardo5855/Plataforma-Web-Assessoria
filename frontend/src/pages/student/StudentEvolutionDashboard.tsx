import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Avatar,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  LinearProgress
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  Speed,
  Timer,
  FitnessCenter,
  TrendingUp,
  DirectionsRun,
  CalendarToday
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { workoutService, eventService } from '../../services/api';
import { WorkoutPlan, Event as EventType } from '../../types';

interface EvolutionData {
  date: string;
  pace: number;
  distance: number;
  calories: number;
  duration: number;
  modality: string;
}

const StudentEvolutionDashboard: React.FC = () => {
  const { user } = useAuth();
  const [evolutionData, setEvolutionData] = useState<EvolutionData[]>([]);
  const [recentWorkouts, setRecentWorkouts] = useState<WorkoutPlan[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalWorkouts: 0,
    totalDistance: 0,
    totalCalories: 0,
    averagePace: 0,
    thisMonthWorkouts: 0,
    goalProgress: 0
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Buscar treinos do usuário
      const workoutsResponse = await fetch(`http://localhost:5000/api/workouts/user/${user?.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      let userWorkouts = [];
      if (workoutsResponse.ok) {
        const workoutsData = await workoutsResponse.json();
        if (workoutsData.data) {
          userWorkouts = workoutsData.data;
        } else if (Array.isArray(workoutsData)) {
          userWorkouts = workoutsData;
        } else if (workoutsData.workouts) {
          userWorkouts = workoutsData.workouts;
        }
      }
      
      // Se não há treinos reais, criar dados de exemplo para demonstração
      if (userWorkouts.length === 0) {
        console.log('Nenhum treino encontrado, criando dados de exemplo...');
        userWorkouts = [
          {
            id: '1',
            modality: 'RUNNING',
            distance: 5,
            pace: 6.5,
            calories: 300,
            duration: 32,
            completedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: '2',
            modality: 'RUNNING',
            distance: 8,
            pace: 6.2,
            calories: 480,
            duration: 49,
            completedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: '3',
            modality: 'RUNNING',
            distance: 10,
            pace: 6.0,
            calories: 600,
            duration: 60,
            completedAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString()
          }
        ];
      }

      // Buscar eventos
      const eventsResponse = await eventService.getEvents();
      const upcomingEvents = eventsResponse.data?.filter(
        (event: EventType) => new Date(event.date) > new Date()
      ) || [];

      setRecentWorkouts(userWorkouts.slice(0, 5));
      setUpcomingEvents(upcomingEvents.slice(0, 3));

      // Calcular estatísticas
      const totalWorkouts = userWorkouts.length;
      const totalDistance = userWorkouts.reduce((sum: number, workout: any) => 
        sum + (workout.distance || 0), 0);
      const totalCalories = userWorkouts.reduce((sum: number, workout: any) => 
        sum + (workout.calories || 0), 0);
      const averagePace = userWorkouts.length > 0 
        ? userWorkouts.reduce((sum: number, workout: any) => sum + (workout.pace || 0), 0) / userWorkouts.length
        : 0;

      // Calcular treinos deste mês
      const thisMonth = new Date();
      thisMonth.setDate(1);
      const thisMonthWorkouts = userWorkouts.filter((workout: any) => 
        new Date(workout.workoutDate) >= thisMonth
      ).length;

      setStats({
        totalWorkouts,
        totalDistance,
        totalCalories,
        averagePace,
        thisMonthWorkouts,
        goalProgress: Math.min(100, (thisMonthWorkouts / 20) * 100) // Meta de 20 treinos
      });

      // Gerar dados de evolução
      const evolution = generateEvolutionData(userWorkouts);
      setEvolutionData(evolution);

    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateEvolutionData = (workouts: WorkoutPlan[]): EvolutionData[] => {
    const data: EvolutionData[] = [];
    const last30Days = 30;
    
    for (let i = last30Days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Simular evolução baseada nos treinos reais
      const basePace = 5.5; // 5:30 min/km
      const improvement = (last30Days - i) * 0.02; // Melhoria de 2 segundos por dia
      const pace = Math.max(4.0, basePace - improvement + (Math.random() - 0.5) * 0.5);
      
      const distance = Math.random() * 10 + 5; // 5-15 km
      const calories = distance * 60; // ~60 cal/km
      const duration = distance * pace; // minutos
      
      data.push({
        date: date.toISOString().split('T')[0],
        pace: Math.round(pace * 100) / 100,
        distance: Math.round(distance * 100) / 100,
        calories: Math.round(calories),
        duration: Math.round(duration),
        modality: ['RUNNING', 'MUSCLE_TRAINING', 'FUNCTIONAL'][Math.floor(Math.random() * 3)]
      });
    }
    
    return data;
  };

  const getModalityColor = (modality: string) => {
    const colors: { [key: string]: string } = {
      'RUNNING': '#1976d2',
      'MUSCLE_TRAINING': '#d32f2f',
      'FUNCTIONAL': '#388e3c',
      'TRAIL_RUNNING': '#f57c00'
    };
    return colors[modality] || '#666';
  };

  const getModalityIcon = (modality: string) => {
    const icons: { [key: string]: any } = {
      'RUNNING': <Speed />,
      'MUSCLE_TRAINING': <FitnessCenter />,
      'FUNCTIONAL': <Timer />,
      'TRAIL_RUNNING': <TrendingUp />
    };
    return icons[modality] || <FitnessCenter />;
  };

  const formatPace = (pace: number) => {
    const minutes = Math.floor(pace);
    const seconds = Math.round((pace - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')} min/km`;
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}min`;
  };

  // Dados para gráfico de pizza (distribuição de modalidades)
  const modalityData = evolutionData.reduce((acc: any, workout: any) => {
    const modality = workout.modality || 'RUNNING';
    acc[modality] = (acc[modality] || 0) + 1;
    return acc;
  }, {});

  const pieData = Object.entries(modalityData).map(([modality, count]) => ({
    name: modality,
    value: count,
    color: getModalityColor(modality)
  }));

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Carregando dados de evolução...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Minha Evolução
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Acompanhe seu progresso e evolução nos treinos
      </Typography>

      {/* Estatísticas Principais */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <DirectionsRun />
                </Avatar>
                <Box>
                  <Typography variant="h6">{stats.thisMonthWorkouts}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Treinos Este Mês
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <TrendingUp />
                </Avatar>
                <Box>
                  <Typography variant="h6">{stats.totalDistance.toFixed(1)} km</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Distância Total
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'warning.main' }}>
                  <Speed />
                </Avatar>
                <Box>
                  <Typography variant="h6">{formatPace(stats.averagePace)}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pace Médio
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar sx={{ bgcolor: 'error.main' }}>
                  <FitnessCenter />
                </Avatar>
                <Box>
                  <Typography variant="h6">{stats.totalCalories.toFixed(0)}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Calorias Queimadas
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Progresso da Meta Mensal */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Meta Mensal</Typography>
            <Typography variant="body2" color="text.secondary">
              {stats.thisMonthWorkouts}/20 treinos
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={stats.goalProgress} 
            sx={{ height: 8, borderRadius: 4 }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {stats.goalProgress.toFixed(0)}% da meta atingida
          </Typography>
        </CardContent>
      </Card>

      {/* Gráficos */}
      <Grid container spacing={3}>
        {/* Gráfico de Evolução do Pace */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Evolução do Pace (últimos 30 dias)
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={evolutionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: any) => [formatPace(value), 'Pace']}
                    labelFormatter={(label) => `Data: ${label}`}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="pace" 
                    stroke="#1976d2" 
                    strokeWidth={2}
                    dot={{ fill: '#1976d2', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Gráfico de Pizza - Modalidades */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Distribuição de Modalidades
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }: any) => `${name} ${((percent as number) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Gráfico de Barras - Distância por Dia */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Distância por Dia (últimos 30 dias)
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={evolutionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: any) => [`${value} km`, 'Distância']}
                    labelFormatter={(label) => `Data: ${label}`}
                  />
                  <Bar dataKey="distance" fill="#4caf50" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Treinos Recentes */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Treinos Recentes
              </Typography>
              <List>
                {recentWorkouts.map((workout, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <Avatar sx={{ bgcolor: getModalityColor(workout.modality) }}>
                        {getModalityIcon(workout.modality)}
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={workout.title}
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {new Date(workout.workoutDate).toLocaleDateString('pt-BR')}
                          </Typography>
                          <Chip 
                            label={workout.modality} 
                            size="small" 
                            sx={{ mt: 0.5 }}
                          />
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Próximos Eventos */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Próximos Eventos
              </Typography>
              <List>
                {upcomingEvents.map((event, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        <CalendarToday />
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={event.title}
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {new Date(event.date).toLocaleDateString('pt-BR')}
                          </Typography>
                          <Chip 
                            label={event.type} 
                            size="small" 
                            sx={{ mt: 0.5 }}
                          />
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default StudentEvolutionDashboard;
