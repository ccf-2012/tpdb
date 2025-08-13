import os
import sys
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

# Adjust sys.path to allow imports from the parent `backend` directory
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'torcp2')))

from torcp2.tmdbsearcher import TMDbSearcher
from torcp2.torinfo import TorrentParser
from app import crud, models, schemas
from app.models import SessionLocal, create_db_and_tables
from app.config import settings

app = FastAPI()

# Initialize TMDbSearcher at startup using the key from config
# pydantic will raise an error on startup if the key is missing.
searcher = TMDbSearcher(tmdb_api_key=settings.tmdb_api_key)

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/api/search", response_model=schemas.Media)
def search_media_by_torname(torname: str, db: Session = Depends(get_db)):
    media = crud.find_media_by_torname(db, torname)
    if media:
        return media

    # 1. Parse torrent name
    torinfo = TorrentParser.parse(torname)
    if not torinfo:
        raise HTTPException(status_code=400, detail="Failed to parse torrent name.")

    # 2. Search TMDb using the parsed info
    found = searcher.searchTMDb(torinfo)
    if not found:
        raise HTTPException(status_code=404, detail=f"Could not find TMDb match for \"{torname}\"")

    # 3. If search is successful, save to DB
    try:
        media_create = schemas.MediaCreate(
            torname_regex=torinfo.media_title,  # Using the original name as regex for simplicity
            tmdb_id=torinfo.tmdb_id,
            tmdb_title=torinfo.tmdb_title,
            tmdb_cat=torinfo.tmdb_cat,
            tmdb_poster=torinfo.poster_path
        )
        new_media = crud.create_media(db, media_create)

        torrent_create = schemas.TorrentCreate(name=torname)
        crud.create_torrent(db, torrent_create, new_media.id)

        db.refresh(new_media)
        return new_media
    except Exception as e:
        # Catch potential database or validation errors
        raise HTTPException(status_code=500, detail=f"Failed to save media to database: {e}")

# --- Standard CRUD for Media ---
@app.post("/api/media/", response_model=schemas.Media)
def create_media(media: schemas.MediaCreate, db: Session = Depends(get_db)):
    return crud.create_media(db=db, media=media)

@app.get("/api/media/", response_model=schemas.MediaPage)
def read_all_media(skip: int = 0, limit: int = 10, db: Session = Depends(get_db)):
    return crud.get_all_media(db, skip=skip, limit=limit)

@app.get("/api/media/{media_id}", response_model=schemas.Media)
def read_media(media_id: int, db: Session = Depends(get_db)):
    db_media = crud.get_media(db, media_id=media_id)
    if db_media is None:
        raise HTTPException(status_code=404, detail="Media not found")
    return db_media

@app.put("/api/media/{media_id}", response_model=schemas.Media)
def update_media(media_id: int, media: schemas.MediaCreate, db: Session = Depends(get_db)):
    db_media = crud.update_media(db, media_id, media)
    if db_media is None:
        raise HTTPException(status_code=404, detail="Media not found")
    return db_media

@app.delete("/api/media/{media_id}", response_model=schemas.Media)
def delete_media(media_id: int, db: Session = Depends(get_db)):
    db_media = crud.delete_media(db, media_id)
    if db_media is None:
        raise HTTPException(status_code=404, detail="Media not found")
    return db_media

# --- Standard CRUD for Torrents ---
@app.post("/api/torrents/", response_model=schemas.Torrent)
def create_torrent_for_media(media_id: int, torrent: schemas.TorrentCreate, db: Session = Depends(get_db)):
    db_media = crud.get_media(db, media_id=media_id)
    if db_media is None:
        raise HTTPException(status_code=404, detail="Media not found")
    return crud.create_torrent(db=db, torrent=torrent, media_id=media_id)

@app.delete("/api/torrents/{torrent_id}", response_model=schemas.Torrent)
def delete_torrent(torrent_id: int, db: Session = Depends(get_db)):
    db_torrent = crud.delete_torrent(db, torrent_id)
    if db_torrent is None:
        raise HTTPException(status_code=404, detail="Torrent not found")
    return db_torrent
