from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.organizations import router as org_router
from app.api.v1.services import router as srv_router
from app.api.v1.counters import router as ctr_router
from app.api.v1.tokens import router as tkn_router
from app.api.v1.devices import router as dev_router
from app.api.v1.analytics import router as ana_router
from app.api.v1.notifications import router as not_router
from app.api.v1.ws import router as ws_router

api_v1_router = APIRouter()

api_v1_router.include_router(auth_router)
api_v1_router.include_router(org_router)
api_v1_router.include_router(srv_router)
api_v1_router.include_router(ctr_router)
api_v1_router.include_router(tkn_router)
api_v1_router.include_router(dev_router)
api_v1_router.include_router(ana_router)
api_v1_router.include_router(not_router)
api_v1_router.include_router(ws_router)
