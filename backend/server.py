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

# SAP Configuration
SAP_MODE = os.environ.get("SAP_MODE", "mock")  # mock or real
B1_HOST = os.environ.get("B1_HOST", "")
B1_COMPANY_DB = os.environ.get("B1_COMPANY_DB", "")
B1_USERNAME = os.environ.get("B1_USERNAME", "")
B1_PASSWORD = os.environ.get("B1_PASSWORD", "")
B1_SSL_VERIFY = os.environ.get("B1_SSL_VERIFY", "true").lower() == "true"
B1_TIMEOUT_MS = int(os.environ.get("B1_TIMEOUT_MS", "60000"))

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
    OPEN = "open"
    WON = "won"
    LOST = "lost"
    EXPIRED = "expired"

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    full_name: str
    role: UserRole
    is_active: bool = True
    sap_salesperson_code: Optional[int] = None
    team_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: UserRole
    sap_salesperson_code: Optional[int] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    role: UserRole
    full_name: str

class Customer(BaseModel):
    card_code: str
    card_name: str
    phone: Optional[str] = None
    price_list_num: Optional[int] = None
    balance: float = 0.0
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
    external_id: str
    card_code: str
    doc_date: str
    doc_due_date: str
    salesperson_code: int
    comments: Optional[str] = None
    lines: List[OrderLine]
    ship_to: Optional[Dict[str, Any]] = None
    bill_to: Optional[Dict[str, Any]] = None
    udfs: Optional[Dict[str, Any]] = None

class Order(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    external_id: str
    card_code: str
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
    error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# SAP Service Layer Adapter
class SAPServiceLayer:
    def __init__(self):
        self.session_cookies = {}
        self.timeout = B1_TIMEOUT_MS / 1000

    async def login(self):
        if SAP_MODE == "mock":
            self.session_cookies = {"B1SESSION": "mock-session", "ROUTEID": "mock-route"}
            return True
            
        try:
            async with httpx.AsyncClient(verify=B1_SSL_VERIFY, timeout=self.timeout) as client:
                login_data = {
                    "UserName": B1_USERNAME,
                    "Password": B1_PASSWORD,
                    "CompanyDB": B1_COMPANY_DB
                }
                response = await client.post(f"{B1_HOST}/Login", json=login_data)
                if response.status_code == 200:
                    self.session_cookies = response.cookies
                    return True
                return False
        except Exception as e:
            logger.error(f"SAP login failed: {e}")
            return False

    async def get_items(self, search: str = "", page: int = 1, page_size: int = 50):
        if SAP_MODE == "mock":
            return self._mock_items(search, page, page_size)
            
        # Real SAP implementation would go here
        return {"items": [], "total": 0}

    async def get_customers(self, search: str = ""):
        if SAP_MODE == "mock":
            return self._mock_customers(search)
            
        # Real SAP implementation would go here
        return []

    async def create_order(self, order_data: dict):
        if SAP_MODE == "mock":
            return {"DocEntry": 12345, "DocNum": "SO-2025-001", "success": True}
            
        # Real SAP implementation would go here
        return {"success": False, "error": "Not implemented"}

    async def find_order_by_external_id(self, external_id: str):
        if SAP_MODE == "mock":
            return None  # Not found in mock
            
        # Real SAP implementation would go here
        return None

    def _mock_items(self, search: str, page: int, page_size: int):
        mock_items = [
            {"ItemCode": "A00001", "ItemName": "Laptop HP Pavilion 15", "UOM": "Each", "IsActive": True},
            {"ItemCode": "A00002", "ItemName": "Mouse Inalámbrico Logitech", "UOM": "Each", "IsActive": True},
            {"ItemCode": "A00003", "ItemName": "Teclado Mecánico RGB", "UOM": "Each", "IsActive": True},
            {"ItemCode": "A00004", "ItemName": "Monitor 24 pulgadas LG", "UOM": "Each", "IsActive": True},
            {"ItemCode": "A00005", "ItemName": "Impresora Multifuncional Canon", "UOM": "Each", "IsActive": True}
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

    def _mock_customers(self, search: str):
        mock_customers = [
            {"CardCode": "C20001", "CardName": "Empresa Tecnológica S.A.", "Phone1": "2234-5678", "PriceListNum": 1, "Balance": 15750.00},
            {"CardCode": "C20002", "CardName": "Distribuidora Central", "Phone1": "2345-6789", "PriceListNum": 2, "Balance": 8920.50},
            {"CardCode": "C20003", "CardName": "Comercial del Norte", "Phone1": "2456-7890", "PriceListNum": 1, "Balance": 22100.25},
            {"CardCode": "C20004", "CardName": "Sistemas Integrados", "Phone1": "2567-8901", "PriceListNum": 3, "Balance": 5430.75}
        ]
        
        if search:
            mock_customers = [c for c in mock_customers if search.lower() in c["CardName"].lower()]
            
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
    result = await sap.get_customers(search)
    return {"customers": result}

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
        external_id=order_data.external_id,
        card_code=order_data.card_code,
        salesperson_code=order_data.salesperson_code,
        status=OrderStatus.QUEUED,
        total_before_tax=total_before_tax,
        tax_total=tax_total,
        grand_total=grand_total
    )
    
    # Save to database
    order_dict = order.dict()
    await db.orders.insert_one(order_dict)
    
    # Queue for SAP sync (in a real app, this would use a job queue)
    asyncio.create_task(sync_order_to_sap(order.id))
    
    return order

@api_router.get("/orders/{order_id}")
async def get_order(
    order_id: str,
    current_user: User = Depends(get_current_user)
):
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return Order(**order)

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
        login_success = await sap.login()
        return {
            "status": "healthy" if login_success else "error",
            "mode": SAP_MODE,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        return {
            "status": "error",
            "mode": SAP_MODE,
            "error": str(e),
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    # Basic KPIs for dashboard
    current_month = datetime.now(timezone.utc).replace(day=1)
    
    # Count orders by status
    order_stats = {}
    for status in OrderStatus:
        count = await db.orders.count_documents({"status": status.value})
        order_stats[status.value] = count
    
    # Monthly sales (mock data for now)
    monthly_sales = 125000.50
    
    # Pending sync count
    pending_sync = await db.orders.count_documents({"status": OrderStatus.QUEUED.value})
    
    return {
        "monthly_sales": monthly_sales,
        "order_stats": order_stats,
        "pending_sync": pending_sync,
        "sap_mode": SAP_MODE
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
        
        # Create in SAP
        sap_data = {
            "CardCode": order["card_code"],
            "DocDate": datetime.now().strftime("%Y-%m-%d"),
            "DocDueDate": datetime.now().strftime("%Y-%m-%d"),
            "Comments": f"Pedido desde portal - {order['external_id']}",
            "SalesPersonCode": order["salesperson_code"],
            "U_ExternalId": order["external_id"]
        }
        
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
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        await db.users.insert_one(seller_data)
        logger.info("Created default seller user: vendedor@difratti.com / vendedor123")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()