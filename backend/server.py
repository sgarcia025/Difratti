from fastapi import FastAPI, APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
from typing import List, Optional, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field, EmailStr
import os
import logging
import jwt
import uuid
import asyncio
import httpx
from pathlib import Path
import calendar

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'difratti_sales')]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
SECRET_KEY = os.environ.get("JWT_SECRET", "your-secret-key-change-this")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

# SAP Configuration - Now stored in database
DEFAULT_SAP_CONFIG = {
    "sap_mode": os.environ.get("SAP_MODE", "mock"),
    "b1_host": os.environ.get("B1_HOST", ""),
    "b1_company_db": os.environ.get("B1_COMPANY_DB", ""),
    "b1_username": os.environ.get("B1_USERNAME", ""),
    "b1_password": os.environ.get("B1_PASSWORD", ""),
    "b1_ssl_verify": os.environ.get("B1_SSL_VERIFY", "true").lower() == "true",
    "b1_timeout_ms": int(os.environ.get("B1_TIMEOUT_MS", "60000")),
    "connection_status": "disconnected",
    "last_test": None
}

# Create the main app
app = FastAPI(title="Difratti Sales System", version="1.0.0")
api_router = APIRouter(prefix="/api")

# Enums
class UserRole(str, Enum):
    ADMIN = "admin"
    SUPERVISOR = "supervisor"
    SELLER = "seller"

class OrderStatus(str, Enum):
    DRAFT = "draft"
    QUEUED = "queued"
    SYNCED = "synced"
    INVOICED = "invoiced"
    CANCELLED = "cancelled"
    ERROR = "error"

class QuoteStatus(str, Enum):
    DRAFT = "draft"
    SENT = "sent"
    WON = "won"
    LOST = "lost"
    EXPIRED = "expired"

class SAPConnectionStatus(str, Enum):
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    ERROR = "error"
    TESTING = "testing"

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    full_name: str
    role: UserRole
    is_active: bool = True
    sap_salesperson_code: Optional[int] = None
    team_id: Optional[str] = None
    assigned_customers: List[str] = Field(default_factory=list)
    monthly_target: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: UserRole
    sap_salesperson_code: Optional[int] = None
    monthly_target: Optional[float] = 0.0
    assigned_customers: List[str] = Field(default_factory=list)

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    sap_salesperson_code: Optional[int] = None
    monthly_target: Optional[float] = None
    assigned_customers: Optional[List[str]] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: UserRole
    full_name: str

class SAPConfig(BaseModel):
    sap_mode: str = "mock"  # mock or real
    b1_host: str = ""
    b1_company_db: str = ""
    b1_username: str = ""
    b1_password: str = ""
    b1_ssl_verify: bool = True
    b1_timeout_ms: int = 60000
    connection_status: str = "disconnected"
    last_test: Optional[datetime] = None

class SAPConfigUpdate(BaseModel):
    b1_host: str
    b1_company_db: str
    b1_username: str
    b1_password: str
    b1_ssl_verify: Optional[bool] = True
    b1_timeout_ms: Optional[int] = 60000

class Customer(BaseModel):
    card_code: str
    card_name: str
    phone: Optional[str] = None
    price_list_num: Optional[int] = None
    balance: float = 0.0
    salesperson_code: Optional[int] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Item(BaseModel):
    item_code: str
    item_name: str
    uom: Optional[str] = None
    is_active: bool = True
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ItemStock(BaseModel):
    item_code: str
    whs_code: str
    on_hand: float = 0.0
    committed: float = 0.0
    ordered: float = 0.0
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class QuoteLine(BaseModel):
    item_code: str
    description: str
    quantity: float
    unit_price: float
    discount_pct: float = 0.0
    warehouse_code: str
    tax_code: Optional[str] = None
    line_total: float

class QuoteCreate(BaseModel):
    card_code: str
    customer_name: str
    contact_person: Optional[str] = None
    comments: Optional[str] = None
    valid_until: str
    lines: List[QuoteLine]
    shipping_address: Optional[str] = None
    billing_address: Optional[str] = None

class Quote(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    quote_number: str
    card_code: str
    customer_name: str
    contact_person: Optional[str] = None
    salesperson_code: int
    status: QuoteStatus = QuoteStatus.DRAFT
    total_before_tax: float = 0.0
    tax_total: float = 0.0
    grand_total: float = 0.0
    currency: str = "GTQ"
    valid_until: datetime
    comments: Optional[str] = None
    shipping_address: Optional[str] = None
    billing_address: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class QuoteStatusUpdate(BaseModel):
    status: QuoteStatus
    comments: Optional[str] = None

class OrderLine(BaseModel):
    item_code: str
    description: str
    quantity: float
    unit_price: float
    discount_pct: float = 0.0
    warehouse_code: str
    tax_code: Optional[str] = None
    line_total: float

class OrderCreate(BaseModel):
    card_code: str
    customer_name: str
    contact_person: Optional[str] = None
    doc_date: str
    doc_due_date: str
    comments: Optional[str] = None
    lines: List[OrderLine]
    shipping_address: Optional[str] = None
    billing_address: Optional[str] = None
    payment_terms: Optional[str] = None
    priority: str = "Normal"

class Order(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    external_id: str
    card_code: str
    customer_name: str
    contact_person: Optional[str] = None
    salesperson_code: int
    status: OrderStatus = OrderStatus.DRAFT
    sap_docentry: Optional[int] = None
    sap_docnum: Optional[int] = None
    series: Optional[int] = None
    total_before_tax: float = 0.0
    tax_total: float = 0.0
    grand_total: float = 0.0
    currency: str = "GTQ"
    source: str = "web"
    channel: str = "D2D"
    priority: str = "Normal"
    payment_terms: Optional[str] = None
    shipping_address: Optional[str] = None
    billing_address: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# SAP Service Layer Adapter - Enhanced
class SAPServiceLayer:
    def __init__(self):
        self.session_cookies = {}
        self.config = None

    async def get_config(self):
        """Get SAP configuration from database"""
        if not self.config:
            config_doc = await db.sap_config.find_one({})
            if not config_doc:
                # Create default config
                await db.sap_config.insert_one(DEFAULT_SAP_CONFIG)
                self.config = DEFAULT_SAP_CONFIG
            else:
                self.config = config_doc
        return self.config

    async def update_config(self, new_config: dict):
        """Update SAP configuration in database"""
        await db.sap_config.update_one({}, {"$set": new_config}, upsert=True)
        self.config = None  # Reset cache

    async def login(self):
        """Login to SAP B1 Service Layer"""
        config = await self.get_config()
        
        if config["sap_mode"] == "mock":
            self.session_cookies = {"B1SESSION": "mock-session", "ROUTEID": "mock-route"}
            await self.update_config({**config, "connection_status": "connected"})
            return True
            
        try:
            async with httpx.AsyncClient(
                verify=config["b1_ssl_verify"], 
                timeout=config["b1_timeout_ms"] / 1000
            ) as client:
                login_data = {
                    "UserName": config["b1_username"],
                    "Password": config["b1_password"],
                    "CompanyDB": config["b1_company_db"]
                }
                response = await client.post(f"{config['b1_host']}/Login", json=login_data)
                
                if response.status_code == 200:
                    self.session_cookies = dict(response.cookies)
                    await self.update_config({
                        **config, 
                        "connection_status": "connected",
                        "last_test": datetime.now(timezone.utc)
                    })
                    return True
                else:
                    await self.update_config({
                        **config, 
                        "connection_status": "error",
                        "last_test": datetime.now(timezone.utc)
                    })
                    return False
        except Exception as e:
            logger.error(f"SAP login failed: {e}")
            config = await self.get_config()
            await self.update_config({
                **config, 
                "connection_status": "error",
                "last_test": datetime.now(timezone.utc)
            })
            return False

    async def test_connection(self, test_config: dict):
        """Test SAP connection with provided credentials"""
        try:
            async with httpx.AsyncClient(
                verify=test_config.get("b1_ssl_verify", True), 
                timeout=test_config.get("b1_timeout_ms", 60000) / 1000
            ) as client:
                login_data = {
                    "UserName": test_config["b1_username"],
                    "Password": test_config["b1_password"],
                    "CompanyDB": test_config["b1_company_db"]
                }
                response = await client.post(f"{test_config['b1_host']}/Login", json=login_data)
                return response.status_code == 200
        except Exception as e:
            logger.error(f"SAP connection test failed: {e}")
            return False

    async def get_items(self, search: str = "", page: int = 1, page_size: int = 50):
        config = await self.get_config()
        
        if config["sap_mode"] == "mock":
            return self._mock_items(search, page, page_size)
            
        if not self.session_cookies:
            if not await self.login():
                return {"items": [], "total": 0, "error": "SAP connection failed"}
        
        try:
            skip = (page - 1) * page_size
            filter_query = ""
            if search:
                filter_query = f"?$filter=contains(ItemName,'{search}')&$top={page_size}&$skip={skip}&$select=ItemCode,ItemName,QuantityOnStock,UoMEntry"
            else:
                filter_query = f"?$top={page_size}&$skip={skip}&$select=ItemCode,ItemName,QuantityOnStock,UoMEntry"
            
            async with httpx.AsyncClient(verify=config["b1_ssl_verify"]) as client:
                response = await client.get(
                    f"{config['b1_host']}/Items{filter_query}",
                    cookies=self.session_cookies
                )
                
                if response.status_code == 200:
                    data = response.json()
                    items = []
                    for item in data.get("value", []):
                        items.append({
                            "ItemCode": item.get("ItemCode"),
                            "ItemName": item.get("ItemName"),
                            "UOM": item.get("UoMEntry"),
                            "IsActive": True,
                            "Stock": item.get("QuantityOnStock", 0),
                            "Price": 0.0  # Would need to get from price list
                        })
                    return {
                        "items": items,
                        "total": len(items),
                        "page": page,
                        "page_size": page_size
                    }
                else:
                    # Try to re-login if unauthorized
                    if response.status_code == 401:
                        if await self.login():
                            return await self.get_items(search, page, page_size)
                    return {"items": [], "total": 0, "error": f"SAP API error: {response.status_code}"}
        except Exception as e:
            logger.error(f"SAP get_items failed: {e}")
            return {"items": [], "total": 0, "error": str(e)}

    async def get_customers(self, search: str = "", salesperson_code: Optional[int] = None):
        config = await self.get_config()
        
        if config["sap_mode"] == "mock":
            return self._mock_customers(search, salesperson_code)
            
        if not self.session_cookies:
            if not await self.login():
                return []
        
        try:
            filter_parts = ["CardType eq 'C'"]
            if search:
                filter_parts.append(f"(contains(CardName,'{search}') or startswith(CardCode,'{search}'))")
            if salesperson_code:
                filter_parts.append(f"SalesPersonCode eq {salesperson_code}")
            
            filter_query = "$filter=" + " and ".join(filter_parts)
            select_query = "$select=CardCode,CardName,Phone1,PriceListNum,CurrentAccountBalance,SalesPersonCode"
            
            async with httpx.AsyncClient(verify=config["b1_ssl_verify"]) as client:
                response = await client.get(
                    f"{config['b1_host']}/BusinessPartners?{filter_query}&{select_query}",
                    cookies=self.session_cookies
                )
                
                if response.status_code == 200:
                    data = response.json()
                    customers = []
                    for customer in data.get("value", []):
                        customers.append({
                            "CardCode": customer.get("CardCode"),
                            "CardName": customer.get("CardName"),
                            "Phone1": customer.get("Phone1"),
                            "PriceListNum": customer.get("PriceListNum"),
                            "Balance": customer.get("CurrentAccountBalance", 0),
                            "SalesPersonCode": customer.get("SalesPersonCode")
                        })
                    return customers
                else:
                    if response.status_code == 401:
                        if await self.login():
                            return await self.get_customers(search, salesperson_code)
                    return []
        except Exception as e:
            logger.error(f"SAP get_customers failed: {e}")
            return []

    async def create_order(self, order_data: dict):
        config = await self.get_config()
        
        if config["sap_mode"] == "mock":
            return {"DocEntry": 12345, "DocNum": 12345, "success": True}
            
        if not self.session_cookies:
            if not await self.login():
                return {"success": False, "error": "SAP connection failed"}
        
        try:
            async with httpx.AsyncClient(verify=config["b1_ssl_verify"]) as client:
                response = await client.post(
                    f"{config['b1_host']}/Orders",
                    json=order_data,
                    cookies=self.session_cookies
                )
                
                if response.status_code == 201:
                    result = response.json()
                    return {
                        "DocEntry": result.get("DocEntry"),
                        "DocNum": result.get("DocNum"),
                        "success": True
                    }
                else:
                    if response.status_code == 401:
                        if await self.login():
                            return await self.create_order(order_data)
                    return {"success": False, "error": f"SAP API error: {response.status_code}"}
        except Exception as e:
            logger.error(f"SAP create_order failed: {e}")
            return {"success": False, "error": str(e)}

    async def find_order_by_external_id(self, external_id: str):
        config = await self.get_config()
        
        if config["sap_mode"] == "mock":
            return None  # Not found in mock
            
        if not self.session_cookies:
            if not await self.login():
                return None
        
        try:
            filter_query = f"$filter=U_ExternalId eq '{external_id}'"
            async with httpx.AsyncClient(verify=config["b1_ssl_verify"]) as client:
                response = await client.get(
                    f"{config['b1_host']}/Orders?{filter_query}",
                    cookies=self.session_cookies
                )
                
                if response.status_code == 200:
                    data = response.json()
                    orders = data.get("value", [])
                    return orders[0] if orders else None
                return None
        except Exception as e:
            logger.error(f"SAP find_order_by_external_id failed: {e}")
            return None

    def _mock_items(self, search: str, page: int, page_size: int):
        mock_items = [
            {"ItemCode": "A00001", "ItemName": "Laptop HP Pavilion 15", "UOM": "Each", "IsActive": True, "Stock": 25, "Price": 8500.00},
            {"ItemCode": "A00002", "ItemName": "Mouse Inalámbrico Logitech", "UOM": "Each", "IsActive": True, "Stock": 150, "Price": 450.00},
            {"ItemCode": "A00003", "ItemName": "Teclado Mecánico RGB", "UOM": "Each", "IsActive": True, "Stock": 75, "Price": 1200.00},
            {"ItemCode": "A00004", "ItemName": "Monitor 24 pulgadas LG", "UOM": "Each", "IsActive": True, "Stock": 40, "Price": 2500.00},
            {"ItemCode": "A00005", "ItemName": "Impresora Multifuncional Canon", "UOM": "Each", "IsActive": True, "Stock": 30, "Price": 3200.00},
            {"ItemCode": "A00006", "ItemName": "Disco Duro Externo 1TB", "UOM": "Each", "IsActive": True, "Stock": 60, "Price": 750.00},
            {"ItemCode": "A00007", "ItemName": "Webcam HD Logitech", "UOM": "Each", "IsActive": True, "Stock": 85, "Price": 650.00}
        ]
        
        if search:
            mock_items = [item for item in mock_items if search.lower() in item["ItemName"].lower()]
            
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        
        return {
            "items": mock_items[start_idx:end_idx],
            "total": len(mock_items),
            "page": page,
            "page_size": page_size
        }

    def _mock_customers(self, search: str, salesperson_code: Optional[int] = None):
        mock_customers = [
            {"CardCode": "C20001", "CardName": "Empresa Tecnológica S.A.", "Phone1": "2234-5678", "PriceListNum": 1, "Balance": 15750.00, "SalesPersonCode": 1},
            {"CardCode": "C20002", "CardName": "Distribuidora Central", "Phone1": "2345-6789", "PriceListNum": 2, "Balance": 8920.50, "SalesPersonCode": 1},
            {"CardCode": "C20003", "CardName": "Comercial del Norte", "Phone1": "2456-7890", "PriceListNum": 1, "Balance": 22100.25, "SalesPersonCode": 3},
            {"CardCode": "C20004", "CardName": "Sistemas Integrados", "Phone1": "2567-8901", "PriceListNum": 3, "Balance": 5430.75, "SalesPersonCode": 3},
            {"CardCode": "C20005", "CardName": "Oficina Moderna S.A.", "Phone1": "2678-9012", "PriceListNum": 1, "Balance": 12450.00, "SalesPersonCode": 1},
            {"CardCode": "C20006", "CardName": "Tech Solutions GT", "Phone1": "2789-0123", "PriceListNum": 2, "Balance": 18920.75, "SalesPersonCode": 3}
        ]
        
        if search:
            mock_customers = [c for c in mock_customers if search.lower() in c["CardName"].lower()]
        
        if salesperson_code:
            mock_customers = [c for c in mock_customers if c["SalesPersonCode"] == salesperson_code]
            
        return mock_customers

# Initialize SAP Service Layer
sap = SAPServiceLayer()

# Authentication functions
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def create_refresh_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")
    
    user = await db.users.find_one({"email": email})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    
    return User(**user)

def require_role(allowed_roles: List[UserRole]):
    def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return current_user
    return role_checker

# Utility functions
def generate_quote_number() -> str:
    """Generate a unique quote number"""
    now = datetime.now(timezone.utc)
    return f"COT-{now.strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"

def generate_external_id() -> str:
    """Generate a unique external ID for orders"""
    now = datetime.now(timezone.utc)
    return f"WEB-{now.strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"

# API Routes

@api_router.post("/auth/login", response_model=Token)
async def login(user_data: UserLogin):
    # Check if user exists
    user_doc = await db.users.find_one({"email": user_data.email})
    if not user_doc or not verify_password(user_data.password, user_doc["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user_doc["is_active"]:
        raise HTTPException(status_code=401, detail="User account is inactive")
    
    # Create tokens
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_doc["email"]}, expires_delta=access_token_expires
    )
    refresh_token = create_refresh_token(data={"sub": user_doc["email"]})
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        role=UserRole(user_doc["role"]),
        full_name=user_doc["full_name"]
    )

@api_router.post("/auth/refresh")
async def refresh_token(refresh_token: str):
    try:
        payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": email}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token}

@api_router.get("/auth/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

# User Management (Admin only)
@api_router.get("/users")
async def get_users(current_user: User = Depends(require_role([UserRole.ADMIN]))):
    users = await db.users.find({}, {"password_hash": 0}).to_list(None)
    return [User(**user) for user in users]

@api_router.post("/users", response_model=User)
async def create_user(
    user_data: UserCreate,
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    user_dict = user_data.dict()
    user_dict["password_hash"] = get_password_hash(user_dict.pop("password"))
    user_dict["id"] = str(uuid.uuid4())
    user_dict["created_at"] = datetime.now(timezone.utc)
    user_dict["updated_at"] = datetime.now(timezone.utc)
    
    await db.users.insert_one(user_dict)
    
    # Return user without password
    user_dict.pop("password_hash")
    return User(**user_dict)

@api_router.put("/users/{user_id}", response_model=User)
async def update_user(
    user_id: str,
    user_update: UserUpdate,
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    update_data = {k: v for k, v in user_update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.users.update_one({"id": user_id}, {"$set": update_data})
    
    updated_user = await db.users.find_one({"id": user_id}, {"password_hash": 0})
    return User(**updated_user)

@api_router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Don't allow deleting the current user
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    await db.users.delete_one({"id": user_id})
    return {"message": "User deleted successfully"}

# SAP Configuration endpoints (Admin only)
@api_router.get("/sap/config")
async def get_sap_config(current_user: User = Depends(require_role([UserRole.ADMIN]))):
    config = await sap.get_config()
    # Don't send password back and remove MongoDB ObjectId fields
    safe_config = {
        "sap_mode": config.get("sap_mode", "mock"),
        "b1_host": config.get("b1_host", ""),
        "b1_company_db": config.get("b1_company_db", ""),
        "b1_username": config.get("b1_username", ""),
        "b1_password": "****" if config.get("b1_password") else "",
        "b1_ssl_verify": config.get("b1_ssl_verify", True),
        "b1_timeout_ms": config.get("b1_timeout_ms", 60000),
        "connection_status": config.get("connection_status", "disconnected"),
        "last_test": config.get("last_test").isoformat() if config.get("last_test") else None
    }
    return safe_config

@api_router.post("/sap/config")
async def update_sap_config(
    config_update: SAPConfigUpdate,
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    current_config = await sap.get_config()
    
    new_config = {
        **current_config,
        "b1_host": config_update.b1_host,
        "b1_company_db": config_update.b1_company_db,
        "b1_username": config_update.b1_username,
        "b1_password": config_update.b1_password,
        "b1_ssl_verify": config_update.b1_ssl_verify,
        "b1_timeout_ms": config_update.b1_timeout_ms,
        "connection_status": "disconnected"
    }
    
    await sap.update_config(new_config)
    
    return {"message": "SAP configuration updated successfully"}

@api_router.post("/sap/test-connection")
async def test_sap_connection(
    config_update: SAPConfigUpdate,
    current_user: User = Depends(require_role([UserRole.ADMIN]))
):
    test_config = {
        "b1_host": config_update.b1_host,
        "b1_company_db": config_update.b1_company_db,
        "b1_username": config_update.b1_username,
        "b1_password": config_update.b1_password,
        "b1_ssl_verify": config_update.b1_ssl_verify,
        "b1_timeout_ms": config_update.b1_timeout_ms
    }
    
    success = await sap.test_connection(test_config)
    
    return {
        "success": success,
        "message": "Connection successful" if success else "Connection failed",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

@api_router.post("/sap/activate")
async def activate_sap_connection(current_user: User = Depends(require_role([UserRole.ADMIN]))):
    current_config = await sap.get_config()
    new_config = {**current_config, "sap_mode": "real"}
    await sap.update_config(new_config)
    
    # Test the connection
    login_success = await sap.login()
    
    return {
        "success": login_success,
        "mode": "real",
        "message": "SAP real mode activated" if login_success else "SAP activation failed"
    }

@api_router.post("/sap/deactivate")
async def deactivate_sap_connection(current_user: User = Depends(require_role([UserRole.ADMIN]))):
    current_config = await sap.get_config()
    new_config = {**current_config, "sap_mode": "mock", "connection_status": "disconnected"}
    await sap.update_config(new_config)
    
    return {"success": True, "mode": "mock", "message": "SAP mock mode activated"}

@api_router.get("/inventory")
async def get_inventory(
    search: str = "",
    whs: str = "",
    page: int = 1,
    page_size: int = 50,
    current_user: User = Depends(get_current_user)
):
    result = await sap.get_items(search, page, page_size)
    return result

@api_router.get("/customers")
async def get_customers(
    search: str = "",
    current_user: User = Depends(get_current_user)
):
    # Sellers only see their assigned customers
    salesperson_code = None
    if current_user.role == UserRole.SELLER and current_user.sap_salesperson_code:
        salesperson_code = current_user.sap_salesperson_code
    
    result = await sap.get_customers(search, salesperson_code)
    return {"customers": result}

# Quotes endpoints
@api_router.post("/quotes", response_model=Quote)
async def create_quote(
    quote_data: QuoteCreate,
    current_user: User = Depends(get_current_user)
):
    # Calculate totals
    total_before_tax = sum(line.line_total for line in quote_data.lines)
    tax_total = total_before_tax * 0.12  # Assuming 12% IVA
    grand_total = total_before_tax + tax_total
    
    # Create quote record
    quote = Quote(
        quote_number=generate_quote_number(),
        card_code=quote_data.card_code,
        customer_name=quote_data.customer_name,
        contact_person=quote_data.contact_person,
        salesperson_code=current_user.sap_salesperson_code or 1,
        status=QuoteStatus.DRAFT,
        total_before_tax=total_before_tax,
        tax_total=tax_total,
        grand_total=grand_total,
        valid_until=datetime.fromisoformat(quote_data.valid_until),
        comments=quote_data.comments,
        shipping_address=quote_data.shipping_address,
        billing_address=quote_data.billing_address
    )
    
    # Save to database
    quote_dict = quote.dict()
    await db.quotes.insert_one(quote_dict)
    
    # Save quote lines
    for line in quote_data.lines:
        line_dict = line.dict()
        line_dict["quote_id"] = quote.id
        line_dict["id"] = str(uuid.uuid4())
        await db.quote_lines.insert_one(line_dict)
    
    return quote

@api_router.get("/quotes")
async def get_quotes(
    status: Optional[QuoteStatus] = None,
    month: Optional[int] = None,
    year: Optional[int] = None,
    current_user: User = Depends(get_current_user)
):
    # Build filter
    filter_condition = {}
    
    # Role-based filtering
    if current_user.role == UserRole.SELLER:
        filter_condition["salesperson_code"] = current_user.sap_salesperson_code
    
    # Status filtering
    if status:
        filter_condition["status"] = status.value
    
    # Date filtering
    if month and year:
        start_date = datetime(year, month, 1, tzinfo=timezone.utc)
        if month == 12:
            end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
        else:
            end_date = datetime(year, month + 1, 1, tzinfo=timezone.utc)
        
        filter_condition["created_at"] = {"$gte": start_date, "$lt": end_date}
    
    quotes = await db.quotes.find(filter_condition, {"_id": 0}).sort("created_at", -1).to_list(None)
    
    # Get quote lines for each quote
    result = []
    for quote in quotes:
        quote_obj = Quote(**quote)
        lines = await db.quote_lines.find({"quote_id": quote["id"]}, {"_id": 0}).to_list(None)
        quote_dict = quote_obj.dict()
        quote_dict["lines"] = lines
        result.append(quote_dict)
    
    return {"quotes": result}

@api_router.put("/quotes/{quote_id}/status")
async def update_quote_status(
    quote_id: str,
    status_update: QuoteStatusUpdate,
    current_user: User = Depends(get_current_user)
):
    quote = await db.quotes.find_one({"id": quote_id})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    # Check permissions
    if current_user.role == UserRole.SELLER and quote["salesperson_code"] != current_user.sap_salesperson_code:
        raise HTTPException(status_code=403, detail="Access denied")
    
    update_data = {
        "status": status_update.status.value,
        "updated_at": datetime.now(timezone.utc)
    }
    
    if status_update.comments:
        update_data["comments"] = status_update.comments
    
    await db.quotes.update_one({"id": quote_id}, {"$set": update_data})
    
    return {"message": "Quote status updated successfully"}

@api_router.post("/quotes/{quote_id}/convert-to-order")
async def convert_quote_to_order(
    quote_id: str,
    current_user: User = Depends(get_current_user)
):
    quote = await db.quotes.find_one({"id": quote_id})
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
    
    # Check permissions
    if current_user.role == UserRole.SELLER and quote["salesperson_code"] != current_user.sap_salesperson_code:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get quote lines
    quote_lines = await db.quote_lines.find({"quote_id": quote_id}).to_list(None)
    
    # Create order
    order = Order(
        external_id=generate_external_id(),
        card_code=quote["card_code"],
        customer_name=quote["customer_name"],
        contact_person=quote.get("contact_person"),
        salesperson_code=quote["salesperson_code"],
        status=OrderStatus.QUEUED,
        total_before_tax=quote["total_before_tax"],
        tax_total=quote["tax_total"],
        grand_total=quote["grand_total"],
        shipping_address=quote.get("shipping_address"),
        billing_address=quote.get("billing_address")
    )
    
    # Save order
    order_dict = order.dict()
    await db.orders.insert_one(order_dict)
    
    # Save order lines
    for line in quote_lines:
        line_dict = {
            "id": str(uuid.uuid4()),
            "order_id": order.id,
            "item_code": line["item_code"],
            "description": line["description"],
            "quantity": line["quantity"],
            "unit_price": line["unit_price"],
            "discount_pct": line["discount_pct"],
            "warehouse_code": line["warehouse_code"],
            "tax_code": line.get("tax_code"),
            "line_total": line["line_total"]
        }
        await db.order_lines.insert_one(line_dict)
    
    # Update quote status
    await db.quotes.update_one(
        {"id": quote_id},
        {"$set": {"status": QuoteStatus.WON.value, "updated_at": datetime.now(timezone.utc)}}
    )
    
    # Queue for SAP sync
    asyncio.create_task(sync_order_to_sap(order.id))
    
    return {"message": "Quote converted to order successfully", "order_id": order.id}

@api_router.post("/orders", response_model=Order)
async def create_order(
    order_data: OrderCreate,
    current_user: User = Depends(get_current_user)
):
    # Calculate totals
    total_before_tax = sum(line.line_total for line in order_data.lines)
    tax_total = total_before_tax * 0.12  # Assuming 12% IVA
    grand_total = total_before_tax + tax_total
    
    # Create order record
    order = Order(
        external_id=generate_external_id(),
        card_code=order_data.card_code,
        customer_name=order_data.customer_name,
        contact_person=order_data.contact_person,
        salesperson_code=current_user.sap_salesperson_code or 1,
        status=OrderStatus.QUEUED,
        total_before_tax=total_before_tax,
        tax_total=tax_total,
        grand_total=grand_total,
        priority=order_data.priority,
        payment_terms=order_data.payment_terms,
        shipping_address=order_data.shipping_address,
        billing_address=order_data.billing_address
    )
    
    # Save to database
    order_dict = order.dict()
    await db.orders.insert_one(order_dict)
    
    # Save order lines
    for line in order_data.lines:
        line_dict = line.dict()
        line_dict["order_id"] = order.id
        line_dict["id"] = str(uuid.uuid4())
        await db.order_lines.insert_one(line_dict)
    
    # Queue for SAP sync (in a real app, this would use a job queue)
    asyncio.create_task(sync_order_to_sap(order.id))
    
    return order

@api_router.get("/orders")
async def get_orders(
    status: Optional[OrderStatus] = None,
    month: Optional[int] = None,
    year: Optional[int] = None,
    current_user: User = Depends(get_current_user)
):
    # Build filter
    filter_condition = {}
    
    # Role-based filtering
    if current_user.role == UserRole.SELLER:
        filter_condition["salesperson_code"] = current_user.sap_salesperson_code
    
    # Status filtering
    if status:
        filter_condition["status"] = status.value
    
    # Date filtering
    if month and year:
        start_date = datetime(year, month, 1, tzinfo=timezone.utc)
        if month == 12:
            end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
        else:
            end_date = datetime(year, month + 1, 1, tzinfo=timezone.utc)
        
        filter_condition["created_at"] = {"$gte": start_date, "$lt": end_date}
    
    orders = await db.orders.find(filter_condition, {"_id": 0}).sort("created_at", -1).to_list(None)
    
    # Handle missing customer_name field for backward compatibility
    result_orders = []
    for order in orders:
        if "customer_name" not in order:
            order["customer_name"] = f"Customer {order.get('card_code', 'Unknown')}"
        result_orders.append(Order(**order))
    
    return {"orders": result_orders}

@api_router.get("/orders/{order_id}")
async def get_order(
    order_id: str,
    current_user: User = Depends(get_current_user)
):
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check permissions
    if current_user.role == UserRole.SELLER and order["salesperson_code"] != current_user.sap_salesperson_code:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get order lines
    lines = await db.order_lines.find({"order_id": order_id}).to_list(None)
    order_obj = Order(**order)
    order_dict = order_obj.dict()
    order_dict["lines"] = lines
    
    return order_dict

@api_router.post("/orders/{order_id}/retry")
async def retry_order_sync(
    order_id: str,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.SUPERVISOR]))
):
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order["status"] != OrderStatus.ERROR.value:
        raise HTTPException(status_code=400, detail="Order is not in error state")
    
    # Reset status and retry
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"status": OrderStatus.QUEUED.value, "error_message": None}}
    )
    
    asyncio.create_task(sync_order_to_sap(order_id))
    return {"message": "Order retry initiated"}

@api_router.get("/sap/orders/by-external/{external_id}")
async def get_sap_order_by_external_id(
    external_id: str,
    current_user: User = Depends(require_role([UserRole.ADMIN, UserRole.SUPERVISOR]))
):
    result = await sap.find_order_by_external_id(external_id)
    return {"order": result}

@api_router.get("/health/sap")
async def sap_health_check(current_user: User = Depends(get_current_user)):
    try:
        config = await sap.get_config()
        login_success = await sap.login()
        return {
            "status": "healthy" if login_success else "error",
            "mode": config["sap_mode"],
            "connection_status": config.get("connection_status", "unknown"),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        return {
            "status": "error",
            "mode": "unknown",
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(
    month: Optional[int] = None,
    year: Optional[int] = None,
    current_user: User = Depends(get_current_user)
):
    # Default to current month if not specified
    if not month or not year:
        now = datetime.now(timezone.utc)
        month = now.month
        year = now.year
    
    # Calculate month range
    start_date = datetime(year, month, 1, tzinfo=timezone.utc)
    if month == 12:
        end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end_date = datetime(year, month + 1, 1, tzinfo=timezone.utc)
    
    if current_user.role == UserRole.SELLER:
        # Seller-specific dashboard
        filter_condition = {"salesperson_code": current_user.sap_salesperson_code}
        
        # Count orders by status for this seller
        order_stats = {}
        for status in OrderStatus:
            count = await db.orders.count_documents({**filter_condition, "status": status.value})
            order_stats[status.value] = count
        
        # Count quotes by status for this seller
        quote_stats = {}
        for status in QuoteStatus:
            count = await db.quotes.count_documents({**filter_condition, "status": status.value})
            quote_stats[status.value] = count
        
        # Calculate seller's monthly sales
        monthly_orders = await db.orders.find({
            **filter_condition,
            "status": {"$in": [OrderStatus.SYNCED.value, OrderStatus.INVOICED.value]},
            "created_at": {"$gte": start_date, "$lt": end_date}
        }).to_list(None)
        
        monthly_sales = sum(order.get("grand_total", 0) for order in monthly_orders)
        
        # Calculate quote conversion rate
        total_quotes = await db.quotes.count_documents({
            **filter_condition,
            "created_at": {"$gte": start_date, "$lt": end_date}
        })
        won_quotes = await db.quotes.count_documents({
            **filter_condition,
            "status": QuoteStatus.WON.value,
            "created_at": {"$gte": start_date, "$lt": end_date}
        })
        
        conversion_rate = (won_quotes / total_quotes * 100) if total_quotes > 0 else 0
        
        # Get seller's customers count
        customers = await sap.get_customers("", current_user.sap_salesperson_code)
        customer_count = len(customers)
        
        return {
            "monthly_sales": monthly_sales,
            "monthly_target": current_user.monthly_target,
            "target_progress": (monthly_sales / current_user.monthly_target * 100) if current_user.monthly_target > 0 else 0,
            "order_stats": order_stats,
            "quote_stats": quote_stats,
            "quote_conversion_rate": conversion_rate,
            "total_quotes_month": total_quotes,
            "customer_count": customer_count,
            "pending_sync": await db.orders.count_documents({**filter_condition, "status": OrderStatus.QUEUED.value}),
            "user_role": "seller",
            "current_month": month,
            "current_year": year,
            "month_name": calendar.month_name[month]
        }
    else:
        # Admin/Supervisor dashboard - global view
        order_stats = {}
        for status in OrderStatus:
            count = await db.orders.count_documents({"status": status.value})
            order_stats[status.value] = count
        
        quote_stats = {}
        for status in QuoteStatus:
            count = await db.quotes.count_documents({"status": status.value})
            quote_stats[status.value] = count
        
        # Global monthly sales
        monthly_orders = await db.orders.find({
            "status": {"$in": [OrderStatus.SYNCED.value, OrderStatus.INVOICED.value]},
            "created_at": {"$gte": start_date, "$lt": end_date}
        }).to_list(None)
        
        monthly_sales = sum(order.get("grand_total", 0) for order in monthly_orders)
        
        # Global quote conversion
        total_quotes = await db.quotes.count_documents({
            "created_at": {"$gte": start_date, "$lt": end_date}
        })
        won_quotes = await db.quotes.count_documents({
            "status": QuoteStatus.WON.value,
            "created_at": {"$gte": start_date, "$lt": end_date}
        })
        
        conversion_rate = (won_quotes / total_quotes * 100) if total_quotes > 0 else 0
        
        # Get total customers
        customers = await sap.get_customers("")
        customer_count = len(customers)
        
        # Get sellers count
        sellers_count = await db.users.count_documents({"role": UserRole.SELLER.value})
        
        config = await sap.get_config()
        
        return {
            "monthly_sales": monthly_sales,
            "order_stats": order_stats,
            "quote_stats": quote_stats,
            "quote_conversion_rate": conversion_rate,
            "total_quotes_month": total_quotes,
            "customer_count": customer_count,
            "sellers_count": sellers_count,
            "pending_sync": await db.orders.count_documents({"status": OrderStatus.QUEUED.value}),
            "sap_mode": config["sap_mode"],
            "sap_status": config.get("connection_status", "unknown"),
            "user_role": "admin",
            "current_month": month,
            "current_year": year,
            "month_name": calendar.month_name[month]
        }

# Background tasks
async def sync_order_to_sap(order_id: str):
    """Background task to sync order to SAP"""
    try:
        order = await db.orders.find_one({"id": order_id})
        if not order:
            return
        
        # Check if already exists in SAP
        existing = await sap.find_order_by_external_id(order["external_id"])
        if existing:
            await db.orders.update_one(
                {"id": order_id},
                {"$set": {
                    "status": OrderStatus.SYNCED.value,
                    "sap_docentry": existing.get("DocEntry"),
                    "sap_docnum": existing.get("DocNum"),
                    "updated_at": datetime.now(timezone.utc)
                }}
            )
            return
        
        # Get order lines
        order_lines = await db.order_lines.find({"order_id": order_id}).to_list(None)
        
        # Create in SAP
        sap_data = {
            "CardCode": order["card_code"],
            "DocDate": datetime.now().strftime("%Y-%m-%d"),
            "DocDueDate": datetime.now().strftime("%Y-%m-%d"),
            "Comments": f"Pedido desde portal - {order['external_id']}",
            "SalesPersonCode": order["salesperson_code"],
            "U_ExternalId": order["external_id"],
            "DocumentLines": []
        }
        
        # Add document lines
        for line in order_lines:
            sap_line = {
                "ItemCode": line["item_code"],
                "Quantity": line["quantity"],
                "UnitPrice": line["unit_price"],
                "WarehouseCode": line["warehouse_code"],
                "TaxCode": line.get("tax_code", "IVA"),
                "DiscountPercent": line["discount_pct"]
            }
            sap_data["DocumentLines"].append(sap_line)
        
        result = await sap.create_order(sap_data)
        
        if result.get("success"):
            await db.orders.update_one(
                {"id": order_id},
                {"$set": {
                    "status": OrderStatus.SYNCED.value,
                    "sap_docentry": result.get("DocEntry"),
                    "sap_docnum": result.get("DocNum"),
                    "updated_at": datetime.now(timezone.utc)
                }}
            )
        else:
            await db.orders.update_one(
                {"id": order_id},
                {"$set": {
                    "status": OrderStatus.ERROR.value,
                    "error_message": result.get("error", "Unknown error"),
                    "updated_at": datetime.now(timezone.utc)
                }}
            )
    
    except Exception as e:
        await db.orders.update_one(
            {"id": order_id},
            {"$set": {
                "status": OrderStatus.ERROR.value,
                "error_message": str(e),
                "updated_at": datetime.now(timezone.utc)
            }}
        )

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    # Create default admin user if not exists
    admin_user = await db.users.find_one({"email": "admin@difratti.com"})
    if not admin_user:
        admin_data = {
            "id": str(uuid.uuid4()),
            "email": "admin@difratti.com",
            "password_hash": get_password_hash("admin123"),
            "full_name": "Administrador",
            "role": UserRole.ADMIN.value,
            "is_active": True,
            "sap_salesperson_code": 1,
            "monthly_target": 0.0,
            "assigned_customers": [],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        await db.users.insert_one(admin_data)
        logger.info("Created default admin user: admin@difratti.com / admin123")
    
    # Create default seller user if not exists
    seller_user = await db.users.find_one({"email": "vendedor@difratti.com"})
    if not seller_user:
        seller_data = {
            "id": str(uuid.uuid4()),
            "email": "vendedor@difratti.com",
            "password_hash": get_password_hash("vendedor123"),
            "full_name": "Vendedor Demo",
            "role": UserRole.SELLER.value,
            "is_active": True,
            "sap_salesperson_code": 3,
            "monthly_target": 50000.0,
            "assigned_customers": ["C20003", "C20004", "C20006"],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        await db.users.insert_one(seller_data)
        logger.info("Created default seller user: vendedor@difratti.com / vendedor123")
    
    # Initialize SAP config
    config_exists = await db.sap_config.find_one({})
    if not config_exists:
        await db.sap_config.insert_one(DEFAULT_SAP_CONFIG)
        logger.info("Initialized SAP configuration")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()