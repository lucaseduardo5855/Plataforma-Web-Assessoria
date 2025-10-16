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
  Modal,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Person,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { authService, userService } from '../../services/api';
import { User } from '../../types';

const StudentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<User | null>(null);
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
    name: '',
    email: '',
    password: '',
    phone: '',
    birthDate: '',
  });

    useEffect(() => {
            fetchStudents();
  }, []);

    const fetchStudents = async () => {
        try {
      console.log('=== BUSCANDO ALUNOS ===');
      
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
      
      console.log('Alunos carregados:', studentsData.length);
      setStudents(studentsData);
      setError(null);
        } catch (err: any) {
      console.error('=== ERRO AO BUSCAR ALUNOS ===');
      console.error('Erro completo:', err);
      console.error('Status:', err.status);
      console.error('Mensagem:', err.message);
      
      setError('Erro ao carregar alunos: ' + err.message);
    } finally {
        setLoading(false);
    }
};
    
  const handleCreateStudent = async () => {
    if (!validateForm()) return;
    
    try {
      console.log('=== CADASTRANDO ALUNO ===');
      console.log('Dados do aluno:', formData);
      console.log('Token atual:', localStorage.getItem('token'));
      
      // Verificar se há token válido
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token de autenticação não encontrado. Faça login novamente.');
      }
      
      // Fazer requisição direta para cadastrar aluno
      const response = await fetch('http://localhost:5000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          role: 'STUDENT'
        })
      });
      
      console.log('Status da resposta:', response.status);
      console.log('Headers da resposta:', response.headers);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro da resposta:', errorText);
        
        if (response.status === 401) {
          // Limpar token inválido e redirecionar para login
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          throw new Error('Sessão expirada. Redirecionando para login...');
        } else if (response.status === 400) {
          throw new Error('Dados inválidos. Verifique os campos preenchidos.');
        } else {
          throw new Error(`Erro do servidor: ${response.status} - ${errorText}`);
        }
      }
      
      const result = await response.json();
      console.log('Aluno cadastrado:', result);
      
      // Fechar modal e limpar formulário primeiro
        setIsModalOpen(false);
      resetForm();
      
      // Mostrar notificação de sucesso
      setSnackbar({ open: true, message: 'Aluno cadastrado com sucesso!', severity: 'success' });
      
      // Recarregar a lista imediatamente após sucesso
      try {
        console.log('=== RECARREGANDO LISTA APÓS CADASTRO ===');
        await fetchStudents();
        console.log('Lista de alunos recarregada após cadastro');
      } catch (error) {
        console.error('Erro ao recarregar lista:', error);
      }
      
    } catch (err: any) {
      console.error('=== ERRO AO CADASTRAR ALUNO ===');
      console.error('Erro completo:', err);
      console.error('Status:', err.status);
      console.error('Mensagem:', err.message);
      
      setSnackbar({ 
        open: true, 
        message: 'Erro ao cadastrar aluno: ' + err.message, 
        severity: 'error' 
      });
    }
  };

  const handleEditStudent = async () => {
    if (!validateForm() || !selectedStudent) return;
    
    try {
      console.log('=== EDITANDO ALUNO ===');
      console.log('ID do aluno:', selectedStudent.id);
      console.log('Dados atualizados:', formData);
      
      // Criar dados de atualização
      const updateData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        birthDate: formData.birthDate
      };
      
      // Como não há endpoint específico para admin editar outros usuários,
      // vamos usar uma abordagem temporária: atualizar apenas os campos básicos
      // que são suportados pelo schema de validação
      const validUpdateData = {
        name: updateData.name,
        phone: updateData.phone,
        birthDate: updateData.birthDate
        // Removendo email pois pode causar conflitos
      };
      
      console.log('Dados válidos para atualização:', validUpdateData);
      
      // Implementar edição real usando endpoint correto
      console.log('=== EDITANDO ALUNO ===');
      console.log('ID do aluno:', selectedStudent.id);
      console.log('Dados para atualização:', validUpdateData);
      
      const response = await fetch(`http://localhost:5000/api/users/students/${selectedStudent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(validUpdateData)
      });
      
      console.log('Status da resposta:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro da resposta:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }
      
      const result = await response.json();
      console.log('Aluno atualizado:', result);
      
      setSnackbar({ open: true, message: 'Aluno atualizado com sucesso!', severity: 'success' });
      setIsEditModalOpen(false);
      setSelectedStudent(null);
      resetForm();
      await fetchStudents();
      
    } catch (err: any) {
      console.error('=== ERRO AO EDITAR ALUNO ===');
      console.error('Erro completo:', err);
      console.error('Status:', err.status);
      console.error('Mensagem:', err.message);
      
      setSnackbar({ 
        open: true, 
        message: 'Erro ao atualizar aluno: ' + err.message, 
        severity: 'error' 
      });
    }
  };

  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;
    
    try {
      console.log('=== EXCLUINDO ALUNO ===');
      console.log('ID do aluno:', studentToDelete.id);
      
      const response = await fetch(`http://localhost:5000/api/users/students/${studentToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      console.log('Status da resposta:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      setSnackbar({ open: true, message: 'Aluno excluído com sucesso!', severity: 'success' });
      setDeleteDialogOpen(false);
      setStudentToDelete(null);
      await fetchStudents();
    } catch (err: any) {
      console.error('=== ERRO AO EXCLUIR ALUNO ===');
      console.error('Erro completo:', err);
      
      setSnackbar({ 
        open: true, 
        message: 'Erro ao excluir aluno: ' + err.message, 
        severity: 'error' 
      });
    }
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setSnackbar({ open: true, message: 'Nome é obrigatório', severity: 'error' });
      return false;
    }
    if (!formData.email.trim()) {
      setSnackbar({ open: true, message: 'Email é obrigatório', severity: 'error' });
      return false;
    }
    if (!formData.password.trim() && !selectedStudent) {
      setSnackbar({ open: true, message: 'Senha é obrigatória', severity: 'error' });
      return false;
    }
    return true;
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      phone: '',
      birthDate: '',
    });
  };

  const openEditModal = (student: User) => {
    setSelectedStudent(student);
    setFormData({
      name: student.name || '',
      email: student.email || '',
      password: '',
      phone: student.phone || '',
      birthDate: student.birthDate ? new Date(student.birthDate).toISOString().split('T')[0] : '',
    });
    setIsEditModalOpen(true);
  };

  const openDeleteDialog = (student: User) => {
    setStudentToDelete(student);
    setDeleteDialogOpen(true);
  };

    const renderStudentsTable = () => {
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
              <TableCell>Nome</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Telefone</TableCell>
              <TableCell>Data de Nascimento</TableCell>
              <TableCell align="center">Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
            {students && students.length > 0 ? (
              students.map((student: any) => (
                <TableRow key={student.id}>
                                <TableCell>{student.name}</TableCell>
                                <TableCell>{student.email}</TableCell>
                  <TableCell>{student.phone || 'Não informado'}</TableCell>
                                <TableCell>
                    {student.birthDate ? new Date(student.birthDate).toLocaleDateString('pt-BR') : 'Não informado'}
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title="Editar">
                      <IconButton
                        color="primary"
                        onClick={() => openEditModal(student)}
                        size="small"
                      >
                        <Edit />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Excluir">
                      <IconButton
                        color="error"
                        onClick={() => openDeleteDialog(student)}
                        size="small"
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
                    <Person sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="body1" color="text.secondary">
                      Nenhum aluno cadastrado ainda.
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
                    Gerenciar Alunos
                </Typography>
                <Button 
                    variant="contained" 
                    startIcon={<Add />}
                    onClick={() => setIsModalOpen(true)}
                >
                    Cadastrar Aluno
                </Button>
            </Box>

                    {renderStudentsTable()}

            {/* Modal de Cadastro */}
      <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Cadastrar Novo Aluno</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} pt={1}>
            <TextField
              label="Nome *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
            />
            <TextField
              label="Email *"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              fullWidth
            />
            <TextField
              label="Senha *"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              fullWidth
            />
            <TextField
              label="Telefone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              fullWidth
            />
            <TextField
              label="Data de Nascimento"
              type="date"
              value={formData.birthDate}
              onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
                            fullWidth 
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleCreateStudent} variant="contained">
                            Salvar Aluno
                        </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Edição */}
      <Dialog open={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Editar Aluno</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} pt={1}>
            <TextField
              label="Nome *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
            />
            <TextField
              label="Email *"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              fullWidth
            />
            <TextField
              label="Nova Senha (deixe em branco para manter a atual)"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              fullWidth
            />
            <TextField
              label="Telefone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              fullWidth
            />
            <TextField
              label="Data de Nascimento"
              type="date"
              value={formData.birthDate}
              onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
                    </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsEditModalOpen(false)}>Cancelar</Button>
          <Button onClick={handleEditStudent} variant="contained">
            Salvar Alterações
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir o aluno "{studentToDelete?.name}"?
            Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleDeleteStudent} color="error" variant="contained">
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

export default StudentsPage;