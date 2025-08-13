from pydantic import BaseModel
from typing import List, Optional

# --- Torrent Schemas ---

class TorrentBase(BaseModel):
    name: str

class TorrentCreate(TorrentBase):
    pass

class Torrent(TorrentBase):
    id: int
    media_id: int

    class Config:
        from_attributes = True

# --- Media Schemas ---

class MediaBase(BaseModel):
    torname_regex: str
    tmdb_id: int
    tmdb_title: str
    tmdb_cat: str
    tmdb_poster: Optional[str] = None

class MediaCreate(MediaBase):
    pass

class Media(MediaBase):
    id: int
    torrents: List[Torrent] = []

    class Config:
        from_attributes = True

class MediaPage(BaseModel):
    items: List[Media]
    total: int
