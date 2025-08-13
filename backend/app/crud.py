from sqlalchemy.orm import Session
import re
from . import models, schemas

# --- Read Operations ---

def get_media(db: Session, media_id: int):
    return db.query(models.Media).filter(models.Media.id == media_id).first()

def get_all_media(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Media).offset(skip).limit(limit).all()

def find_media_by_torname(db: Session, torname: str) -> models.Media | None:
    all_media = db.query(models.Media).all()
    for media in all_media:
        try:
            if re.search(media.torname_regex, torname, re.IGNORECASE):
                return media
        except re.error:
            # Ignore invalid regex patterns in the database
            continue
    return None

# --- Create Operations ---

def create_media(db: Session, media: schemas.MediaCreate) -> models.Media:
    db_media = models.Media(**media.model_dump())
    db.add(db_media)
    db.commit()
    db.refresh(db_media)
    return db_media

def create_torrent(db: Session, torrent: schemas.TorrentCreate, media_id: int) -> models.Torrent:
    db_torrent = models.Torrent(**torrent.model_dump(), media_id=media_id)
    db.add(db_torrent)
    db.commit()
    db.refresh(db_torrent)
    return db_torrent

# --- Update Operations ---

def update_media(db: Session, media_id: int, media_update: schemas.MediaCreate) -> models.Media | None:
    db_media = get_media(db, media_id)
    if db_media:
        for key, value in media_update.model_dump(exclude_unset=True).items():
            setattr(db_media, key, value)
        db.commit()
        db.refresh(db_media)
    return db_media

# --- Delete Operations ---

def delete_media(db: Session, media_id: int) -> models.Media | None:
    db_media = get_media(db, media_id)
    if db_media:
        db.delete(db_media)
        db.commit()
    return db_media

def delete_torrent(db: Session, torrent_id: int) -> models.Torrent | None:
    db_torrent = db.query(models.Torrent).filter(models.Torrent.id == torrent_id).first()
    if db_torrent:
        db.delete(db_torrent)
        db.commit()
    return db_torrent
