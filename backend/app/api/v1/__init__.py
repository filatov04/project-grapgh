from fastapi import APIRouter
from api.v1.competencies import router as competencies_router
from api.v1.comments import router as comments_router
from api.v1.auth import router as auth_router

router = APIRouter()

router.include_router(
    auth_router,
    tags=["auth"]
)

router.include_router(
    competencies_router,
    tags=["competencies"]
)

router.include_router(
    comments_router,
    tags=["comments"]
)

__all__ = ["router"]
