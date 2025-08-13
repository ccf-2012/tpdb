import configparser
from pathlib import Path

# A simple object to hold the settings, mimicking the previous structure
class Settings:
    def __init__(self, parser):
        self.tmdb_api_key = parser.get("tmdb", "api_key", fallback=None)
        if not self.tmdb_api_key or self.tmdb_api_key == 'your_api_key_here':
            raise ValueError("API key not found or not set in [tmdb] section of config.ini")

# --- Main Configuration Loading Logic ---

# Path to the config.ini file, expected to be in the `backend` directory
config_file_path = Path(__file__).parent.parent / "config.ini"

if not config_file_path.is_file():
    raise FileNotFoundError(
        f"Configuration file not found at {config_file_path}. "
        f"Please rename 'config.ini.example' to 'config.ini' and set your API key."
    )

config_parser = configparser.ConfigParser()
config_parser.read(config_file_path)

# Create a single, importable instance of the settings
settings = Settings(config_parser)