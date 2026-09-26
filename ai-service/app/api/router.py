from fastapi import APIRouter

from app.api.routes.health import router as health_router
from app.api.routes.analysis import router as analysis_router
from app.api.routes.quiz import router as quiz_router
from app.api.routes.learning_path import router as learning_path_router
from app.api.routes.reports import router as report_router
from app.api.routes.agent import router as agent_router
from app.api.routes.assignment import router as assignment_router

api_router = APIRouter()

api_router.include_router(health_router)
api_router.include_router(analysis_router)
api_router.include_router(quiz_router)
api_router.include_router(learning_path_router)
api_router.include_router(report_router)
api_router.include_router(agent_router)
api_router.include_router(assignment_router)