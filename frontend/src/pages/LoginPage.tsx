import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Container,
  Paper,
  InputAdornment,
  IconButton,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Email,
  Lock,
  Visibility,
  VisibilityOff,
  FitnessCenter,
  WhatsApp,
  LockReset,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const { login, error, clearError } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearError();

    try {
      await login(email, password);
      console.log('Login realizado com sucesso');
      
      // Aguardar um momento para garantir que o estado foi atualizado
      setTimeout(() => {
        // O redirecionamento será feito automaticamente pelo PublicRoute
        // Mas vamos forçar navegação se necessário
        const userStr = localStorage.getItem('user');
        if (userStr) {
          try {
            const user = JSON.parse(userStr);
            console.log('Usuário após login:', user);
            console.log('Role do usuário:', user.role);
            
            if (user.role === 'ADMIN' || user.role === 'admin') {
              console.log('Redirecionando para /admin');
              navigate('/admin', { replace: true });
            } else {
              console.log('Redirecionando para /dashboard');
              navigate('/dashboard', { replace: true });
            }
          } catch (err) {
            console.error('Erro ao parsear usuário:', err);
          }
        } else {
          console.error('Usuário não encontrado no localStorage após login');
        }
      }, 200);
    } catch (error) {
      console.error('Erro no login:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleForgotPassword = async () => {
    if (!forgotPasswordEmail || !forgotPasswordEmail.includes('@')) {
      setForgotPasswordMessage({ type: 'error', text: 'Por favor, insira um email válido.' });
      return;
    }

    setForgotPasswordLoading(true);
    setForgotPasswordMessage(null);

    try {
      const response = await fetch('http://localhost:5000/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: forgotPasswordEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        setForgotPasswordMessage({ 
          type: 'success', 
          text: 'Instruções para redefinir sua senha foram enviadas para seu email. Verifique sua caixa de entrada.' 
        });
        setTimeout(() => {
          setForgotPasswordOpen(false);
          setForgotPasswordEmail('');
          setForgotPasswordMessage(null);
        }, 3000);
      } else {
        setForgotPasswordMessage({ 
          type: 'error', 
          text: data.error || 'Erro ao solicitar recuperação de senha. Tente novamente ou entre em contato com o suporte.' 
        });
      }
    } catch (error) {
      setForgotPasswordMessage({ 
        type: 'error', 
        text: 'Erro ao conectar com o servidor. Verifique sua conexão ou entre em contato com o suporte via WhatsApp.' 
      });
    } finally {
      setForgotPasswordLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
        background: 'linear-gradient(135deg, #081F3E 0%, #0A2548 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Container maxWidth="sm">
        <Paper
          elevation={24}
          sx={{
            p: 4,
            borderRadius: 3,
            background: 'rgba(8, 31, 62, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          {/* Logo e título */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2,
              }}
            >
              <FitnessCenter
                sx={{
                  fontSize: 48,
                  color: '#FFEA00',
                  mr: 1,
                }}
              />
              <Typography
                variant="h4"
                component="h1"
                sx={{
                  fontWeight: 'bold',
                  color: '#FFEA00',
                  fontFamily: 'Poppins, sans-serif',
                }}
              >
                Z4 Performance
              </Typography>
            </Box>
            <Typography
              variant="h6"
              sx={{ 
                fontWeight: 400,
                color: 'rgba(255, 255, 255, 0.8)',
              }}
            >
              Sistema de Assessoria Esportiva
            </Typography>
          </Box>

          {/* Formulário de login */}
          <Card sx={{ boxShadow: 'none', backgroundColor: 'transparent' }}>
            <CardContent sx={{ p: 0 }}>
              <form onSubmit={handleSubmit}>
                <Box sx={{ mb: 3 }}>
                  <TextField
                    fullWidth
                    label=""
                    placeholder="Seu email de acesso"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Email sx={{ color: '#FFEA00' }} />
                        </InputAdornment>
                      ),
                    }}
                    InputLabelProps={{
                      sx: {
                        color: '#FFEA00 !important',
                        fontWeight: 600,
                        fontSize: '1.1rem',
                      }
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        backgroundColor: 'rgba(0, 0, 0, 0.3)',
                        color: 'white',
                        '&:hover': {
                          backgroundColor: 'rgba(0, 0, 0, 0.3)',
                        },
                        '&.Mui-focused': {
                          backgroundColor: 'rgba(0, 0, 0, 0.3)',
                        },
                        '& fieldset': {
                          borderColor: 'rgba(255, 255, 255, 0.3)',
                        },
                        '&:hover fieldset': {
                          borderColor: 'rgba(255, 255, 255, 0.5)',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#FFEA00',
                        },
                        '& input': {
                          color: 'white',
                        },
                      },
                      '& label': {
                        color: '#FFEA00 !important',
                        fontWeight: 600,
                        fontSize: '1.1rem',
                      },
                      '& label.Mui-focused': {
                        color: '#FFEA00 !important',
                        fontSize: '1.1rem',
                      },
                      '& label.MuiInputLabel-shrink': {
                        fontSize: '1.1rem',
                      },
                    }}
                  />
                </Box>

                <Box sx={{ mb: 3 }}>
                  <TextField
                    fullWidth
                    label=""
                    placeholder="Sua senha de acesso"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock sx={{ color: '#FFEA00' }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label="toggle password visibility"
                            onClick={handleShowPassword}
                            edge="end"
                            disabled={loading}
                            sx={{ color: '#FFEA00' }}
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                    InputLabelProps={{
                      sx: {
                        color: '#FFEA00 !important',
                        fontWeight: 600,
                        fontSize: '1.1rem',
                      }
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        backgroundColor: 'rgba(0, 0, 0, 0.3)',
                        color: 'white',
                        '&:hover': {
                          backgroundColor: 'rgba(0, 0, 0, 0.3)',
                        },
                        '&.Mui-focused': {
                          backgroundColor: 'rgba(0, 0, 0, 0.3)',
                        },
                        '& fieldset': {
                          borderColor: 'rgba(255, 255, 255, 0.3)',
                        },
                        '&:hover fieldset': {
                          borderColor: 'rgba(255, 255, 255, 0.5)',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#FFEA00',
                        },
                        '& input': {
                          color: 'white',
                        },
                      },
                      '& label': {
                        color: '#FFEA00 !important',
                        fontWeight: 600,
                        fontSize: '1.1rem',
                      },
                      '& label.Mui-focused': {
                        color: '#FFEA00 !important',
                        fontSize: '1.1rem',
                      },
                      '& label.MuiInputLabel-shrink': {
                        fontSize: '1.1rem',
                      },
                    }}
                  />
                </Box>

                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading}
                  sx={{
                    py: 1.5,
                    borderRadius: 2,
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    background: '#FFEA00',
                    color: '#081F3E',
                    '&:hover': {
                      background: '#E6D300',
                    },
                    '&:disabled': {
                      background: 'rgba(255, 234, 0, 0.3)',
                      color: 'rgba(255, 255, 255, 0.5)',
                    },
                  }}
                >
                  {loading ? 'Entrando...' : 'Entrar'}
                </Button>

                {/* Links de ajuda */}
                <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center' }}>
                  <Link
                    href="https://wa.me/5543996905705?text=Olá,%20preciso%20de%20suporte%20com%20o%20sistema%20Z4%20Performance"
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      color: '#FFEA00',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      fontSize: '0.9rem',
                      '&:hover': {
                        textDecoration: 'underline',
                        color: '#E6D300',
                      },
                    }}
                  >
                    <WhatsApp sx={{ fontSize: 20 }} />
                    Contate o suporte
                  </Link>
                  <Link
                    component="button"
                    variant="body2"
                    onClick={() => setForgotPasswordOpen(true)}
                    sx={{
                      color: 'rgba(255, 255, 255, 0.7)',
                      textDecoration: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      fontSize: '0.85rem',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      '&:hover': {
                        textDecoration: 'underline',
                        color: '#FFEA00',
                      },
                    }}
                  >
                    <LockReset sx={{ fontSize: 18 }} />
                    Esqueci minha senha
                  </Link>
                </Box>
              </form>
            </CardContent>
          </Card>

          {/* Informações adicionais */}
          <Box sx={{ mt: 4, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
              Acesso restrito a alunos e administradores cadastrados
            </Typography>
          </Box>
        </Paper>
      </Container>

      {/* Dialog de Esqueci Minha Senha */}
      <Dialog 
        open={forgotPasswordOpen} 
        onClose={() => {
          setForgotPasswordOpen(false);
          setForgotPasswordEmail('');
          setForgotPasswordMessage(null);
        }}
        PaperProps={{
          sx: {
            backgroundColor: 'rgba(8, 31, 62, 0.95)',
            color: 'white',
            minWidth: '400px',
          }
        }}
      >
        <DialogTitle sx={{ color: '#FFEA00' }}>
          Esqueci minha senha
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)', mb: 2 }}>
            Digite seu email cadastrado e enviaremos instruções para redefinir sua senha.
          </Typography>
          <TextField
            fullWidth
            label="Email"
            type="email"
            value={forgotPasswordEmail}
            onChange={(e) => setForgotPasswordEmail(e.target.value)}
            disabled={forgotPasswordLoading}
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                color: 'white',
                '& fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                },
                '&:hover fieldset': {
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                },
                '&.Mui-focused fieldset': {
                  borderColor: '#FFEA00',
                },
              },
              '& label': {
                color: 'rgba(255, 255, 255, 0.7)',
              },
              '& label.Mui-focused': {
                color: '#FFEA00',
              },
            }}
          />
          {forgotPasswordMessage && (
            <Alert 
              severity={forgotPasswordMessage.type} 
              sx={{ mt: 2 }}
            >
              {forgotPasswordMessage.text}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button
            onClick={() => {
              setForgotPasswordOpen(false);
              setForgotPasswordEmail('');
              setForgotPasswordMessage(null);
            }}
            disabled={forgotPasswordLoading}
            sx={{ color: 'rgba(255, 255, 255, 0.7)' }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleForgotPassword}
            disabled={forgotPasswordLoading || !forgotPasswordEmail}
            variant="contained"
            sx={{
              background: '#FFEA00',
              color: '#081F3E',
              '&:hover': {
                background: '#E6D300',
              },
              '&:disabled': {
                background: 'rgba(255, 234, 0, 0.3)',
                color: 'rgba(255, 255, 255, 0.5)',
              },
            }}
          >
            {forgotPasswordLoading ? 'Enviando...' : 'Enviar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default LoginPage;
