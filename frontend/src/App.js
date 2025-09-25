import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './App.css';

// Import shadcn components
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Avatar, AvatarFallback } from './components/ui/avatar';
import { Alert, AlertDescription } from './components/ui/alert';
import { Switch } from './components/ui/switch';
import { Separator } from './components/ui/separator';
import { 
  AlertCircle, Package, Users, FileText, BarChart3, Search, Menu, LogOut, 
  ShoppingCart, Plus, Eye, Settings, CheckCircle, XCircle, Target,
  TrendingUp, Activity, Server, Wifi, WifiOff
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = React.createContext();

const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth Provider
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('access_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      if (token) {
        try {
          const response = await axios.get(`${API}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUser(response.data);
        } catch (error) {
          localStorage.removeItem('access_token');
          setToken(null);
        }
      }
      setLoading(false);
    };
    
    initAuth();
  }, [token]);

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { email, password });
      const { access_token, role, full_name } = response.data;
      
      localStorage.setItem('access_token', access_token);
      setToken(access_token);
      setUser({ email, role, full_name });
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Error de login' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Login Component
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(email, password);
    
    if (result.success) {
      navigate('/', { replace: true });
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl border-0 bg-white/90 backdrop-blur-sm">
          <CardHeader className="text-center pb-8">
            <div className="w-20 h-20 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl mx-auto mb-6 flex items-center justify-center">
              <Package className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold text-gray-800 mb-2">
              Difratti Sales
            </CardTitle>
            <p className="text-gray-600 text-lg">Portal de Ventas</p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span className="text-red-700">{error}</span>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Email
                </label>
                <Input
                  type="email"
                  placeholder="admin@difratti.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 text-lg bg-white/70 border-2 border-gray-200 focus:border-emerald-400 transition-colors"
                  data-testid="email-input"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">
                  Contraseña
                </label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 text-lg bg-white/70 border-2 border-gray-200 focus:border-emerald-400 transition-colors"
                  data-testid="password-input"
                  required
                />
              </div>
              
              <Button
                type="submit"
                className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                disabled={loading}
                data-testid="login-button"
              >
                {loading ? 'Ingresando...' : 'Ingresar'}
              </Button>
            </form>
            
            <div className="text-center text-sm text-gray-500 border-t pt-6">
              <p className="mb-2">Credenciales de prueba:</p>
              <div className="space-y-1">
                <p><strong>Admin:</strong> admin@difratti.com / admin123</p>
                <p><strong>Vendedor:</strong> vendedor@difratti.com / vendedor123</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// SAP Configuration Component (Admin only)
const SAPConfiguration = () => {
  const { user } = useAuth();
  const [config, setConfig] = useState(null);
  const [testConfig, setTestConfig] = useState({
    b1_host: '',
    b1_company_db: '',
    b1_username: '',
    b1_password: '',
    b1_ssl_verify: true,
    b1_timeout_ms: 60000
  });
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    loadSAPConfig();
  }, []);

  const loadSAPConfig = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`${API}/sap/config`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConfig(response.data);
      setTestConfig({
        b1_host: response.data.b1_host || '',
        b1_company_db: response.data.b1_company_db || '',
        b1_username: response.data.b1_username || '',
        b1_password: '',
        b1_ssl_verify: response.data.b1_ssl_verify !== false,
        b1_timeout_ms: response.data.b1_timeout_ms || 60000
      });
    } catch (error) {
      console.error('Error loading SAP config:', error);
    }
  };

  const testConnection = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.post(`${API}/sap/test-connection`, testConfig, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTestResult(response.data);
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Error de conexión',
        error: error.response?.data?.detail || error.message
      });
    }
    setTestLoading(false);
  };

  const saveConfiguration = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      await axios.post(`${API}/sap/config`, testConfig, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Configuración guardada exitosamente');
      loadSAPConfig();
    } catch (error) {
      alert('Error al guardar configuración: ' + (error.response?.data?.detail || error.message));
    }
    setLoading(false);
  };

  const toggleSAPMode = async (activate) => {
    try {
      const token = localStorage.getItem('access_token');
      const endpoint = activate ? '/sap/activate' : '/sap/deactivate';
      const response = await axios.post(`${API}${endpoint}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert(response.data.message);
      loadSAPConfig();
    } catch (error) {
      alert('Error al cambiar modo SAP: ' + (error.response?.data?.detail || error.message));
    }
  };

  if (!config) return <div>Cargando configuración...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Configuración SAP B1</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">Modo:</span>
          <Badge variant={config.sap_mode === 'real' ? 'default' : 'secondary'}>
            {config.sap_mode === 'real' ? 'SAP Real' : 'Mock/Simulado'}
          </Badge>
          <div className="flex items-center gap-2">
            {config.connection_status === 'connected' ? (
              <Wifi className="w-5 h-5 text-emerald-500" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-500" />
            )}
            <span className="text-sm capitalize">{config.connection_status}</span>
          </div>
        </div>
      </div>

      {/* Connection Status Alert */}
      {config.connection_status === 'error' && (
        <Alert className="border-red-200 bg-red-50">
          <XCircle className="h-4 w-4 text-red-500" />
          <AlertDescription className="text-red-700">
            Error de conexión con SAP. Verifique las credenciales y la configuración de red.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            Credenciales SAP Business One
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Host del Service Layer</label>
              <Input
                placeholder="https://server:50000/b1s/v1"
                value={testConfig.b1_host}
                onChange={(e) => setTestConfig({...testConfig, b1_host: e.target.value})}
                className="font-mono text-sm"
                data-testid="sap-host-input"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Base de Datos</label>
              <Input
                placeholder="SBODemoUS"
                value={testConfig.b1_company_db}
                onChange={(e) => setTestConfig({...testConfig, b1_company_db: e.target.value})}
                data-testid="sap-db-input"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Usuario SAP</label>
              <Input
                placeholder="manager"
                value={testConfig.b1_username}
                onChange={(e) => setTestConfig({...testConfig, b1_username: e.target.value})}
                data-testid="sap-user-input"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Contraseña SAP</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={testConfig.b1_password}
                onChange={(e) => setTestConfig({...testConfig, b1_password: e.target.value})}
                data-testid="sap-password-input"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Timeout (ms)</label>
              <Input
                type="number"
                value={testConfig.b1_timeout_ms}
                onChange={(e) => setTestConfig({...testConfig, b1_timeout_ms: parseInt(e.target.value)})}
                min="5000"
                max="300000"
                step="1000"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                <Switch
                  checked={testConfig.b1_ssl_verify}
                  onCheckedChange={(checked) => setTestConfig({...testConfig, b1_ssl_verify: checked})}
                />
                Verificar SSL
              </label>
            </div>
          </div>

          {/* Test Result */}
          {testResult && (
            <Alert className={testResult.success ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}>
              {testResult.success ? (
                <CheckCircle className="h-4 w-4 text-emerald-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <AlertDescription className={testResult.success ? "text-emerald-700" : "text-red-700"}>
                {testResult.message}
                {testResult.error && <div className="mt-2 text-xs">{testResult.error}</div>}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3 pt-4 border-t">
            <Button 
              onClick={testConnection} 
              disabled={testLoading}
              variant="outline"
              className="flex-1"
              data-testid="test-connection-btn"
            >
              {testLoading ? 'Probando...' : 'Probar Conexión'}
            </Button>
            
            <Button 
              onClick={saveConfiguration} 
              disabled={loading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              data-testid="save-config-btn"
            >
              {loading ? 'Guardando...' : 'Guardar Configuración'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Mode Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Control de Modo SAP
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold">
                {config.sap_mode === 'real' ? 'Modo Real Activado' : 'Modo Simulación Activado'}
              </p>
              <p className="text-sm text-gray-600">
                {config.sap_mode === 'real' 
                  ? 'Usando conexión real a SAP Business One'
                  : 'Usando datos simulados para pruebas'
                }
              </p>
            </div>
            <div className="flex gap-2">
              {config.sap_mode === 'real' ? (
                <Button 
                  onClick={() => toggleSAPMode(false)}
                  variant="outline"
                  data-testid="deactivate-sap-btn"
                >
                  Desactivar SAP
                </Button>
              ) : (
                <Button 
                  onClick={() => toggleSAPMode(true)}
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={!testResult?.success}
                  data-testid="activate-sap-btn"
                >
                  Activar SAP Real
                </Button>
              )}
            </div>
          </div>
          
          {config.sap_mode === 'mock' && (
            <Alert className="mt-4 border-amber-200 bg-amber-50">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-amber-700">
                Para activar el modo real, primero debe probar y guardar una configuración válida.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Dashboard Component
const Dashboard = () => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [inventory, setInventory] = useState({ items: [], total: 0 });
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`${API}/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadInventory = async (search = '') => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`${API}/inventory?search=${search}&page=1&page_size=20`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInventory(response.data);
    } catch (error) {
      console.error('Error loading inventory:', error);
    }
    setLoading(false);
  };

  const loadCustomers = async (search = '') => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`${API}/customers?search=${search}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCustomers(response.data.customers || []);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
    setLoading(false);
  };

  const createSampleOrder = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const orderData = {
        external_id: `WEB-${Date.now()}`,
        card_code: user.role === 'seller' ? 'C20003' : 'C20001',
        doc_date: new Date().toISOString().split('T')[0],
        doc_due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        salesperson_code: user.role === 'admin' ? 1 : (stats?.user_role === 'seller' ? 3 : 1),
        comments: 'Pedido de prueba desde portal',
        lines: [
          {
            item_code: 'A00001',
            description: 'Laptop HP Pavilion 15',
            quantity: 1,
            unit_price: 8500.00,
            discount_pct: 0,
            warehouse_code: '01',
            tax_code: 'IVA',
            line_total: 8500.00
          }
        ]
      };
      
      const response = await axios.post(`${API}/orders`, orderData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert(`Pedido creado: ${response.data.external_id}`);
      loadDashboardStats();
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Error al crear pedido');
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchQuery('');
    
    if (tab === 'inventory') {
      loadInventory();
    } else if (tab === 'customers') {
      loadCustomers();
    }
  };

  const handleSearch = () => {
    if (activeTab === 'inventory') {
      loadInventory(searchQuery);
    } else if (activeTab === 'customers') {
      loadCustomers(searchQuery);
    }
  };

  // Render different dashboards based on user role
  const renderDashboard = () => {
    if (user.role === 'seller') {
      return (
        <div className="space-y-6">
          {/* Seller KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100">Ventas del Mes</p>
                    <p className="text-3xl font-bold">Q{stats?.monthly_sales?.toLocaleString() || '0'}</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-blue-200" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-emerald-100">Meta Mensual</p>
                    <p className="text-3xl font-bold">Q{stats?.monthly_target?.toLocaleString() || '0'}</p>
                  </div>
                  <Target className="w-8 h-8 text-emerald-200" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100">% de Meta</p>
                    <p className="text-3xl font-bold">{Math.round(stats?.target_progress || 0)}%</p>
                  </div>
                  <Activity className="w-8 h-8 text-purple-200" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-amber-500 to-amber-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-amber-100">Mis Clientes</p>
                    <p className="text-3xl font-bold">{stats?.customer_count || 0}</p>
                  </div>
                  <Users className="w-8 h-8 text-amber-200" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Seller Progress */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Progreso de Meta
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span>Progreso actual</span>
                    <span>{Math.round(stats?.target_progress || 0)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-emerald-500 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(stats?.target_progress || 0, 100)}%` }}
                    ></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Vendido</p>
                      <p className="font-semibold">Q{stats?.monthly_sales?.toLocaleString() || '0'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Restante</p>
                      <p className="font-semibold">Q{Math.max(0, (stats?.monthly_target || 0) - (stats?.monthly_sales || 0)).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Mis Pedidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(stats?.order_stats || {}).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          status === 'synced' ? 'default' : 
                          status === 'error' ? 'destructive' : 
                          'secondary'
                        }>
                          {status === 'synced' ? 'Sincronizado' : 
                           status === 'queued' ? 'En Cola' :
                           status === 'error' ? 'Error' :
                           status === 'draft' ? 'Borrador' :
                           status}
                        </Badge>
                      </div>
                      <span className="font-semibold">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    } else {
      // Admin dashboard
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100">Ventas del Mes</p>
                    <p className="text-3xl font-bold">Q{stats?.monthly_sales?.toLocaleString() || '0'}</p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-blue-200" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-emerald-100">Total Clientes</p>
                    <p className="text-3xl font-bold">{stats?.customer_count || 0}</p>
                  </div>
                  <Users className="w-8 h-8 text-emerald-200" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100">Vendedores</p>
                    <p className="text-3xl font-bold">{stats?.sellers_count || 0}</p>
                  </div>
                  <Users className="w-8 h-8 text-purple-200" />
                </div>
              </CardContent>
            </Card>
            
            <Card className="bg-gradient-to-r from-amber-500 to-amber-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-amber-100">Pendientes</p>
                    <p className="text-3xl font-bold">{stats?.pending_sync || 0}</p>
                  </div>
                  <AlertCircle className="w-8 h-8 text-amber-200" />
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Estado de Pedidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(stats?.order_stats || {}).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          status === 'synced' ? 'default' : 
                          status === 'error' ? 'destructive' : 
                          'secondary'
                        }>
                          {status === 'synced' ? 'Sincronizado' : 
                           status === 'queued' ? 'En Cola' :
                           status === 'error' ? 'Error' :
                           status === 'draft' ? 'Borrador' :
                           status}
                        </Badge>
                      </div>
                      <span className="font-semibold">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="w-5 h-5" />
                  Estado SAP
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Modo:</span>
                  <Badge variant={stats?.sap_mode === 'real' ? 'default' : 'secondary'}>
                    {stats?.sap_mode === 'real' ? 'SAP Real' : 'Simulación'}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Estado:</span>
                  <div className="flex items-center gap-2">
                    {stats?.sap_status === 'connected' ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className="text-sm capitalize">{stats?.sap_status || 'unknown'}</span>
                  </div>
                </div>
                
                <Separator />
                
                <Button 
                  onClick={createSampleOrder}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  data-testid="create-sample-order"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Pedido de Prueba
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Difratti Sales</h1>
                <p className="text-sm text-gray-500">Sistema de Ventas</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className={`${user?.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {user?.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{user?.full_name}</p>
                  <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="text-gray-500 hover:text-gray-700"
                data-testid="logout-button"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          {/* Tab Navigation */}
          <TabsList className={`grid w-full ${user?.role === 'admin' ? 'grid-cols-5' : 'grid-cols-4'} bg-white shadow-sm h-12`}>
            <TabsTrigger value="dashboard" className="flex items-center gap-2 h-10" data-testid="dashboard-tab">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center gap-2 h-10" data-testid="inventory-tab">
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">Inventario</span>
            </TabsTrigger>
            <TabsTrigger value="customers" className="flex items-center gap-2 h-10" data-testid="customers-tab">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Clientes</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2 h-10" data-testid="orders-tab">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Pedidos</span>
            </TabsTrigger>
            {user?.role === 'admin' && (
              <TabsTrigger value="sap-config" className="flex items-center gap-2 h-10" data-testid="sap-config-tab">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">SAP Config</span>
              </TabsTrigger>
            )}
          </TabsList>

          {/* Search Bar */}
          {(activeTab === 'inventory' || activeTab === 'customers') && (
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder={`Buscar ${activeTab === 'inventory' ? 'productos' : 'clientes'}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10 h-12 bg-white"
                  data-testid="search-input"
                />
              </div>
              <Button onClick={handleSearch} className="h-12 px-6" data-testid="search-button">
                Buscar
              </Button>
            </div>
          )}

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6" data-testid="dashboard-content">
            {renderDashboard()}
          </TabsContent>

          {/* Inventory Tab */}
          <TabsContent value="inventory" className="space-y-4" data-testid="inventory-content">
            <div className="grid gap-4">
              {loading ? (
                <div className="text-center py-8">Cargando inventario...</div>
              ) : (
                inventory.items.map((item) => (
                  <Card key={item.ItemCode} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{item.ItemName}</h3>
                          <p className="text-gray-600">Código: {item.ItemCode}</p>
                          <p className="text-sm text-gray-500">UOM: {item.UOM}</p>
                          {item.Stock !== undefined && (
                            <p className="text-sm text-gray-500">Stock: {item.Stock} unidades</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={item.IsActive ? 'default' : 'secondary'}>
                            {item.IsActive ? 'Activo' : 'Inactivo'}
                          </Badge>
                          <Button size="sm" variant="outline" data-testid={`view-item-${item.ItemCode}`}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
              
              {!loading && inventory.items.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No se encontraron productos
                </div>
              )}
            </div>
          </TabsContent>

          {/* Customers Tab */}
          <TabsContent value="customers" className="space-y-4" data-testid="customers-content">
            <div className="grid gap-4">
              {loading ? (
                <div className="text-center py-8">Cargando clientes...</div>
              ) : (
                customers.map((customer) => (
                  <Card key={customer.CardCode} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{customer.CardName}</h3>
                          <p className="text-gray-600">Código: {customer.CardCode}</p>
                          {customer.Phone1 && (
                            <p className="text-sm text-gray-500">Tel: {customer.Phone1}</p>
                          )}
                          {user?.role === 'admin' && customer.SalesPersonCode && (
                            <p className="text-sm text-gray-500">Vendedor: {customer.SalesPersonCode}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold text-emerald-600">
                            Q{customer.Balance?.toLocaleString() || '0.00'}
                          </p>
                          <p className="text-sm text-gray-500">
                            Lista: {customer.PriceListNum || 'N/A'}
                          </p>
                          <Button size="sm" variant="outline" className="mt-2" data-testid={`view-customer-${customer.CardCode}`}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
              
              {!loading && customers.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No se encontraron clientes
                </div>
              )}
            </div>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4" data-testid="orders-content">
            <Card>
              <CardHeader>
                <CardTitle>Gestión de Pedidos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-4">
                  Esta sección permite crear y gestionar pedidos que se sincronizan con SAP Business One.
                </p>
                <Button 
                  onClick={createSampleOrder}
                  className="bg-emerald-600 hover:bg-emerald-700"
                  data-testid="create-order-button"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Pedido
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SAP Configuration Tab (Admin only) */}
          {user?.role === 'admin' && (
            <TabsContent value="sap-config" className="space-y-4" data-testid="sap-config-content">
              <SAPConfiguration />
            </TabsContent>
          )}
        </Tabs>
      </main>
    </div>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  return user ? children : <Navigate to="/login" replace />;
};

// Main App Component
function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;