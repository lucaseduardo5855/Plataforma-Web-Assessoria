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
  Chip,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Event,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { eventService } from '../../services/api';
import { Event as EventType } from '../../types';

const EventsPage: React.FC = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventType | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<EventType | null>(null);
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
    date: new Date().toISOString().split('T')[0],
    location: '',
    type: '',
    maxAttendees: '',
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      console.log('=== BUSCANDO EVENTOS ===');
      
      // Buscar eventos diretamente
      const response = await fetch('http://localhost:5000/api/events', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      console.log('Status da resposta:', response.status);
      console.log('Headers da resposta:', response.headers);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Resposta bruta da API:', data);
      console.log('Tipo da resposta:', typeof data);
      console.log('É array?', Array.isArray(data));
      console.log('Chaves disponíveis:', Object.keys(data));
      
      // Tentar diferentes estruturas de dados
      let eventsData = [];
      if (data.data) {
        eventsData = data.data;
        console.log('Usando data.data:', eventsData.length);
      } else if (Array.isArray(data)) {
        eventsData = data;
        console.log('Usando array direto:', eventsData.length);
      } else if (data.events) {
        eventsData = data.events;
        console.log('Usando data.events:', eventsData.length);
      }
      
      console.log('=== RESULTADO FINAL DE EVENTOS ===');
      console.log('Dados finais de eventos:', eventsData);
      console.log('Quantidade final:', eventsData.length);
      
      console.log('Eventos carregados:', eventsData.length);
      setEvents(eventsData);
      setError(null);
    } catch (err: any) {
      console.error('=== ERRO AO BUSCAR EVENTOS ===');
      console.error('Erro completo:', err);
      console.error('Status:', err.status);
      console.error('Mensagem:', err.message);
      
      setError('Erro ao carregar eventos: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async () => {
    if (!validateForm()) return;
    
    try {
      console.log('=== CRIANDO EVENTO ===');
      console.log('FormData original:', formData);
      console.log('Token atual:', localStorage.getItem('token') ? 'Presente' : 'Ausente');
      
      // Criar dados do evento
      const eventData = {
        title: formData.title,
        description: formData.description || undefined, // Se vazio, enviar undefined
        date: new Date(formData.date).toISOString(),
        location: formData.location || undefined,
        type: formData.type,
        maxAttendees: parseInt(formData.maxAttendees) || null,
      };
      
      console.log('Dados do evento criados:', eventData);
      console.log('Data convertida:', new Date(formData.date).toISOString());
      
      // Fazer requisição direta para criar evento
      const response = await fetch('http://localhost:5000/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(eventData)
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
      console.log('Evento criado:', result);
      
      // Fechar modal e limpar formulário primeiro
      setIsModalOpen(false);
      resetForm();
      
      // Mostrar notificação de sucesso
      setSnackbar({ open: true, message: 'Evento criado com sucesso!', severity: 'success' });
      
      // Recarregar a lista imediatamente após sucesso
      try {
        console.log('=== RECARREGANDO LISTA DE EVENTOS ===');
        console.log('Token para recarregar:', localStorage.getItem('token') ? 'Presente' : 'Ausente');
        await fetchEvents();
        console.log('Lista de eventos recarregada com sucesso');
        console.log('Eventos após recarregamento:', events.length);
      } catch (error) {
        console.error('Erro ao recarregar lista:', error);
      }
      
    } catch (err: any) {
      console.error('=== ERRO AO CRIAR EVENTO ===');
      console.error('Erro completo:', err);
      console.error('Status:', err.status);
      console.error('Mensagem:', err.message);
      
      setSnackbar({ 
        open: true, 
        message: 'Erro ao criar evento: ' + err.message, 
        severity: 'error' 
      });
    }
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      setSnackbar({ open: true, message: 'Título é obrigatório', severity: 'error' });
      return false;
    }
    if (!formData.date) {
      setSnackbar({ open: true, message: 'Data é obrigatória', severity: 'error' });
      return false;
    }
    if (!formData.type) {
      setSnackbar({ open: true, message: 'Tipo é obrigatório', severity: 'error' });
      return false;
    }
    
    // Validar se a data não é no passado
    const eventDate = new Date(formData.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (eventDate < today) {
      setSnackbar({ open: true, message: 'A data não pode ser no passado', severity: 'error' });
      return false;
    }
    
    return true;
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      location: '',
      type: '',
      maxAttendees: '',
    });
  };

  const openEditModal = (event: EventType) => {
    setSelectedEvent(event);
    setFormData({
      title: event.title,
      description: event.description || '',
      date: new Date(event.date).toISOString().split('T')[0],
      location: event.location || '',
      type: event.type,
      maxAttendees: event.maxAttendees?.toString() || '',
    });
    setIsEditModalOpen(true);
  };

  const openDeleteDialog = (event: EventType) => {
    setEventToDelete(event);
    setDeleteDialogOpen(true);
  };

  const handleEditEvent = async () => {
    if (!validateForm() || !selectedEvent) return;
    
    try {
      console.log('=== EDITANDO EVENTO ===');
      console.log('ID do evento:', selectedEvent.id);
      console.log('Dados atualizados:', formData);
      
      const eventData = {
        title: formData.title,
        description: formData.description || undefined,
        date: new Date(formData.date).toISOString(),
        location: formData.location || undefined,
        type: formData.type,
        maxAttendees: parseInt(formData.maxAttendees) || null,
      };
      
      console.log('Dados sendo enviados para API:', eventData);
      console.log('Data convertida:', new Date(formData.date).toISOString());
      
      const response = await fetch(`http://localhost:5000/api/events/${selectedEvent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(eventData)
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
      console.log('Evento atualizado:', result);
      
      setSnackbar({ open: true, message: 'Evento atualizado com sucesso!', severity: 'success' });
      setIsEditModalOpen(false);
      setSelectedEvent(null);
      resetForm();
      await fetchEvents();
    } catch (err: any) {
      setSnackbar({ 
        open: true, 
        message: 'Erro ao atualizar evento: ' + err.message, 
        severity: 'error' 
      });
    }
  };

  const handleDeleteEvent = async () => {
    if (!eventToDelete) return;
    
    try {
      console.log('=== EXCLUINDO EVENTO ===');
      console.log('ID do evento:', eventToDelete.id);
      
      const response = await fetch(`http://localhost:5000/api/events/${eventToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      setSnackbar({ open: true, message: 'Evento excluído com sucesso!', severity: 'success' });
      setDeleteDialogOpen(false);
      setEventToDelete(null);
      await fetchEvents();
    } catch (err: any) {
      setSnackbar({ 
        open: true, 
        message: 'Erro ao excluir evento: ' + err.message, 
        severity: 'error' 
      });
    }
  };

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case 'TRAINING': return 'Treino';
      case 'COMPETITION': return 'Competição';
      case 'WORKSHOP': return 'Workshop';
      case 'SOCIAL': return 'Social';
      default: return type;
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'TRAINING': return 'primary';
      case 'COMPETITION': return 'error';
      case 'WORKSHOP': return 'warning';
      case 'SOCIAL': return 'secondary';
      default: return 'default';
    }
  };

  const renderEventsTable = () => {
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
              <TableCell>Data</TableCell>
              <TableCell>Local</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Participantes</TableCell>
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {events && events.length > 0 ? (
              events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell>{event.title}</TableCell>
                  <TableCell>
                    {new Date(event.date).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>{event.location || 'Não informado'}</TableCell>
                  <TableCell>
                    <Chip
                      label={getEventTypeLabel(event.type)}
                      color={getEventTypeColor(event.type) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {event._count?.attendances || 0}
                    {event.maxAttendees && ` / ${event.maxAttendees}`}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Editar">
                      <IconButton 
                        color="primary" 
                        size="small"
                        onClick={() => openEditModal(event)}
                      >
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Excluir">
                      <IconButton 
                        color="error" 
                        size="small"
                        onClick={() => openDeleteDialog(event)}
                      >
                        <Delete />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Box py={4}>
                    <Event sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="body1" color="text.secondary">
                      Nenhum evento criado ainda.
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
          Eventos e Competições
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setIsModalOpen(true)}
        >
          Criar Evento
        </Button>
      </Box>

      {renderEventsTable()}

      {/* Modal de Criação */}
      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Criar Novo Evento</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} pt={1}>
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
            <TextField
              label="Data *"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Local"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Tipo *</InputLabel>
              <Select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                label="Tipo *"
              >
                <MenuItem value="TRAINING">Treino</MenuItem>
                <MenuItem value="COMPETITION">Competição</MenuItem>
                <MenuItem value="WORKSHOP">Workshop</MenuItem>
                <MenuItem value="SOCIAL">Social</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Máximo de Participantes"
              type="number"
              value={formData.maxAttendees}
              onChange={(e) => setFormData({ ...formData, maxAttendees: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleCreateEvent} variant="contained">
            Criar Evento
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Edição */}
      <Dialog open={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Editar Evento</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} pt={1}>
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
            <TextField
              label="Data *"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Local"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Tipo *</InputLabel>
              <Select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                label="Tipo *"
              >
                <MenuItem value="TRAINING">Treino</MenuItem>
                <MenuItem value="COMPETITION">Competição</MenuItem>
                <MenuItem value="WORKSHOP">Workshop</MenuItem>
                <MenuItem value="SOCIAL">Social</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Máximo de Participantes"
              type="number"
              value={formData.maxAttendees}
              onChange={(e) => setFormData({ ...formData, maxAttendees: e.target.value })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsEditModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleEditEvent} variant="contained">
            Salvar Alterações
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir o evento "{eventToDelete?.title}"?
            Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleDeleteEvent} color="error" variant="contained">
            Excluir
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

export default EventsPage;