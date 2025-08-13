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

from typing import List, Optional

from pydantic import BaseModel


class TorrentBase(BaseModel):
    name: str


class TorrentCreate(TorrentBase):
    pass


class Torrent(TorrentBase):
    id: int
    media_id: int

    class Config:
        orm_mode = True


class MediaBase(BaseModel):
    torname_regex: str
    tmdb_id: Optional[int] = None
    tmdb_title: Optional[str] = None
    tmdb_cat: Optional[str] = None
    tmdb_poster: Optional[str] = None
    tmdb_year: Optional[int] = None
    tmdb_genres: Optional[str] = None
    tmdb_preview: Optional[str] = None
    custom_title: Optional[str] = None
    custom_path: Optional[str] = None


class MediaCreate(MediaBase):
    pass


class MediaUpdate(MediaBase):
    torname_regex: Optional[str] = None
    tmdb_id: Optional[int] = None
    tmdb_title: Optional[str] = None
    tmdb_cat: Optional[str] = None
    tmdb_poster: Optional[str] = None
    tmdb_year: Optional[int] = None
    tmdb_genres: Optional[str] = None
    tmdb_preview: Optional[str] = None
    custom_title: Optional[str] = None
    custom_path: Optional[str] = None


class Media(MediaBase):
    id: int
    torrents: List[Torrent] = []

    class Config:
        orm_mode = True

class MediaPage(BaseModel):
    items: List[Media]
    total: int
