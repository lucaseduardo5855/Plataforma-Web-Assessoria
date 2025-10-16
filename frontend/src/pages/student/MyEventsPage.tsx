import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  CircularProgress
} from '@mui/material';
import { Event, CheckCircle, Cancel } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

interface EventData {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  type: string;
  maxAttendees: number;
  myAttendance: {
    id: string;
    confirmed: boolean;
  } | null;
}

const MyEventsPage: React.FC = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventData[]>([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success'
  });
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    eventId: string;
    eventTitle: string;
    confirmed: boolean;
  }>({
    open: false,
    eventId: '',
    eventTitle: '',
    confirmed: false
  });

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/events/my-events', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Erro ao carregar eventos');
      }

      const data = await response.json();
      setEvents(data.events || []);
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: 'Erro ao carregar eventos: ' + error.message,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAttendance = (eventId: string, eventTitle: string, confirmed: boolean) => {
    setConfirmDialog({
      open: true,
      eventId,
      eventTitle,
      confirmed
    });
  };

  const confirmAttendance = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/events/${confirmDialog.eventId}/attendance`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          confirmed: confirmDialog.confirmed
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar presença');
      }

      // Atualizar lista local
      setEvents(prevEvents =>
        prevEvents.map(event =>
          event.id === confirmDialog.eventId
            ? {
                ...event,
                myAttendance: {
                  id: event.myAttendance?.id || '',
                  confirmed: confirmDialog.confirmed
                }
              }
            : event
        )
      );

      setSnackbar({
        open: true,
        message: confirmDialog.confirmed ? 'Presença confirmada!' : 'Presença negada!',
        severity: 'success'
      });
    } catch (error: any) {
      setSnackbar({
        open: true,
        message: 'Erro ao atualizar presença: ' + error.message,
        severity: 'error'
      });
    } finally {
      setConfirmDialog({ open: false, eventId: '', eventTitle: '', confirmed: false });
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'TRAINING': return 'primary';
      case 'COMPETITION': return 'secondary';
      case 'WORKSHOP': return 'success';
      case 'SOCIAL': return 'warning';
      default: return 'default';
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

  const getAttendanceStatus = (event: EventData) => {
    if (!event.myAttendance) {
      return { label: 'Pendente', color: 'default' as const };
    }
    return event.myAttendance.confirmed
      ? { label: 'Confirmado', color: 'success' as const }
      : { label: 'Negado', color: 'error' as const };
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        Meus Eventos
      </Typography>
      
      <Typography variant="body1" color="textSecondary" gutterBottom>
        Confirme sua presença nos eventos abaixo
      </Typography>

      {events.length === 0 ? (
        <Card>
          <CardContent>
            <Typography variant="body1" color="textSecondary" align="center">
              Nenhum evento encontrado
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {events.map((event) => {
            const attendanceStatus = getAttendanceStatus(event);
            const eventDate = new Date(event.date);
            const isPastEvent = eventDate < new Date();

            return (
              <Grid item xs={12} md={6} lg={4} key={event.id}>
                <Card>
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                      <Typography variant="h6" component="h2">
                        {event.title}
                      </Typography>
                      <Chip
                        label={getEventTypeLabel(event.type)}
                        color={getEventTypeColor(event.type)}
                        size="small"
                      />
                    </Box>

                    {event.description && (
                      <Typography variant="body2" color="textSecondary" paragraph>
                        {event.description}
                      </Typography>
                    )}

                    <Box mb={1}>
                      <Typography variant="body2" color="textSecondary">
                        <strong>Data:</strong> {eventDate.toLocaleDateString('pt-BR')}
                      </Typography>
                    </Box>

                    {event.location && (
                      <Box mb={1}>
                        <Typography variant="body2" color="textSecondary">
                          <strong>Local:</strong> {event.location}
                        </Typography>
                      </Box>
                    )}

                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Chip
                        label={attendanceStatus.label}
                        color={attendanceStatus.color}
                        size="small"
                      />
                      {event.maxAttendees && (
                        <Typography variant="caption" color="textSecondary">
                          Máx: {event.maxAttendees} pessoas
                        </Typography>
                      )}
                    </Box>
                  </CardContent>

                  {!isPastEvent && (
                    <CardActions>
                      <Button
                        size="small"
                        startIcon={<CheckCircle />}
                        color="success"
                        onClick={() => handleAttendance(event.id, event.title, true)}
                        disabled={event.myAttendance?.confirmed === true}
                      >
                        Confirmar
                      </Button>
                      <Button
                        size="small"
                        startIcon={<Cancel />}
                        color="error"
                        onClick={() => handleAttendance(event.id, event.title, false)}
                        disabled={event.myAttendance?.confirmed === false}
                      >
                        Negar
                      </Button>
                    </CardActions>
                  )}
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Dialog de confirmação */}
      <Dialog open={confirmDialog.open} onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}>
        <DialogTitle>
          {confirmDialog.confirmed ? 'Confirmar Presença' : 'Negar Presença'}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {confirmDialog.confirmed
              ? `Tem certeza que deseja confirmar sua presença no evento "${confirmDialog.eventTitle}"?`
              : `Tem certeza que deseja negar sua presença no evento "${confirmDialog.eventTitle}"?`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}>
            Cancelar
          </Button>
          <Button
            onClick={confirmAttendance}
            variant="contained"
            color={confirmDialog.confirmed ? 'success' : 'error'}
          >
            {confirmDialog.confirmed ? 'Confirmar' : 'Negar'}
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

export default MyEventsPage;
