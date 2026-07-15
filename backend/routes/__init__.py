from .auth            import router as auth_router
from .users           import router as users_router
from .workouts        import router as workouts_router
from .metrics         import router as metrics_router
from .analytics       import router as analytics_router
from .exercises       import router as exercises_router
from .recommendations import router as reco_router
from .notifications   import router as notif_router

__all__ = ["auth_router","users_router","workouts_router","metrics_router",
           "analytics_router","exercises_router","reco_router","notif_router"]
