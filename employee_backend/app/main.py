from fastapi import FastAPI
from app.routes import auth, users, clock

app = FastAPI(title="Employee Management API")

# Include routers with prefixes
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(clock.router, prefix="/api/clock", tags=["Clock"]) 

@app.get("/")
async def root():
    return {"message": "Employee Management API", "version": "1.0.0"}

@app.get("/api/health")
async def health():
    return {"status": "healthy"}