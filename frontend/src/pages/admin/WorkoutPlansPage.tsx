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
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Chip,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  FitnessCenter,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { workoutService, userService } from '../../services/api';
import { WorkoutPlan, User, Exercise } from '../../types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tabpanel-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const WorkoutPlansPage: React.FC = () => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<WorkoutPlan[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<WorkoutPlan | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<WorkoutPlan | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    modality: '',
    type: '', // Tipo de treino
    courseType: '', // Tipo de percurso
    status: 'ACTIVE',
    workoutDate: new Date().toISOString().split('T')[0],
    studentId: '',
  });

  const [exercises, setExercises] = useState<Partial<Exercise>[]>([
    {
      sequence: 1,
      name: '',
      description: '',
      sets: 0,
      reps: 0,
      load: 0,
      interval: '',
      instruction: '',
      observation: '',
    }
  ]);

  useEffect(() => {
    fetchPlans();
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      console.log('=== BUSCANDO ALUNOS PARA PLANILHAS ===');
      
      // Buscar alunos diretamente
      const response = await fetch('http://localhost:5000/api/users/students', {
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
      let studentsData = [];
      if (data.data) {
        studentsData = data.data;
      } else if (Array.isArray(data)) {
        studentsData = data;
      } else if (data.students) {
        studentsData = data.students;
      } else if (data.users) {
        studentsData = data.users;
      }
      
      console.log('Alunos carregados para planilhas:', studentsData.length);
      setStudents(studentsData);
      
      if (studentsData.length > 0) {
        console.log('Alunos disponíveis:', studentsData.map((s: any) => ({ id: s.id, name: s.name })));
      }
    } catch (error) {
      console.error('=== ERRO AO BUSCAR ALUNOS PARA PLANILHAS ===');
      console.error('Erro completo:', error);
    }
  };

  const fetchPlans = async () => {
    try {
      console.log('=== BUSCANDO PLANILHAS ===');
      
      // Buscar planilhas diretamente
      const response = await fetch('http://localhost:5000/api/workouts/plans', {
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
      let plansData = [];
      if (data.data) {
        plansData = data.data;
      } else if (Array.isArray(data)) {
        plansData = data;
      } else if (data.plans) {
        plansData = data.plans;
      }
      
      console.log('Planilhas carregadas:', plansData.length);
      setPlans(plansData);
      setError(null);
    } catch (err: any) {
      console.error('=== ERRO AO BUSCAR PLANILHAS ===');
      console.error('Erro completo:', err);
      console.error('Status:', err.status);
      console.error('Mensagem:', err.message);
      
      setError('Erro ao carregar planilhas: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlan = async () => {
    if (!validateForm()) return;
    
    try {
      // Criar dados da planilha
      const planData = {
        title: formData.title,
        description: formData.description || undefined, // Se vazio, enviar undefined
        modality: formData.modality,
        type: formData.type || undefined,
        courseType: formData.courseType || undefined,
        status: formData.status,
        workoutDate: new Date(formData.workoutDate).toISOString(),
        // Incluir userId se aluno foi selecionado
        ...(formData.studentId && { userId: formData.studentId })
      };
      
      console.log('=== CRIANDO PLANILHA ===');
      console.log('FormData completo:', formData);
      console.log('Dados enviados para API:', planData);
      console.log('StudentId selecionado:', formData.studentId);
      console.log('userId será incluído?', !!(formData.studentId && { userId: formData.studentId }));
      
      // Fazer requisição direta para criar planilha
      const response = await fetch('http://localhost:5000/api/workouts/plans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(planData)
      });
      
      console.log('Status da resposta:', response.status);
      console.log('Headers da resposta:', response.headers);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro da resposta:', errorText);
        
        if (response.status === 400) {
          throw new Error(`Dados inválidos: ${errorText}`);
        } else if (response.status === 401) {
          throw new Error('Sessão expirada. Faça login novamente.');
        } else {
          throw new Error(`Erro do servidor: ${response.status} - ${errorText}`);
        }
      }
      
      const result = await response.json();
      console.log('Resposta do servidor:', result);
      
      // Fechar modal e limpar formulário primeiro
      setIsModalOpen(false);
      resetForm();
      
      // Mostrar notificação de sucesso
      setSnackbar({ open: true, message: 'Planilha criada com sucesso!', severity: 'success' });
      
      // Recarregar a lista imediatamente após sucesso
      try {
        console.log('=== RECARREGANDO LISTA DE PLANILHAS ===');
        await fetchPlans();
        console.log('Lista de planilhas recarregada com sucesso');
      } catch (error) {
        console.error('Erro ao recarregar lista:', error);
      }
    } catch (err: any) {
      console.error('=== ERRO AO CRIAR PLANILHA ===');
      console.error('Erro completo:', err);
      console.error('Status:', err.status);
      console.error('Mensagem:', err.message);
      
      setSnackbar({ 
        open: true, 
        message: 'Erro ao criar planilha: ' + err.message, 
        severity: 'error' 
      });
    }
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      setSnackbar({ open: true, message: 'Título é obrigatório', severity: 'error' });
      return false;
    }
    if (!formData.modality) {
      setSnackbar({ open: true, message: 'Modalidade é obrigatória', severity: 'error' });
      return false;
    }
    if (!formData.workoutDate) {
      setSnackbar({ open: true, message: 'Data do treino é obrigatória', severity: 'error' });
      return false;
    }
    // Validar studentId se necessário
    // if (!formData.studentId) {
    //   setSnackbar({ open: true, message: 'Selecione um aluno', severity: 'error' });
    //   return false;
    // }
    return true;
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      modality: '',
      type: '',
      courseType: '',
      status: 'ACTIVE',
      workoutDate: new Date().toISOString().split('T')[0],
      studentId: '',
    });
    setExercises([
      {
        sequence: 1,
        name: '',
        description: '',
        sets: 0,
        reps: 0,
        load: 0,
        interval: '',
        instruction: '',
        observation: '',
      }
    ]);
    setTabValue(0);
  };

  const openEditModal = (plan: any) => {
    setSelectedPlan(plan);
    setFormData({
      title: plan.title,
      description: plan.description || '',
      modality: plan.modality,
      type: plan.type || '',
      courseType: plan.courseType || '',
      status: plan.status,
      workoutDate: new Date(plan.workoutDate).toISOString().split('T')[0],
      studentId: '',
    });
    setIsEditModalOpen(true);
  };

  const openDeleteDialog = (plan: any) => {
    setPlanToDelete(plan);
    setDeleteDialogOpen(true);
  };

  const handleEditPlan = async () => {
    if (!validateForm() || !selectedPlan) return;
    
    try {
      console.log('=== EDITANDO PLANILHA ===');
      console.log('ID da planilha:', selectedPlan.id);
      
      const planData = {
        title: formData.title,
        description: formData.description || undefined,
        modality: formData.modality,
        type: formData.type || undefined,
        courseType: formData.courseType || undefined,
        status: formData.status,
        workoutDate: new Date(formData.workoutDate).toISOString(),
      };
      
      const response = await fetch(`http://localhost:5000/api/workouts/plans/${selectedPlan.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(planData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
      
      setSnackbar({ open: true, message: 'Planilha atualizada com sucesso!', severity: 'success' });
      setIsEditModalOpen(false);
      setSelectedPlan(null);
      resetForm();
      await fetchPlans();
    } catch (err: any) {
      setSnackbar({ 
        open: true, 
        message: 'Erro ao atualizar planilha: ' + err.message, 
        severity: 'error' 
      });
    }
  };

  const handleDeletePlan = async () => {
    if (!planToDelete) return;
    
    try {
      console.log('=== EXCLUINDO PLANILHA ===');
      console.log('ID da planilha:', planToDelete.id);
      
      const response = await fetch(`http://localhost:5000/api/workouts/plans/${planToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      setSnackbar({ open: true, message: 'Planilha excluída com sucesso!', severity: 'success' });
      setDeleteDialogOpen(false);
      setPlanToDelete(null);
      await fetchPlans();
    } catch (err: any) {
      setSnackbar({ 
        open: true, 
        message: 'Erro ao excluir planilha: ' + err.message, 
        severity: 'error' 
      });
    }
  };

  const addExercise = () => {
    setExercises([...exercises, {
      sequence: exercises.length + 1,
      name: '',
      description: '',
      sets: 0,
      reps: 0,
      load: 0,
      interval: '',
      instruction: '',
      observation: '',
    }]);
  };

  const removeExercise = (index: number) => {
    if (exercises.length > 1) {
      setExercises(exercises.filter((_, i) => i !== index));
    }
  };

  const updateExercise = (index: number, field: keyof Exercise, value: string) => {
    const updatedExercises = [...exercises];
    updatedExercises[index] = { ...updatedExercises[index], [field]: value };
    setExercises(updatedExercises);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'success';
      case 'INACTIVE': return 'default';
      case 'COMPLETED': return 'primary';
      default: return 'default';
    }
  };

  const renderPlansTable = () => {
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
              <TableCell>Título</TableCell>
              <TableCell>Modalidade</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Data</TableCell>
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {plans && plans.length > 0 ? (
              plans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell>{plan.title}</TableCell>
                  <TableCell>{getModalityLabel(plan.modality)}</TableCell>
                  <TableCell>
                    <Chip
                      label={plan.status}
                      color={getStatusColor(plan.status) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(plan.workoutDate).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Editar">
                      <IconButton 
                        color="primary" 
                        size="small"
                        onClick={() => openEditModal(plan)}
                      >
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Excluir">
                      <IconButton 
                        color="error" 
                        size="small"
                        onClick={() => openDeleteDialog(plan)}
                      >
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <Box py={4}>
                    <FitnessCenter sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="body1" color="text.secondary">
                      Nenhuma planilha criada ainda.
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
          Planilhas de Treino
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setIsModalOpen(true)}
        >
          Criar Planilha
        </Button>
      </Box>
      
      {renderPlansTable()}

      {/* Modal de Criação */}
      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Criar Nova Planilha</DialogTitle>
        <DialogContent>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={(e, newValue) => setTabValue(newValue)}>
              <Tab label="Informações Básicas" />
              <Tab label="Exercícios" />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            <Box display="flex" flexDirection="column" gap={2}>
              <TextField
                label="Título *"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                fullWidth
              />
              <TextField
                label="Descrição"
                multiline
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>Modalidade *</InputLabel>
                <Select
                  value={formData.modality}
                  onChange={(e) => setFormData({ ...formData, modality: e.target.value })}
                  label="Modalidade *"
                >
                  <MenuItem value="RUNNING">Corrida</MenuItem>
                  <MenuItem value="MUSCLE_TRAINING">Musculação</MenuItem>
                  <MenuItem value="FUNCTIONAL">Funcional</MenuItem>
                  <MenuItem value="TRAIL_RUNNING">Trail Running</MenuItem>
                </Select>
              </FormControl>
              
              {/* Campos específicos para corrida */}
              {formData.modality === 'RUNNING' && (
                <>
                  <FormControl fullWidth>
                    <InputLabel>Tipo de Treino</InputLabel>
                    <Select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      label="Tipo de Treino"
                    >
                      <MenuItem value="BASE">Base</MenuItem>
                      <MenuItem value="RAMP">Rampa</MenuItem>
                      <MenuItem value="SPEED">Tiro</MenuItem>
                      <MenuItem value="ENDURANCE">Resistência</MenuItem>
                      <MenuItem value="INTERVAL">Intervalado</MenuItem>
                      <MenuItem value="RECOVERY">Recuperação</MenuItem>
                    </Select>
                  </FormControl>
                  <FormControl fullWidth>
                    <InputLabel>Tipo de Percurso</InputLabel>
                    <Select
                      value={formData.courseType}
                      onChange={(e) => setFormData({ ...formData, courseType: e.target.value })}
                      label="Tipo de Percurso"
                    >
                      <MenuItem value="FLAT">Plano</MenuItem>
                      <MenuItem value="UPHILL">Subida</MenuItem>
                      <MenuItem value="DOWNHILL">Descida</MenuItem>
                      <MenuItem value="MIXED">Misto</MenuItem>
                      <MenuItem value="TRACK">Pista</MenuItem>
                      <MenuItem value="TRAIL">Trilha</MenuItem>
                    </Select>
                  </FormControl>
                </>
              )}
              
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  label="Status"
                >
                  <MenuItem value="ACTIVE">Ativo</MenuItem>
                  <MenuItem value="INACTIVE">Inativo</MenuItem>
                  <MenuItem value="COMPLETED">Concluído</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Data do Treino *"
                type="date"
                value={formData.workoutDate}
                onChange={(e) => setFormData({ ...formData, workoutDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel>Aluno (Opcional)</InputLabel>
                <Select
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  label="Aluno (Opcional)"
                >
                  <MenuItem value="">Nenhum aluno selecionado</MenuItem>
                  {students.map((student) => (
                    <MenuItem key={student.id} value={student.id}>
                      {student.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Box display="flex" flexDirection="column" gap={2}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">Exercícios</Typography>
                <Button variant="outlined" onClick={addExercise}>
                  Adicionar Exercício
                </Button>
              </Box>
              
              {exercises.map((exercise, index) => (
                <Card key={index} sx={{ p: 2 }}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="subtitle1">Exercício {index + 1}</Typography>
                    {exercises.length > 1 && (
                      <IconButton onClick={() => removeExercise(index)} color="error" size="small">
                        <Delete />
                      </IconButton>
                    )}
                  </Box>
                  
                  <Box display="flex" flexDirection="column" gap={2}>
                    <TextField
                      label="Nome do Exercício"
                      value={exercise.name || ''}
                      onChange={(e) => updateExercise(index, 'name', e.target.value)}
                      fullWidth
                      size="small"
                    />
                    <TextField
                      label="Descrição"
                      multiline
                      rows={2}
                      value={exercise.description || ''}
                      onChange={(e) => updateExercise(index, 'description', e.target.value)}
                      fullWidth
                      size="small"
                    />
                    <Box display="flex" gap={2}>
                      <TextField
                        label="Séries"
                        value={exercise.sets || ''}
                        onChange={(e) => updateExercise(index, 'sets', e.target.value)}
                        size="small"
                        sx={{ flex: 1 }}
                      />
                      <TextField
                        label="Repetições"
                        value={exercise.reps || ''}
                        onChange={(e) => updateExercise(index, 'reps', e.target.value)}
                        size="small"
                        sx={{ flex: 1 }}
                      />
                      <TextField
                        label="Carga (kg)"
                        value={exercise.load || ''}
                        onChange={(e) => updateExercise(index, 'load', e.target.value)}
                        size="small"
                        sx={{ flex: 1 }}
                      />
                    </Box>
                    <Box display="flex" gap={2}>
                      <TextField
                        label="Intervalo"
                        value={exercise.interval || ''}
                        onChange={(e) => updateExercise(index, 'interval', e.target.value)}
                        size="small"
                        sx={{ flex: 1 }}
                      />
                    </Box>
                    <TextField
                      label="Instruções"
                      value={exercise.instruction || ''}
                      onChange={(e) => updateExercise(index, 'instruction', e.target.value)}
                      fullWidth
                      size="small"
                    />
                    <TextField
                      label="Observações"
                      value={exercise.observation || ''}
                      onChange={(e) => updateExercise(index, 'observation', e.target.value)}
                      fullWidth
                      size="small"
                    />
                  </Box>
                </Card>
              ))}
            </Box>
          </TabPanel>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleCreatePlan} variant="contained">
            Criar Planilha
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

      {/* Modal de Edição */}
      <Dialog open={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Editar Planilha</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Título *"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              fullWidth
            />
            <TextField
              label="Descrição"
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Modalidade *</InputLabel>
              <Select
                value={formData.modality}
                onChange={(e) => setFormData({ ...formData, modality: e.target.value })}
                label="Modalidade *"
              >
                <MenuItem value="RUNNING">Corrida</MenuItem>
                <MenuItem value="MUSCLE_TRAINING">Musculação</MenuItem>
                <MenuItem value="FUNCTIONAL">Funcional</MenuItem>
                <MenuItem value="TRAIL_RUNNING">Trail Running</MenuItem>
              </Select>
            </FormControl>
            
            {formData.modality === 'RUNNING' && (
              <>
                <FormControl fullWidth>
                  <InputLabel>Tipo de Treino</InputLabel>
                  <Select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    label="Tipo de Treino"
                  >
                    <MenuItem value="RAMP">Rampa</MenuItem>
                    <MenuItem value="SPRINT">Tiro</MenuItem>
                    <MenuItem value="BASE">Base</MenuItem>
                    <MenuItem value="RECOVERY">Recuperação</MenuItem>
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>Tipo de Percurso</InputLabel>
                  <Select
                    value={formData.courseType}
                    onChange={(e) => setFormData({ ...formData, courseType: e.target.value })}
                    label="Tipo de Percurso"
                  >
                    <MenuItem value="UPHILL">Subida</MenuItem>
                    <MenuItem value="DOWNHILL">Descida</MenuItem>
                    <MenuItem value="MIXED">Misto</MenuItem>
                    <MenuItem value="TRACK">Pista</MenuItem>
                    <MenuItem value="TRAIL">Trilha</MenuItem>
                  </Select>
                </FormControl>
              </>
            )}
            
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                label="Status"
              >
                <MenuItem value="PROPOSED">Proposta</MenuItem>
                <MenuItem value="ACTIVE">Ativo</MenuItem>
                <MenuItem value="COMPLETED">Concluído</MenuItem>
                <MenuItem value="CANCELLED">Cancelado</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Data do Treino *"
              type="date"
              value={formData.workoutDate}
              onChange={(e) => setFormData({ ...formData, workoutDate: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsEditModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleEditPlan} variant="contained" color="primary">
            Salvar Alterações
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir a planilha "{planToDelete?.title}"?
            Esta ação não pode ser desfeita.
      </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleDeletePlan} variant="contained" color="error">
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkoutPlansPage;