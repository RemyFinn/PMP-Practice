# 系统架构

## 模块

```text
React 前端
  |
FastAPI API
  |
PostgreSQL
```

FastAPI 同时负责：

- 提供 `/api/*` 接口。
- 托管 Vite 构建后的 `static/` 前端资源。
- 处理 React Router 的前端路由 fallback。

## 主要数据表

全局题库：

- `exams`
- `questions`
- `options`
- `strategies`
- `strategy_question_links`

用户与登录：

- `users`
- `auth_sessions`

个人练习数据：

- `attempts`
- `wrong_items`

## API 分组

认证：

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

用户管理：

- `GET /api/users`
- `POST /api/users`
- `PATCH /api/users/{user_id}`

题目：

- `GET /api/questions`
- `GET /api/questions/{question_id}`
- `POST /api/questions`
- `PATCH /api/questions/{question_id}`
- `DELETE /api/questions/{question_id}`

作答与错题：

- `POST /api/attempts`
- `PATCH /api/wrong-items/{question_id}`
- `PATCH /api/questions/{question_id}/wrong-count`
- `PATCH /api/questions/{question_id}/attempt-count`

思路总结：

- `GET /api/strategies`

健康检查：

- `GET /api/health`

## 前端路由

- `/`
- `/strategies`
- `/wrong`
- `/admin`
- `/users`
- `/practice`

管理员才能看到 `/admin` 和 `/users`。
