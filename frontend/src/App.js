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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Textarea } from './components/ui/textarea';
import { 
  AlertCircle, Package, Users, FileText, BarChart3, Search, Menu, LogOut, 
  ShoppingCart, Plus, Eye, Settings, CheckCircle, XCircle, Target,
  TrendingUp, Activity, Server, Wifi, WifiOff, UserPlus, Edit, Trash2,
  Quote, Calendar, Filter, ChevronDown, Send, CheckCheck, X, Clock
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

// User Management Component (Admin only)
const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'seller',
    sap_salesperson_code: '',
    monthly_target: ''
  });
  const [editingUser, setEditingUser] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`${API}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const createUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const userData = {
        ...newUser,
        sap_salesperson_code: newUser.sap_salesperson_code ? parseInt(newUser.sap_salesperson_code) : null,
        monthly_target: newUser.monthly_target ? parseFloat(newUser.monthly_target) : 0.0
      };
      
      await axios.post(`${API}/users`, userData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Usuario creado exitosamente');
      setNewUser({
        email: '',
        password: '',
        full_name: '',
        role: 'seller',
        sap_salesperson_code: '',
        monthly_target: ''
      });
      loadUsers();
    } catch (error) {
      alert('Error al crear usuario: ' + (error.response?.data?.detail || error.message));
    }
    setLoading(false);
  };

  const updateUser = async (userId, updates) => {
    try {
      const token = localStorage.getItem('access_token');
      await axios.put(`${API}/users/${userId}`, updates, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadUsers();
      setEditingUser(null);
      alert('Usuario actualizado exitosamente');
    } catch (error) {
      alert('Error al actualizar usuario: ' + (error.response?.data?.detail || error.message));
    }
  };

  const deleteUser = async (userId) => {
    if (!confirm('¿Está seguro de eliminar este usuario?')) return;
    
    try {
      const token = localStorage.getItem('access_token');
      await axios.delete(`${API}/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadUsers();
      alert('Usuario eliminado exitosamente');
    } catch (error) {
      alert('Error al eliminar usuario: ' + (error.response?.data?.detail || error.message));
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h2>
      
      {/* Create User Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Crear Nuevo Usuario
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={createUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Email</label>
                <Input
                  type="email"
                  placeholder="usuario@ejemplo.com"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Contraseña</label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Nombre Completo</label>
                <Input
                  placeholder="Juan Pérez"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({...newUser, full_name: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Rol</label>
                <Select value={newUser.role} onValueChange={(value) => setNewUser({...newUser, role: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="seller">Vendedor</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Código Vendedor SAP</label>
                <Input
                  type="number"
                  placeholder="1"
                  value={newUser.sap_salesperson_code}
                  onChange={(e) => setNewUser({...newUser, sap_salesperson_code: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Meta Mensual (GTQ)</label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="50000.00"
                  value={newUser.monthly_target}
                  onChange={(e) => setNewUser({...newUser, monthly_target: e.target.value})}
                />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
              {loading ? 'Creando...' : 'Crear Usuario'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle>Usuarios Registrados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-semibold">{user.full_name}</h3>
                  <p className="text-sm text-gray-600">{user.email}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant={user.role === 'admin' ? 'default' : user.role === 'supervisor' ? 'secondary' : 'outline'}>
                      {user.role}
                    </Badge>
                    {user.sap_salesperson_code && (
                      <Badge variant="outline">SAP: {user.sap_salesperson_code}</Badge>
                    )}
                    <Badge variant={user.is_active ? 'default' : 'destructive'}>
                      {user.is_active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingUser(user)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => deleteUser(user.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Edit User Modal would go here */}
    </div>
  );
};

// Order Form Component
const OrderForm = ({ customer, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [orderData, setOrderData] = useState({
    customer_name: customer?.CardName || '',
    card_code: customer?.CardCode || '',
    contact_person: '',
    doc_date: new Date().toISOString().split('T')[0],
    doc_due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    comments: '',
    priority: 'Normal',
    payment_terms: '',
    shipping_address: '',
    billing_address: '',
    lines: []
  });
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`${API}/inventory?page_size=100`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInventory(response.data.items || []);
    } catch (error) {
      console.error('Error loading inventory:', error);
    }
  };

  const addLine = () => {
    setOrderData({
      ...orderData,
      lines: [...orderData.lines, {
        item_code: '',
        description: '',
        quantity: 1,
        unit_price: 0,
        discount_pct: 0,
        warehouse_code: '01',
        tax_code: 'IVA',
        line_total: 0
      }]
    });
  };

  const updateLine = (index, field, value) => {
    const newLines = [...orderData.lines];
    newLines[index][field] = value;
    
    // Auto-fill description and price when item is selected
    if (field === 'item_code') {
      const item = inventory.find(i => i.ItemCode === value);
      if (item) {
        newLines[index].description = item.ItemName;
        newLines[index].unit_price = item.Price || 0;
      }
    }
    
    // Calculate line total
    if (field === 'quantity' || field === 'unit_price' || field === 'discount_pct') {
      const quantity = parseFloat(newLines[index].quantity) || 0;
      const unitPrice = parseFloat(newLines[index].unit_price) || 0;
      const discountPct = parseFloat(newLines[index].discount_pct) || 0;
      newLines[index].line_total = quantity * unitPrice * (1 - discountPct / 100);
    }
    
    setOrderData({...orderData, lines: newLines});
  };

  const removeLine = (index) => {
    const newLines = orderData.lines.filter((_, i) => i !== index);
    setOrderData({...orderData, lines: newLines});
  };

  const calculateTotals = () => {
    const subtotal = orderData.lines.reduce((sum, line) => sum + (line.line_total || 0), 0);
    const tax = subtotal * 0.12;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (orderData.lines.length === 0) {
      alert('Debe agregar al menos una línea al pedido');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.post(`${API}/orders`, orderData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert(`Pedido creado exitosamente: ${response.data.external_id}`);
      onSuccess && onSuccess();
      onClose();
    } catch (error) {
      alert('Error al crear pedido: ' + (error.response?.data?.detail || error.message));
    }
    setLoading(false);
  };

  const { subtotal, tax, total } = calculateTotals();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Crear Pedido</h2>
          <Button variant="ghost" onClick={onClose}>
            <X className="w-6 h-6" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle>Información del Cliente</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold">Cliente</label>
                <Input
                  value={orderData.customer_name}
                  onChange={(e) => setOrderData({...orderData, customer_name: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-semibold">Código Cliente</label>
                <Input
                  value={orderData.card_code}
                  onChange={(e) => setOrderData({...orderData, card_code: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-semibold">Persona Contacto</label>
                <Input
                  value={orderData.contact_person}
                  onChange={(e) => setOrderData({...orderData, contact_person: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm font-semibold">Prioridad</label>
                <Select value={orderData.priority} onValueChange={(value) => setOrderData({...orderData, priority: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Baja</SelectItem>
                    <SelectItem value="Normal">Normal</SelectItem>
                    <SelectItem value="High">Alta</SelectItem>
                    <SelectItem value="Urgent">Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Order Lines */}
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                Líneas del Pedido
                <Button type="button" onClick={addLine} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Línea
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {orderData.lines.map((line, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-7 gap-4 p-4 border rounded-lg mb-4">
                  <div>
                    <label className="text-sm font-semibold">Producto</label>
                    <Select value={line.item_code} onValueChange={(value) => updateLine(index, 'item_code', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {inventory.map((item) => (
                          <SelectItem key={item.ItemCode} value={item.ItemCode}>
                            {item.ItemCode} - {item.ItemName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold">Cantidad</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={line.quantity}
                      onChange={(e) => updateLine(index, 'quantity', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold">Precio</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={line.unit_price}
                      onChange={(e) => updateLine(index, 'unit_price', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold">Descuento %</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={line.discount_pct}
                      onChange={(e) => updateLine(index, 'discount_pct', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold">Bodega</label>
                    <Input
                      value={line.warehouse_code}
                      onChange={(e) => updateLine(index, 'warehouse_code', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold">Total</label>
                    <Input
                      value={`Q${line.line_total?.toFixed(2) || '0.00'}`}
                      disabled
                    />
                  </div>
                  <div className="flex items-end">
                    <Button type="button" variant="outline" onClick={() => removeLine(index)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {orderData.lines.length === 0 && (
                <p className="text-center text-gray-500 py-8">
                  No hay líneas agregadas. Haga clic en "Agregar Línea" para comenzar.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Totals */}
          {orderData.lines.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>Q{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IVA (12%):</span>
                    <span>Q{tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>Q{total.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit */}
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
              {loading ? 'Creando...' : 'Crear Pedido'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Quote Form Component
const QuoteForm = ({ customer, onClose, onSuccess }) => {
  const { user } = useAuth();
  const [quoteData, setQuoteData] = useState({
    customer_name: customer?.CardName || '',
    card_code: customer?.CardCode || '',
    contact_person: '',
    valid_until: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    comments: '',
    shipping_address: '',
    billing_address: '',
    lines: []
  });
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`${API}/inventory?page_size=100`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInventory(response.data.items || []);
    } catch (error) {
      console.error('Error loading inventory:', error);
    }
  };

  const addLine = () => {
    setQuoteData({
      ...quoteData,
      lines: [...quoteData.lines, {
        item_code: '',
        description: '',
        quantity: 1,
        unit_price: 0,
        discount_pct: 0,
        warehouse_code: '01',
        tax_code: 'IVA',
        line_total: 0
      }]
    });
  };

  const updateLine = (index, field, value) => {
    const newLines = [...quoteData.lines];
    newLines[index][field] = value;
    
    // Auto-fill description and price when item is selected
    if (field === 'item_code') {
      const item = inventory.find(i => i.ItemCode === value);
      if (item) {
        newLines[index].description = item.ItemName;
        newLines[index].unit_price = item.Price || 0;
      }
    }
    
    // Calculate line total
    if (field === 'quantity' || field === 'unit_price' || field === 'discount_pct') {
      const quantity = parseFloat(newLines[index].quantity) || 0;
      const unitPrice = parseFloat(newLines[index].unit_price) || 0;
      const discountPct = parseFloat(newLines[index].discount_pct) || 0;
      newLines[index].line_total = quantity * unitPrice * (1 - discountPct / 100);
    }
    
    setQuoteData({...quoteData, lines: newLines});
  };

  const removeLine = (index) => {
    const newLines = quoteData.lines.filter((_, i) => i !== index);
    setQuoteData({...quoteData, lines: newLines});
  };

  const calculateTotals = () => {
    const subtotal = quoteData.lines.reduce((sum, line) => sum + (line.line_total || 0), 0);
    const tax = subtotal * 0.12;
    const total = subtotal + tax;
    return { subtotal, tax, total };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (quoteData.lines.length === 0) {
      alert('Debe agregar al menos una línea a la cotización');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.post(`${API}/quotes`, quoteData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert(`Cotización creada exitosamente: ${response.data.quote_number}`);
      onSuccess && onSuccess();
      onClose();
    } catch (error) {
      alert('Error al crear cotización: ' + (error.response?.data?.detail || error.message));
    }
    setLoading(false);
  };

  const { subtotal, tax, total } = calculateTotals();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Crear Cotización</h2>
          <Button variant="ghost" onClick={onClose}>
            <X className="w-6 h-6" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle>Información del Cliente</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold">Cliente</label>
                <Input
                  value={quoteData.customer_name}
                  onChange={(e) => setQuoteData({...quoteData, customer_name: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-semibold">Código Cliente</label>
                <Input
                  value={quoteData.card_code}
                  onChange={(e) => setQuoteData({...quoteData, card_code: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-semibold">Persona Contacto</label>
                <Input
                  value={quoteData.contact_person}
                  onChange={(e) => setQuoteData({...quoteData, contact_person: e.target.value})}
                />
              </div>
              <div>
                <label className="text-sm font-semibold">Válido Hasta</label>
                <Input
                  type="date"
                  value={quoteData.valid_until}
                  onChange={(e) => setQuoteData({...quoteData, valid_until: e.target.value})}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Quote Lines - Similar to Order Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                Líneas de Cotización
                <Button type="button" onClick={addLine} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Línea
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {quoteData.lines.map((line, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-7 gap-4 p-4 border rounded-lg mb-4">
                  <div>
                    <label className="text-sm font-semibold">Producto</label>
                    <Select value={line.item_code} onValueChange={(value) => updateLine(index, 'item_code', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        {inventory.map((item) => (
                          <SelectItem key={item.ItemCode} value={item.ItemCode}>
                            {item.ItemCode} - {item.ItemName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-semibold">Cantidad</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={line.quantity}
                      onChange={(e) => updateLine(index, 'quantity', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold">Precio</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={line.unit_price}
                      onChange={(e) => updateLine(index, 'unit_price', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold">Descuento %</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={line.discount_pct}
                      onChange={(e) => updateLine(index, 'discount_pct', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold">Bodega</label>
                    <Input
                      value={line.warehouse_code}
                      onChange={(e) => updateLine(index, 'warehouse_code', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold">Total</label>
                    <Input
                      value={`Q${line.line_total?.toFixed(2) || '0.00'}`}
                      disabled
                    />
                  </div>
                  <div className="flex items-end">
                    <Button type="button" variant="outline" onClick={() => removeLine(index)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              {quoteData.lines.length === 0 && (
                <p className="text-center text-gray-500 py-8">
                  No hay líneas agregadas. Haga clic en "Agregar Línea" para comenzar.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Totals */}
          {quoteData.lines.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>Q{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>IVA (12%):</span>
                    <span>Q{tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>Q{total.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit */}
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
              {loading ? 'Creando...' : 'Crear Cotización'}
            </Button>
          </div>
        </form>
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
  const [quotes, setQuotes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedSalesperson, setSelectedSalesperson] = useState('all');
  const [salespeople, setSalespeople] = useState([]);

  useEffect(() => {
    loadDashboardStats();
    if (user?.role === 'admin') {
      loadSalespeople();
    }
  }, [selectedMonth, selectedYear, selectedSalesperson]);

  const loadSalespeople = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await axios.get(`${API}/salespeople`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSalespeople(response.data);
    } catch (error) {
      console.error('Error loading salespeople:', error);
    }
  };

  const loadDashboardStats = async () => {
    try {
      const token = localStorage.getItem('access_token');
      let url = `${API}/dashboard/stats?month=${selectedMonth}&year=${selectedYear}`;
      
      // Add salesperson filter for admin
      if (user?.role === 'admin' && selectedSalesperson !== 'all') {
        const salesperson = salespeople.find(s => s.id === selectedSalesperson);
        if (salesperson?.sap_salesperson_code) {
          url += `&salesperson_code=${salesperson.sap_salesperson_code}`;
        }
      }
      
      const response = await axios.get(url, {
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

  const loadQuotes = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      let url = `${API}/quotes?month=${selectedMonth}&year=${selectedYear}`;
      
      // Add salesperson filter for admin
      if (user?.role === 'admin' && selectedSalesperson !== 'all') {
        const salesperson = salespeople.find(s => s.id === selectedSalesperson);
        if (salesperson?.sap_salesperson_code) {
          url += `&salesperson_code=${salesperson.sap_salesperson_code}`;
        }
      }
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQuotes(response.data.quotes || []);
    } catch (error) {
      console.error('Error loading quotes:', error);
    }
    setLoading(false);
  };

  const updateQuoteStatus = async (quoteId, status, comments = '') => {
    try {
      const token = localStorage.getItem('access_token');
      await axios.put(`${API}/quotes/${quoteId}/status`, { status, comments }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadQuotes();
      loadDashboardStats();
      alert('Estado de cotización actualizado');
    } catch (error) {
      alert('Error al actualizar cotización: ' + (error.response?.data?.detail || error.message));
    }
  };

  const convertQuoteToOrder = async (quoteId) => {
    if (!confirm('¿Convertir esta cotización en pedido?')) return;
    
    try {
      const token = localStorage.getItem('access_token');
      await axios.post(`${API}/quotes/${quoteId}/convert-to-order`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      loadQuotes();
      loadDashboardStats();
      alert('Cotización convertida a pedido exitosamente');
    } catch (error) {
      alert('Error al convertir cotización: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchQuery('');
    
    if (tab === 'inventory') {
      loadInventory();
    } else if (tab === 'customers') {
      loadCustomers();
    } else if (tab === 'quotes') {
      loadQuotes();
    }
  };

  const handleSearch = () => {
    if (activeTab === 'inventory') {
      loadInventory(searchQuery);
    } else if (activeTab === 'customers') {
      loadCustomers(searchQuery);
    }
  };

  const getQuoteStatusIcon = (status) => {
    switch (status) {
      case 'draft': return <Clock className="w-4 h-4 text-gray-500" />;
      case 'sent': return <Send className="w-4 h-4 text-blue-500" />;
      case 'won': return <CheckCheck className="w-4 h-4 text-emerald-500" />;
      case 'lost': return <X className="w-4 h-4 text-red-500" />;
      case 'expired': return <XCircle className="w-4 h-4 text-orange-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getQuoteStatusText = (status) => {
    switch (status) {
      case 'draft': return 'Borrador';
      case 'sent': return 'Enviada';
      case 'won': return 'Ganada';
      case 'lost': return 'Perdida';
      case 'expired': return 'Expirada';
      default: return status;
    }
  };

  // Render different dashboards based on user role
  const renderDashboard = () => {
    if (user.role === 'seller') {
      return (
        <div className="space-y-6">
          {/* Date Filter */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-500" />
              <span className="font-semibold">Filtros:</span>
            </div>
            <Select value={selectedMonth} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({length: 12}, (_, i) => (
                  <SelectItem key={i+1} value={i+1}>
                    {new Date(2024, i).toLocaleDateString('es', { month: 'long' })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedYear} onValueChange={(value) => setSelectedYear(parseInt(value))}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={2024}>2024</SelectItem>
                <SelectItem value={2025}>2025</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline">
              {stats?.month_name} {stats?.current_year}
            </Badge>
          </div>

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
            
            <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100">Conversión</p>
                    <p className="text-3xl font-bold">{Math.round(stats?.quote_conversion_rate || 0)}%</p>
                  </div>
                  <Quote className="w-8 h-8 text-orange-200" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Seller Progress and Pipeline */}
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
                  <Quote className="w-5 h-5" />
                  Pipeline de Cotizaciones
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {Object.entries(stats?.quote_stats || {}).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getQuoteStatusIcon(status)}
                        <span className="text-sm">{getQuoteStatusText(status)}</span>
                      </div>
                      <span className="font-semibold">{count}</span>
                    </div>
                  ))}
                  <Separator />
                  <div className="text-sm text-gray-600">
                    <p>Total cotizaciones: {stats?.total_quotes_month || 0}</p>
                    <p>Tasa de conversión: {Math.round(stats?.quote_conversion_rate || 0)}%</p>
                  </div>
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
          {/* Date Filter */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-500" />
              <span className="font-semibold">Filtros:</span>
            </div>
            <Select value={selectedMonth} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({length: 12}, (_, i) => (
                  <SelectItem key={i+1} value={i+1}>
                    {new Date(2024, i).toLocaleDateString('es', { month: 'long' })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedYear} onValueChange={(value) => setSelectedYear(parseInt(value))}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={2024}>2024</SelectItem>
                <SelectItem value={2025}>2025</SelectItem>
              </SelectContent>
            </Select>
            <Badge variant="outline">
              {stats?.month_name} {stats?.current_year}
            </Badge>
          </div>

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
            
            <Card className="bg-gradient-to-r from-orange-500 to-orange-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100">Conversión</p>
                    <p className="text-3xl font-bold">{Math.round(stats?.quote_conversion_rate || 0)}%</p>
                  </div>
                  <Quote className="w-8 h-8 text-orange-200" />
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
                
                <div className="text-sm text-gray-600">
                  <p>Cotizaciones totales: {stats?.total_quotes_month || 0}</p>
                  <p>Tasa conversión global: {Math.round(stats?.quote_conversion_rate || 0)}%</p>
                </div>
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
          <TabsList className={`grid w-full ${user?.role === 'admin' ? 'grid-cols-7' : 'grid-cols-5'} bg-white shadow-sm h-12`}>
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
            <TabsTrigger value="quotes" className="flex items-center gap-2 h-10" data-testid="quotes-tab">
              <Quote className="w-4 h-4" />
              <span className="hidden sm:inline">Cotizaciones</span>
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2 h-10" data-testid="orders-tab">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Pedidos</span>
            </TabsTrigger>
            {user?.role === 'admin' && (
              <>
                <TabsTrigger value="users" className="flex items-center gap-2 h-10" data-testid="users-tab">
                  <UserPlus className="w-4 h-4" />
                  <span className="hidden sm:inline">Usuarios</span>
                </TabsTrigger>
                <TabsTrigger value="sap-config" className="flex items-center gap-2 h-10" data-testid="sap-config-tab">
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">SAP Config</span>
                </TabsTrigger>
              </>
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
                          {item.Price && (
                            <p className="text-sm font-semibold text-emerald-600">Q{item.Price.toLocaleString()}</p>
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
                          <div className="flex gap-2 mt-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => {
                                setSelectedCustomer(customer);
                                setShowQuoteForm(true);
                              }}
                              data-testid={`quote-customer-${customer.CardCode}`}
                            >
                              <Quote className="w-4 h-4 mr-1" />
                              Cotizar
                            </Button>
                            <Button 
                              size="sm" 
                              onClick={() => {
                                setSelectedCustomer(customer);
                                setShowOrderForm(true);
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700"
                              data-testid={`order-customer-${customer.CardCode}`}
                            >
                              <ShoppingCart className="w-4 h-4 mr-1" />
                              Pedido
                            </Button>
                          </div>
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

          {/* Quotes Tab */}
          <TabsContent value="quotes" className="space-y-4" data-testid="quotes-content">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Pipeline de Cotizaciones</h2>
              <Button 
                onClick={() => setShowQuoteForm(true)}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nueva Cotización
              </Button>
            </div>

            <div className="grid gap-4">
              {loading ? (
                <div className="text-center py-8">Cargando cotizaciones...</div>
              ) : (
                quotes.map((quote) => (
                  <Card key={quote.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{quote.quote_number}</h3>
                            <Badge variant={
                              quote.status === 'won' ? 'default' : 
                              quote.status === 'lost' ? 'destructive' : 
                              quote.status === 'expired' ? 'secondary' : 
                              'outline'
                            }>
                              {getQuoteStatusIcon(quote.status)}
                              <span className="ml-1">{getQuoteStatusText(quote.status)}</span>
                            </Badge>
                          </div>
                          <p className="text-gray-600">{quote.customer_name}</p>
                          <p className="text-sm text-gray-500">
                            Válida hasta: {new Date(quote.valid_until).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-emerald-600">
                            Q{quote.grand_total?.toLocaleString() || '0.00'}
                          </p>
                          <div className="flex gap-2 mt-2">
                            {quote.status === 'draft' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => updateQuoteStatus(quote.id, 'sent')}
                              >
                                <Send className="w-4 h-4 mr-1" />
                                Enviar
                              </Button>
                            )}
                            {(quote.status === 'sent' || quote.status === 'draft') && (
                              <>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => convertQuoteToOrder(quote.id)}
                                  className="text-emerald-600"
                                >
                                  <CheckCheck className="w-4 h-4 mr-1" />
                                  Ganar
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => updateQuoteStatus(quote.id, 'lost')}
                                  className="text-red-600"
                                >
                                  <X className="w-4 h-4 mr-1" />
                                  Perder
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
              
              {!loading && quotes.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No hay cotizaciones para el período seleccionado
                </div>
              )}
            </div>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4" data-testid="orders-content">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Gestión de Pedidos</h2>
              <Button 
                onClick={() => setShowOrderForm(true)}
                className="bg-emerald-600 hover:bg-emerald-700"
                data-testid="create-order-button"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Pedido
              </Button>
            </div>
            
            <Card>
              <CardContent className="p-6">
                <p className="text-gray-600 mb-4">
                  Los pedidos se crean y sincronizan automáticamente con SAP Business One.
                </p>
                <div className="text-sm text-gray-500">
                  <p>• Use el botón "Nuevo Pedido" o seleccione un cliente para crear pedidos</p>
                  <p>• Las cotizaciones ganadas se convierten automáticamente en pedidos</p>
                  <p>• Los pedidos se sincronizan en tiempo real con SAP</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* User Management Tab (Admin only) */}
          {user?.role === 'admin' && (
            <TabsContent value="users" className="space-y-4" data-testid="users-content">
              <UserManagement />
            </TabsContent>
          )}

          {/* SAP Configuration Tab (Admin only) */}
          {user?.role === 'admin' && (
            <TabsContent value="sap-config" className="space-y-4" data-testid="sap-config-content">
              <SAPConfiguration />
            </TabsContent>
          )}
        </Tabs>
      </main>

      {/* Order Form Modal */}
      {showOrderForm && (
        <OrderForm 
          customer={selectedCustomer}
          onClose={() => {
            setShowOrderForm(false);
            setSelectedCustomer(null);
          }}
          onSuccess={() => {
            loadDashboardStats();
          }}
        />
      )}

      {/* Quote Form Modal */}
      {showQuoteForm && (
        <QuoteForm 
          customer={selectedCustomer}
          onClose={() => {
            setShowQuoteForm(false);
            setSelectedCustomer(null);
          }}
          onSuccess={() => {
            loadDashboardStats();
            if (activeTab === 'quotes') {
              loadQuotes();
            }
          }}
        />
      )}
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