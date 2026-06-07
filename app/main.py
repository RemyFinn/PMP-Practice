from __future__ import annotations

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from .db import ROOT_DIR, init_db
from .routes import router


app = FastAPI(title="PMP Practice System")


@app.on_event("startup")
def on_startup() -> None:
    init_db()


app.include_router(router)
app.mount("/", StaticFiles(directory=ROOT_DIR / "static", html=True), name="static")
