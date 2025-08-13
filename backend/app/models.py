from sqlalchemy import create_engine, Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship, sessionmaker
from sqlalchemy.ext.declarative import declarative_base

DATABASE_URL = "sqlite:///./tmdb_media.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Media(Base):
    __tablename__ = "media"

    id = Column(Integer, primary_key=True, index=True)
    torname_regex = Column(String, unique=True, index=True, nullable=False)
    tmdb_id = Column(Integer, index=True, nullable=False)
    tmdb_title = Column(String, nullable=False)
    tmdb_cat = Column(String, nullable=False)
    tmdb_poster = Column(String)  # URL to the poster image

    torrents = relationship("Torrent", back_populates="media", cascade="all, delete-orphan")

class Torrent(Base):
    __tablename__ = "torrents"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    media_id = Column(Integer, ForeignKey("media.id"), nullable=False)

    media = relationship("Media", back_populates="torrents")

def create_db_and_tables():
    Base.metadata.create_all(bind=engine)

