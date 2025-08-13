from sqlalchemy.orm import Session
import re
from . import models, schemas

# --- Read Operations ---

def get_media(db: Session, media_id: int):
    return db.query(models.Media).filter(models.Media.id == media_id).first()

from sqlalchemy.orm import Session
from sqlalchemy import func
from . import models, schemas

def get_all_media(db: Session, skip: int = 0, limit: int = 100):
    # 1. Get the total count of distinct groups (tmdb_id)
    total_groups = db.query(func.count(models.Media.tmdb_id.distinct())).scalar()

    # 2. Get the paginated list of distinct tmdb_id's
    paginated_tmdb_ids_query = db.query(models.Media.tmdb_id).distinct().offset(skip).limit(limit)
    paginated_tmdb_ids = [id[0] for id in paginated_tmdb_ids_query.all()]

    if not paginated_tmdb_ids:
        return {"items": [], "total": total_groups}

    # 3. Get all media items that belong to the paginated tmdb_id's
    media_items = db.query(models.Media).filter(models.Media.tmdb_id.in_(paginated_tmdb_ids)).all()
    
    return {"items": media_items, "total": total_groups}

def find_torrent_by_name(db: Session, name: str) -> models.Torrent | None:
    return db.query(models.Torrent).filter(models.Torrent.name == name).first()

def find_media_by_torname_regex(db: Session, torname: str) -> models.Media | None:
    all_media = db.query(models.Media).all()
    for media in all_media:
        try:
            if re.search(media.torname_regex, torname, re.IGNORECASE):
                return media
        except re.error:
            # Ignore invalid regex patterns in the database
            continue
    return None

def find_media_by_title(db: Session, title: str) -> models.Media | None:
    all_media = db.query(models.Media).all()
    for media in all_media:
        try:
            if re.search(media.torname_regex, title, re.IGNORECASE):
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

def update_media(db: Session, media_id: int, media_update: schemas.MediaUpdate) -> models.Media | None:
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
