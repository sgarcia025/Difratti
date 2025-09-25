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
import { AlertCircle, Package, Users, FileText, BarChart3, Search, Menu, LogOut, ShoppingCart, Plus, Eye } from 'lucide-react';

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
      // Navigate to dashboard on successful login
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
        card_code: 'C20001',
        doc_date: new Date().toISOString().split('T')[0],
        doc_due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        salesperson_code: user.role === 'admin' ? 1 : 3,
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
                  <AvatarFallback className="bg-emerald-100 text-emerald-700">
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
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-4 bg-white shadow-sm h-12">
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
                      <p className="text-emerald-100">Pedidos Sincronizados</p>
                      <p className="text-3xl font-bold">{stats?.order_stats?.synced || 0}</p>
                    </div>
                    <FileText className="w-8 h-8 text-emerald-200" />
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
              
              <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-100">Total Pedidos</p>
                      <p className="text-3xl font-bold">
                        {Object.values(stats?.order_stats || {}).reduce((a, b) => a + b, 0)}
                      </p>
                    </div>
                    <ShoppingCart className="w-8 h-8 text-purple-200" />
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
                          <Badge variant={status === 'synced' ? 'default' : status === 'error' ? 'destructive' : 'secondary'}>
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
                    <Package className="w-5 h-5" />
                    Acciones Rápidas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Button 
                    onClick={createSampleOrder}
                    className="w-full h-12 bg-emerald-600 hover:bg-emerald-700"
                    data-testid="create-sample-order"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Crear Pedido de Prueba
                  </Button>
                  
                  <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                    <p><strong>Modo SAP:</strong> {stats?.sap_mode || 'mock'}</p>
                    <p className="text-xs mt-1">
                      {stats?.sap_mode === 'mock' ? 'Usando datos simulados' : 'Conectado a SAP Business One'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
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