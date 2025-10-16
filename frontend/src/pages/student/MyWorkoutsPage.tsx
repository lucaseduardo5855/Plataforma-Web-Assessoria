import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Add,
  FitnessCenter,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

const MyWorkoutsPage: React.FC = () => {
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registerWorkoutOpen, setRegisterWorkoutOpen] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const [workoutForm, setWorkoutForm] = useState({
    modality: '',
    duration: '',
    distance: '',
    calories: '',
    pace: '',
    notes: '',
  });

  useEffect(() => {
    fetchWorkouts();
  }, []);

  const fetchWorkouts = async () => {
    try {
      console.log('=== BUSCANDO TREINOS DO ALUNO ===');
      
      // Buscar treinos do aluno
      const response = await fetch(`http://localhost:5000/api/workouts/user/${user?.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      console.log('Status da resposta:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Resposta bruta da API:', data);
      
      // Tentar diferentes estruturas de dados
      let workoutsData = [];
      if (data.data) {
        workoutsData = data.data;
      } else if (Array.isArray(data)) {
        workoutsData = data;
      } else if (data.workouts) {
        workoutsData = data.workouts;
      }
      
      console.log('Treinos carregados:', workoutsData.length);
      setWorkouts(workoutsData);
      setError(null);
    } catch (err: any) {
      console.error('=== ERRO AO BUSCAR TREINOS ===');
      console.error('Erro completo:', err);
      
      // Se não conseguir buscar treinos específicos, buscar todos e filtrar
      try {
        const response = await fetch('http://localhost:5000/api/workouts', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          let allWorkouts = [];
          if (data.data) {
            allWorkouts = data.data;
          } else if (Array.isArray(data)) {
            allWorkouts = data;
          } else if (data.workouts) {
            allWorkouts = data.workouts;
          }
          
          // Filtrar treinos do usuário atual
          const userWorkouts = allWorkouts.filter((workout: any) => workout.userId === user?.id);
          setWorkouts(userWorkouts);
        }
      } catch (fallbackError) {
        console.error('Erro no fallback:', fallbackError);
        setError('Erro ao carregar treinos: ' + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterWorkout = async () => {
    try {
      console.log('=== REGISTRANDO TREINO DO ALUNO ===');
      console.log('Dados do treino:', workoutForm);
      console.log('ID do usuário:', user?.id);
      
      // Criar dados do treino
      const workoutData = {
        modality: workoutForm.modality,
        duration: parseInt(workoutForm.duration) || 0,
        distance: parseFloat(workoutForm.distance) || 0,
        calories: parseInt(workoutForm.calories) || 0,
        pace: parseFloat(workoutForm.pace) || 0,
        notes: workoutForm.notes,
        userId: user?.id,
        completedAt: new Date().toISOString()
      };
      
      // Fazer requisição para registrar treino
      const response = await fetch('http://localhost:5000/api/workouts/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(workoutData)
      });
      
      console.log('Status da resposta:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('Treino registrado:', result);
      
      // Fechar modal e limpar formulário
      setRegisterWorkoutOpen(false);
      setWorkoutForm({
        modality: '',
        duration: '',
        distance: '',
        calories: '',
        pace: '',
        notes: '',
      });
      
      setSnackbar({
        open: true,
        message: 'Treino registrado com sucesso!',
        severity: 'success'
      });
      
      // Recarregar lista de treinos
      fetchWorkouts();
      
    } catch (error) {
      console.error('=== ERRO AO REGISTRAR TREINO ===');
      console.error('Erro completo:', error);
      
      setSnackbar({
        open: true,
        message: 'Erro ao registrar treino',
        severity: 'error'
      });
    }
  };

  const getModalityLabel = (modality: string) => {
    switch (modality) {
      case 'RUNNING': return 'Corrida';
      case 'MUSCLE_TRAINING': return 'Musculação';
      case 'FUNCTIONAL': return 'Funcional';
      case 'TRAIL_RUNNING': return 'Trail Running';
      default: return modality;
    }
  };

  const renderWorkoutsTable = () => {
    if (loading) {
      return (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      );
    }

    return (
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Modalidade</TableCell>
              <TableCell>Duração (min)</TableCell>
              <TableCell>Distância (km)</TableCell>
              <TableCell>Pace (min/km)</TableCell>
              <TableCell>Calorias</TableCell>
              <TableCell>Data</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {workouts && workouts.length > 0 ? (
              workouts.map((workout, index) => (
                <TableRow key={index}>
                  <TableCell>{getModalityLabel(workout.modality)}</TableCell>
                  <TableCell>{workout.duration || 0}</TableCell>
                  <TableCell>{workout.distance || 0}</TableCell>
                  <TableCell>{workout.pace || 0}</TableCell>
                  <TableCell>{workout.calories || 0}</TableCell>
                  <TableCell>
                    {new Date(workout.completedAt || workout.createdAt).toLocaleDateString('pt-BR')}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Box py={4}>
                    <FitnessCenter sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="body1" color="text.secondary">
                      Nenhum treino registrado ainda.
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Meus Treinos
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setRegisterWorkoutOpen(true)}
        >
          Registrar Treino
        </Button>
      </Box>

      {renderWorkoutsTable()}

      {/* Modal para registrar treino */}
      <Dialog open={registerWorkoutOpen} onClose={() => setRegisterWorkoutOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Registrar Novo Treino</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} pt={1}>
            <FormControl fullWidth>
              <InputLabel>Modalidade</InputLabel>
              <Select
                value={workoutForm.modality}
                onChange={(e) => setWorkoutForm({ ...workoutForm, modality: e.target.value })}
                label="Modalidade"
              >
                <MenuItem value="RUNNING">Corrida</MenuItem>
                <MenuItem value="MUSCLE_TRAINING">Musculação</MenuItem>
                <MenuItem value="FUNCTIONAL">Funcional</MenuItem>
                <MenuItem value="TRAIL_RUNNING">Trail Running</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Duração (minutos)"
              type="number"
              value={workoutForm.duration}
              onChange={(e) => setWorkoutForm({ ...workoutForm, duration: e.target.value })}
              fullWidth
            />
            <TextField
              label="Distância (km)"
              type="number"
              value={workoutForm.distance}
              onChange={(e) => setWorkoutForm({ ...workoutForm, distance: e.target.value })}
              fullWidth
            />
            <TextField
              label="Pace (min/km)"
              type="number"
              value={workoutForm.pace}
              onChange={(e) => setWorkoutForm({ ...workoutForm, pace: e.target.value })}
              fullWidth
            />
            <TextField
              label="Calorias"
              type="number"
              value={workoutForm.calories}
              onChange={(e) => setWorkoutForm({ ...workoutForm, calories: e.target.value })}
              fullWidth
            />
            <TextField
              label="Observações"
              multiline
              rows={3}
              value={workoutForm.notes}
              onChange={(e) => setWorkoutForm({ ...workoutForm, notes: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRegisterWorkoutOpen(false)}>Cancelar</Button>
          <Button onClick={handleRegisterWorkout} variant="contained">
            Registrar Treino
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar para notificações */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default MyWorkoutsPage;