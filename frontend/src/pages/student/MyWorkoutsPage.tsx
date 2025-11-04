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
  Visibility,
  Edit,
  Delete,
  CheckCircle,
} from '@mui/icons-material';
import { Chip, IconButton } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';

const MyWorkoutsPage: React.FC = () => {
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [assignedWorkouts, setAssignedWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registerWorkoutOpen, setRegisterWorkoutOpen] = useState(false);
  const [workoutDetailsOpen, setWorkoutDetailsOpen] = useState(false);
  const [selectedWorkoutDetails, setSelectedWorkoutDetails] = useState<any>(null);
  const [editWorkoutOpen, setEditWorkoutOpen] = useState(false);
  const [selectedWorkoutToEdit, setSelectedWorkoutToEdit] = useState<any>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedWorkoutToDelete, setSelectedWorkoutToDelete] = useState<any>(null);
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
    durationUnit: 'MINUTES', // MINUTES ou HOURS
    distance: '',
    calories: '',
    pace: '',
    notes: '',
    // Campos específicos para musculação
    workoutType: '', // Tipo de treino (peito, costas, pernas, etc.)
    additionalWorkoutType: '', // Tipo adicional (peito e ombro, costas e bíceps, etc.)
    customAdditionalWorkoutType: '', // Campo personalizado quando "Outro" é selecionado
  });

  useEffect(() => {
    fetchWorkouts();
    fetchAssignedWorkouts();
  }, []);

  // Calcular pace automaticamente quando duração ou distância mudarem
  useEffect(() => {
    if (workoutForm.modality !== 'MUSCLE_TRAINING' && workoutForm.duration && workoutForm.distance) {
      const durationValue = parseFloat(workoutForm.duration);
      const distanceValue = parseFloat(workoutForm.distance);
      
      if (durationValue > 0 && distanceValue > 0) {
        // Converter para minutos se estiver em horas
        let totalMinutes = durationValue;
        if (workoutForm.durationUnit === 'HOURS') {
          totalMinutes = durationValue * 60;
        }
        
        // Calcular pace: tempo em minutos / distância em km
        const paceInMinutes = totalMinutes / distanceValue;
        const minutes = Math.floor(paceInMinutes);
        const seconds = Math.round((paceInMinutes - minutes) * 60);
        
        // Formatar como MM:SS
        const formattedPace = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        setWorkoutForm(prev => ({
          ...prev,
          pace: formattedPace
        }));
      } else {
        setWorkoutForm(prev => ({
          ...prev,
          pace: ''
        }));
      }
    } else {
      // Se não for corrida ou campos não estiverem preenchidos, limpar pace
      if (!workoutForm.duration || !workoutForm.distance) {
        setWorkoutForm(prev => ({
          ...prev,
          pace: ''
        }));
      }
    }
  }, [workoutForm.duration, workoutForm.distance, workoutForm.durationUnit, workoutForm.modality]);

  const fetchWorkouts = async () => {
    try {
      console.log('=== BUSCANDO TREINOS DO ALUNO ===');
      
      // Buscar treinos do aluno
      const response = await fetch('http://localhost:5000/api/workouts/my-workouts?page=1&limit=50', {
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
      
      // Não buscar treinos atribuídos aqui - será feito pela função fetchAssignedWorkouts
      // que usa a rota correta /assigned-workouts
      
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

  const fetchAssignedWorkouts = async () => {
    try {
      console.log('=== BUSCANDO TREINOS ATRIBUÍDOS ===');
      console.log('Token presente:', !!localStorage.getItem('token'));
      
      const response = await fetch('http://localhost:5000/api/workouts/assigned-workouts', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      console.log('Status da resposta (atribuídos):', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro na resposta:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Resposta completa:', data);
      console.log('Treinos atribuídos recebidos:', data.workouts);
      console.log('Quantidade de treinos:', data.workouts?.length || 0);
      
      setAssignedWorkouts(data.workouts || []);
    } catch (error) {
      console.error('Erro ao buscar treinos atribuídos:', error);
      setAssignedWorkouts([]); // Garantir que não fique com dados antigos
    }
  };

  const handleRegisterWorkout = async () => {
    try {
      console.log('=== REGISTRANDO TREINO DO ALUNO ===');
      console.log('Dados do treino:', workoutForm);
      console.log('ID do usuário:', user?.id);
      
      // Validar se modalidade foi selecionada
      if (!workoutForm.modality) {
        throw new Error('Por favor, selecione uma modalidade');
      }

      // Calcular duração em minutos para enviar ao backend
      let durationInMinutes = 0;
      if (workoutForm.duration) {
        const durationValue = parseFloat(workoutForm.duration);
        if (workoutForm.durationUnit === 'HOURS') {
          durationInMinutes = Math.round(durationValue * 60);
        } else {
          durationInMinutes = Math.round(durationValue);
        }
      }

      // Criar dados do treino
      const workoutData = {
        modality: workoutForm.modality, // Já está no formato correto (RUNNING, MUSCLE_TRAINING, etc.)
        duration: durationInMinutes,
        distance: parseFloat(workoutForm.distance) || 0,
        calories: parseInt(workoutForm.calories) || 0,
        pace: workoutForm.pace || '', // Pace calculado automaticamente
        notes: workoutForm.notes || '',
        // Campos específicos para musculação
        type: workoutForm.workoutType || null,
        additionalWorkoutType: workoutForm.additionalWorkoutType === 'OUTRO' 
          ? workoutForm.customAdditionalWorkoutType 
          : workoutForm.additionalWorkoutType || null,
        completedAt: new Date().toISOString()
      };
      
      // Fazer requisição para registrar treino
      const response = await fetch('http://localhost:5000/api/workouts/record', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(workoutData)
      });
      
      console.log('Status da resposta:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `Erro HTTP ${response.status}`;
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      console.log('Treino registrado:', result);
      
      // Fechar modal e limpar formulário
      setRegisterWorkoutOpen(false);
      setWorkoutForm({
        modality: '',
        duration: '',
        durationUnit: 'MINUTES',
        distance: '',
        calories: '',
        pace: '',
        notes: '',
        // Limpar campos de musculação
        workoutType: '',
        additionalWorkoutType: '',
        customAdditionalWorkoutType: '',
      });
      
      setSnackbar({
        open: true,
        message: 'Treino registrado com sucesso!',
        severity: 'success'
      });
      
      // Recarregar lista de treinos
      await fetchWorkouts();
      
      // Recarregar dados do dashboard se estiver na mesma sessão
      // Isso garante que as estatísticas sejam atualizadas
      window.dispatchEvent(new CustomEvent('workoutRegistered'));
      
    } catch (error) {
      console.error('=== ERRO AO REGISTRAR TREINO ===');
      console.error('Erro completo:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao registrar treino';
      
      setSnackbar({
        open: true,
        message: errorMessage,
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

  // Função para renderizar campos baseados na modalidade
  const renderWorkoutFields = () => {
    const isMuscleTraining = workoutForm.modality === 'MUSCLE_TRAINING';
    
    if (isMuscleTraining) {
      return (
        <>
          <TextField
            label="Duração (minutos)"
            type="number"
            value={workoutForm.duration}
            onChange={(e) => setWorkoutForm({ ...workoutForm, duration: e.target.value })}
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel>Tipo de Treino</InputLabel>
            <Select
              value={workoutForm.workoutType}
              onChange={(e) => setWorkoutForm({ ...workoutForm, workoutType: e.target.value })}
              label="Tipo de Treino"
            >
              <MenuItem value="PEITO">Peito</MenuItem>
              <MenuItem value="COSTAS">Costas</MenuItem>
              <MenuItem value="PERNAS">Pernas</MenuItem>
              <MenuItem value="OMBROS">Ombros</MenuItem>
              <MenuItem value="BICEPS">Bíceps</MenuItem>
              <MenuItem value="TRICEPS">Tríceps</MenuItem>
              <MenuItem value="ABDOMINAIS">Abdominais</MenuItem>
              <MenuItem value="CORPO_INTEIRO">Corpo Inteiro</MenuItem>
              <MenuItem value="FUNCIONAL">Funcional</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Tipo de Treino Adicional</InputLabel>
            <Select
              value={workoutForm.additionalWorkoutType}
              onChange={(e) => setWorkoutForm({ ...workoutForm, additionalWorkoutType: e.target.value })}
              label="Tipo de Treino Adicional"
            >
              <MenuItem value="PEITO_OMBRO">Peito e Ombros</MenuItem>
              <MenuItem value="COSTAS_BICEPS">Costas e Bíceps</MenuItem>
              <MenuItem value="PERNAS_GLUTEOS">Pernas e Glúteos</MenuItem>
              <MenuItem value="TRICEPS_OMBRO">Tríceps e Ombros</MenuItem>
              <MenuItem value="CORPO_INTEIRO">Corpo Inteiro</MenuItem>
              <MenuItem value="ABDOMINAIS_CORE">Abdominais e Core</MenuItem>
              <MenuItem value="FUNCIONAL_MUSCULACAO">Funcional + Musculação</MenuItem>
              <MenuItem value="CARDIO_MUSCULACAO">Cardio + Musculação</MenuItem>
              <MenuItem value="OUTRO">Outro</MenuItem>
            </Select>
          </FormControl>
          {workoutForm.additionalWorkoutType === 'OUTRO' && (
            <TextField
              label="Especifique o tipo de treino"
              value={workoutForm.customAdditionalWorkoutType}
              onChange={(e) => setWorkoutForm({ ...workoutForm, customAdditionalWorkoutType: e.target.value })}
              fullWidth
              placeholder="Digite o tipo de treino personalizado"
            />
          )}
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
        </>
      );
    } else {
      // Campos para corrida/funcional/trail
      return (
        <>
          <Box display="flex" gap={2}>
            <TextField
              label="Duração"
              type="number"
              value={workoutForm.duration}
              onChange={(e) => setWorkoutForm({ ...workoutForm, duration: e.target.value })}
              fullWidth
              inputProps={{ min: 0, step: "0.1" }}
            />
            <FormControl sx={{ minWidth: 140 }}>
              <InputLabel>Unidade</InputLabel>
              <Select
                value={workoutForm.durationUnit}
                onChange={(e) => setWorkoutForm({ ...workoutForm, durationUnit: e.target.value })}
                label="Unidade"
              >
                <MenuItem value="MINUTES">Minutos</MenuItem>
                <MenuItem value="HOURS">Horas</MenuItem>
              </Select>
            </FormControl>
          </Box>
          <TextField
            label="Distância (km)"
            type="number"
            value={workoutForm.distance}
            onChange={(e) => setWorkoutForm({ ...workoutForm, distance: e.target.value })}
            fullWidth
            inputProps={{ min: 0, step: "0.1" }}
          />
          <TextField
            label="Pace (min/km)"
            value={workoutForm.pace || ''}
            fullWidth
            disabled
            helperText="Calculado automaticamente: Tempo ÷ Distância"
            InputProps={{
              readOnly: true,
            }}
          />
          <TextField
            label="Calorias"
            type="number"
            value={workoutForm.calories}
            onChange={(e) => setWorkoutForm({ ...workoutForm, calories: e.target.value })}
            fullWidth
            inputProps={{ min: 0 }}
          />
          <TextField
            label="Observações"
            multiline
            rows={3}
            value={workoutForm.notes}
            onChange={(e) => setWorkoutForm({ ...workoutForm, notes: e.target.value })}
            fullWidth
          />
        </>
      );
    }
  };

  const handleMarkAsCompleted = async (workout: any) => {
    try {
      console.log('=== MARCANDO TREINO COMO CONCLUÍDO ===');
      console.log('Treino ID:', workout.id);
      
      const response = await fetch(`http://localhost:5000/api/workouts/assigned-workouts/${workout.id}/complete`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `Erro HTTP ${response.status}`;
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      console.log('Treino marcado como concluído:', result);
      
      // Mostrar notificação de sucesso
      setSnackbar({ 
        open: true, 
        message: 'Treino marcado como concluído!', 
        severity: 'success' 
      });
      
      // Aguardar um pouco para garantir que o backend processou
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Recarregar lista de treinos atribuídos
      await fetchAssignedWorkouts();
      
      // Mostrar mensagem de sucesso adicional
      console.log('✅ Status atualizado para: Concluído');
    } catch (err: any) {
      console.error('=== ERRO AO MARCAR TREINO COMO CONCLUÍDO ===');
      console.error('Erro completo:', err);
      
      setSnackbar({ 
        open: true, 
        message: 'Erro ao marcar treino como concluído: ' + err.message, 
        severity: 'error' 
      });
    }
  };

  const handleViewWorkoutDetails = async (workout: any) => {
    try {
      console.log('=== BUSCANDO DETALHES DO TREINO ===');
      console.log('Workout ID:', workout.id);
      console.log('Workout Plan ID:', workout.workoutPlanId);
      
      // Buscar detalhes da planilha de treino
      const response = await fetch(`http://localhost:5000/api/workouts/plans/${workout.workoutPlanId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Detalhes da planilha:', data);
        setSelectedWorkoutDetails(data.workoutPlan);
        setWorkoutDetailsOpen(true);
      } else {
        console.error('Erro ao buscar detalhes:', response.status);
        setSnackbar({
          open: true,
          message: 'Erro ao carregar detalhes do treino',
          severity: 'error'
        });
      }
    } catch (error) {
      console.error('Erro ao buscar detalhes do treino:', error);
      setSnackbar({
        open: true,
        message: 'Erro ao carregar detalhes do treino',
        severity: 'error'
      });
    }
  };

  const handleEditWorkout = (workout: any) => {
    // Verificar se é um treino registrado pelo próprio usuário (não atribuído pelo admin)
    if (workout.workoutPlanId) {
      setSnackbar({
        open: true,
        message: 'Treinos atribuídos pelo administrador não podem ser editados',
        severity: 'error'
      });
      return;
    }

    setSelectedWorkoutToEdit(workout);
    
    // Determinar unidade baseado na duração (se > 120 minutos, assumir horas)
    const durationValue = workout.duration || 0;
    const durationUnit = durationValue >= 120 ? 'HOURS' : 'MINUTES';
    const durationDisplay = durationUnit === 'HOURS' ? (durationValue / 60).toFixed(1) : durationValue.toString();
    
    setWorkoutForm({
      modality: workout.modality,
      duration: durationDisplay,
      durationUnit: durationUnit,
      distance: workout.distance?.toString() || '',
      calories: workout.calories?.toString() || '',
      pace: workout.pace || '',
      notes: workout.notes || '',
      // Campos específicos para musculação
      workoutType: workout.type || '',
      additionalWorkoutType: workout.additionalWorkoutType || '',
      customAdditionalWorkoutType: '',
    });
    setEditWorkoutOpen(true);
  };

  const handleUpdateWorkout = async () => {
    try {
      console.log('=== ATUALIZANDO TREINO ===');
      console.log('Dados do treino:', workoutForm);
      console.log('ID do treino:', selectedWorkoutToEdit.id);
      
      // Validar se modalidade foi selecionada
      if (!workoutForm.modality) {
        throw new Error('Por favor, selecione uma modalidade');
      }

      // Calcular duração em minutos para enviar ao backend
      let durationInMinutes = 0;
      if (workoutForm.duration) {
        const durationValue = parseFloat(workoutForm.duration);
        if (workoutForm.durationUnit === 'HOURS') {
          durationInMinutes = Math.round(durationValue * 60);
        } else {
          durationInMinutes = Math.round(durationValue);
        }
      }

      // Criar dados do treino
      const workoutData = {
        modality: workoutForm.modality,
        duration: durationInMinutes,
        distance: parseFloat(workoutForm.distance) || 0,
        calories: parseInt(workoutForm.calories) || 0,
        pace: workoutForm.pace || '', // Pace calculado automaticamente
        notes: workoutForm.notes || '',
        completedAt: new Date().toISOString()
      };
      
      // Fazer requisição para atualizar treino
      const response = await fetch(`http://localhost:5000/api/workouts/my-workouts/${selectedWorkoutToEdit.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(workoutData)
      });
      
      console.log('Status da resposta:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `Erro HTTP ${response.status}`;
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      console.log('Treino atualizado:', result);
      
      // Fechar modal e limpar formulário
      setEditWorkoutOpen(false);
      setSelectedWorkoutToEdit(null);
      setWorkoutForm({
        modality: '',
        duration: '',
        durationUnit: 'MINUTES',
        distance: '',
        calories: '',
        pace: '',
        notes: '',
        // Limpar campos de musculação
        workoutType: '',
        additionalWorkoutType: '',
        customAdditionalWorkoutType: '',
      });
      
      // Mostrar notificação de sucesso
      setSnackbar({ 
        open: true, 
        message: 'Treino atualizado com sucesso!', 
        severity: 'success' 
      });
      
      // Recarregar lista de treinos
      await fetchWorkouts();
    } catch (err: any) {
      console.error('=== ERRO AO ATUALIZAR TREINO ===');
      console.error('Erro completo:', err);
      
      setSnackbar({ 
        open: true, 
        message: 'Erro ao atualizar treino: ' + err.message, 
        severity: 'error' 
      });
    }
  };

  const handleDeleteWorkout = async (workout: any) => {
    // Verificar se é um treino registrado pelo próprio usuário (não atribuído pelo admin)
    if (workout.workoutPlanId) {
      setSnackbar({
        open: true,
        message: 'Treinos atribuídos pelo administrador não podem ser excluídos',
        severity: 'error'
      });
      return;
    }

    setSelectedWorkoutToDelete(workout);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteWorkout = async () => {
    if (!selectedWorkoutToDelete) return;

    try {
      console.log('=== EXCLUINDO TREINO ===');
      console.log('ID do treino:', selectedWorkoutToDelete.id);
      
      // Fazer requisição para excluir treino
      const response = await fetch(`http://localhost:5000/api/workouts/my-workouts/${selectedWorkoutToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      console.log('Status da resposta:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || `Erro HTTP ${response.status}`;
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      console.log('Treino excluído:', result);
      
      // Fechar modal
      setDeleteConfirmOpen(false);
      setSelectedWorkoutToDelete(null);
      
      // Mostrar notificação de sucesso
      setSnackbar({ 
        open: true, 
        message: 'Treino excluído com sucesso!', 
        severity: 'success' 
      });
      
      // Recarregar lista de treinos
      await fetchWorkouts();
    } catch (err: any) {
      console.error('=== ERRO AO EXCLUIR TREINO ===');
      console.error('Erro completo:', err);
      
      setSnackbar({ 
        open: true, 
        message: 'Erro ao excluir treino: ' + err.message, 
        severity: 'error' 
      });
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
              <TableCell>Ações</TableCell>
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
                  <TableCell>
                    <Box display="flex" gap={1}>
                      <IconButton
                        onClick={() => handleEditWorkout(workout)}
                        color="primary"
                        size="small"
                        title="Editar treino"
                      >
                        <Edit />
                      </IconButton>
                      <IconButton
                        onClick={() => handleDeleteWorkout(workout)}
                        color="error"
                        size="small"
                        title="Excluir treino"
                      >
                        <Delete />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} align="center">
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

      {/* Seção de Treinos Atribuídos pelo Admin */}
      <Box mt={4}>
        <Typography variant="h5" gutterBottom>
          Treinos Atribuídos pelo Administrador
        </Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Treino</TableCell>
                <TableCell>Modalidade</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Percurso</TableCell>
                <TableCell>Data de Atribuição</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {assignedWorkouts && assignedWorkouts.length > 0 ? (
                assignedWorkouts.map((workout, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Typography variant="body2" fontWeight="medium">
                        {workout.workoutPlan?.title || 'Treino Personalizado'}
                      </Typography>
                      {workout.workoutPlan?.description && (
                        <Typography variant="caption" color="text.secondary">
                          {workout.workoutPlan.description}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{getModalityLabel(workout.modality)}</TableCell>
                    <TableCell>{workout.type || '-'}</TableCell>
                    <TableCell>{workout.courseType || '-'}</TableCell>
                    <TableCell>
                      {new Date(workout.createdAt).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={workout.status === 'COMPLETED' ? "Concluído" : "Pendente"} 
                        color={workout.status === 'COMPLETED' ? "success" : "warning"} 
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Box display="flex" gap={1}>
                        <IconButton
                          onClick={() => handleViewWorkoutDetails(workout)}
                          color="primary"
                          size="small"
                          title="Ver detalhes do treino"
                        >
                          <Visibility />
                        </IconButton>
                        {workout.status !== 'COMPLETED' && (
                          <IconButton
                            onClick={() => handleMarkAsCompleted(workout)}
                            color="success"
                            size="small"
                            title="Marcar como concluído"
                          >
                            <CheckCircle />
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                    <Box display="flex" flexDirection="column" alignItems="center" gap={2}>
                      <FitnessCenter sx={{ fontSize: 48, color: 'text.secondary' }} />
                      <Typography variant="body1" color="text.secondary">
                        Nenhum treino atribuído pelo administrador ainda.
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

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
            {renderWorkoutFields()}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRegisterWorkoutOpen(false)}>Cancelar</Button>
          <Button onClick={handleRegisterWorkout} variant="contained">
            Registrar Treino
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal para editar treino */}
      <Dialog open={editWorkoutOpen} onClose={() => setEditWorkoutOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Editar Treino</DialogTitle>
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
            {renderWorkoutFields()}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditWorkoutOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleUpdateWorkout} variant="contained">
            Atualizar Treino
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de confirmação para excluir treino */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Confirmar Exclusão
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Tem certeza que deseja excluir o treino "{selectedWorkoutToDelete ? getModalityLabel(selectedWorkoutToDelete.modality) : ''}"? Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={confirmDeleteWorkout} 
            variant="contained" 
            color="error"
          >
            Excluir
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal para ver detalhes do treino atribuído */}
      <Dialog open={workoutDetailsOpen} onClose={() => setWorkoutDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Detalhes do Treino: {selectedWorkoutDetails?.title}
        </DialogTitle>
        <DialogContent>
          {selectedWorkoutDetails && (
            <Box>
              {/* Informações básicas */}
              <Box mb={3}>
                <Typography variant="h6" gutterBottom>
                  Informações do Treino
                </Typography>
                <Box display="flex" flexDirection="column" gap={1}>
                  <Typography><strong>Modalidade:</strong> {getModalityLabel(selectedWorkoutDetails.modality)}</Typography>
                  <Typography><strong>Tipo:</strong> {selectedWorkoutDetails.type || 'Não especificado'}</Typography>
                  <Typography><strong>Percurso:</strong> {selectedWorkoutDetails.courseType || 'Não especificado'}</Typography>
                  <Typography><strong>Data:</strong> {new Date(selectedWorkoutDetails.workoutDate).toLocaleDateString('pt-BR')}</Typography>
                  {selectedWorkoutDetails.description && (
                    <Typography><strong>Descrição:</strong> {selectedWorkoutDetails.description}</Typography>
                  )}
                </Box>
              </Box>

              {/* Exercícios */}
              {selectedWorkoutDetails.exercises && selectedWorkoutDetails.exercises.length > 0 && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Exercícios ({selectedWorkoutDetails.exercises.length})
                  </Typography>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>#</TableCell>
                          <TableCell>Nome</TableCell>
                          <TableCell>Séries</TableCell>
                          <TableCell>Repetições</TableCell>
                          <TableCell>Carga</TableCell>
                          <TableCell>Distância (km)</TableCell>
                          <TableCell>Tempo</TableCell>
                          <TableCell>Intervalo</TableCell>
                          <TableCell>Instruções</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {selectedWorkoutDetails.exercises.map((exercise: any, index: number) => (
                          <TableRow key={index}>
                            <TableCell>{exercise.sequence}</TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                {exercise.name}
                              </Typography>
                              {exercise.description && (
                                <Typography variant="caption" color="text.secondary">
                                  {exercise.description}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell>{exercise.sets || '-'}</TableCell>
                            <TableCell>{exercise.reps || '-'}</TableCell>
                            <TableCell>{exercise.load ? `${exercise.load}kg` : '-'}</TableCell>
                            <TableCell>{exercise.distance ? `${exercise.distance} km` : '-'}</TableCell>
                            <TableCell>{exercise.time || '-'}</TableCell>
                            <TableCell>{exercise.interval || '-'}</TableCell>
                            <TableCell>
                              {exercise.instruction && (
                                <Typography variant="caption">
                                  {exercise.instruction}
                                </Typography>
                              )}
                              {exercise.observation && (
                                <Typography variant="caption" color="text.secondary" display="block">
                                  Obs: {exercise.observation}
                                </Typography>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}

              {(!selectedWorkoutDetails.exercises || selectedWorkoutDetails.exercises.length === 0) && (
                <Box textAlign="center" py={3}>
                  <Typography color="text.secondary">
                    Nenhum exercício cadastrado para este treino.
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWorkoutDetailsOpen(false)}>
            Fechar
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