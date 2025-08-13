from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Dict
import subprocess
import json

from . import crud, models, schemas
from .models import SessionLocal, create_db_and_tables

app = FastAPI()

# Create database tables on startup
@app.on_event("startup")
def on_startup():
    create_db_and_tables()

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/api/search")
def search_media_by_torname(torname: str, db: Session = Depends(get_db)):
    # 1. Try to find media in the local database
    media = crud.find_media_by_torname(db, torname)
    if media:
        return schemas.Media.from_orm(media)

    # 2. If not found, call external script
    try:
        # Note: Adjust the path to tmdbsearcher.py if necessary
        # The script is expected to be in the parent directory of 'app'
        result = subprocess.run(
            ["python", "tmdbsearcher.py", torname],
            capture_output=True,
            text=True,
            check=True,
            cwd="./backend"
        )
        tmdb_data = json.loads(result.stdout)

        # 3. If search is successful, save to DB
        media_create = schemas.MediaCreate(
            torname_regex=tmdb_data.get("torname_regex", torname), # Use a sensible default
            tmdb_id=tmdb_data["id"],
            tmdb_title=tmdb_data["title"],
            tmdb_cat=tmdb_data["category"],
            tmdb_poster=tmdb_data.get("poster_path")
        )
        new_media = crud.create_media(db, media_create)

        # 4. Create the associated torrent record
        torrent_create = schemas.TorrentCreate(name=torname)
        crud.create_torrent(db, torrent_create, new_media.id)

        # Refresh the object to get the new torrent relationship
        db.refresh(new_media)
        return schemas.Media.from_orm(new_media)

    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=404, detail=f"Torrent not found locally and external search failed: {e.stderr}")
    except (json.JSONDecodeError, KeyError) as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse external search result: {e}")

# --- Standard CRUD for Media ---
@app.post("/api/media/", response_model=schemas.Media)
def create_media(media: schemas.MediaCreate, db: Session = Depends(get_db)):
    return crud.create_media(db=db, media=media)

@app.get("/api/media/", response_model=List[schemas.Media])
def read_all_media(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    all_media = crud.get_all_media(db, skip=skip, limit=limit)
    return all_media

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
    # Verify media exists
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
