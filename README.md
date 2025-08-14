# Torrent Media Db

This is a web application to manage a database of media entries and their associated torrents, with a smart search feature powered by TMDb.

## Project Structure

- `backend/`: Contains the Python FastAPI application.
- `frontend/`: Contains the React single-page application.

## Getting Started
### 安装
- 前端 `cd frontend; npm install; npm run build`
- 后端 `cd backend; source venv/bin/activate; pip -r requirements.txt`


### 启动
- 前端
```sh
cd frontend; npm start
```

- 后湍
```sh
cd backend; source venv/bin/activate
uvicorn app.main:app --reload
```

## 接口文档
* `/docs`, `/redoc` 
* 主要查询接口为： `/api/query`

