# 运维与排障

## 常用命令

启动数据库：

```bash
docker compose up -d postgres
```

启动完整容器：

```bash
docker compose up -d --build
```

停止容器：

```bash
docker compose down
```

查看容器：

```bash
docker compose ps
```

查看日志：

```bash
docker compose logs -f web
docker compose logs -f postgres
```

## 健康检查

```bash
curl http://127.0.0.1:8000/api/health
```

正常返回：

```json
{"ok": true}
```

## 前端刷新 404

项目已在 FastAPI 中配置 SPA fallback。以下路径刷新时应返回前端页面：

- `/`
- `/strategies`
- `/wrong`
- `/admin`
- `/users`
- `/practice`

如果 1Panel 或 Nginx 额外配置了反向代理，需要确认这些路径都转发给 Web 服务。

## 登录失败

检查：

- `SESSION_SECRET` 是否设置。
- `FIRST_ADMIN_USERNAME` 是否正确。
- 初始管理员是否已经创建过。
- 用户是否被禁用。

注意：如果管理员账号已经存在，修改 `FIRST_ADMIN_PASSWORD` 不会自动重置密码。需要在用户管理页重置，或手动更新数据库。

## 数据库连接失败

检查：

```bash
docker compose ps
docker compose logs postgres
```

确认 `DATABASE_URL` 指向正确地址。

本地直接运行后端时通常使用：

```env
DATABASE_URL=postgresql://pmp:pmp_password@127.0.0.1:5432/pmp_practice
```

容器内 Web 服务使用：

```env
DATABASE_URL=postgresql://pmp:pmp_password@postgres:5432/pmp_practice
```

## Docker 容器名

Compose 已固定容器名：

- `pmp-postgres`
- `pmp-web`

如果修改了 `container_name`，需要重新创建容器：

```bash
docker compose down
docker compose up -d
```
