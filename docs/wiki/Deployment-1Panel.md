# 阿里云 1Panel 部署

本项目推荐部署在阿里云 ECS，并使用 1Panel 管理 Docker Compose、域名反代和 HTTPS。

## 部署结构

```text
浏览器
  |
域名 + HTTPS
  |
1Panel 反向代理
  |
pmp-web:8000
  |
pmp-postgres:5432
```

## 服务器准备

1. 购买阿里云 ECS。
2. 安装 Docker。
3. 安装 1Panel。
4. 在安全组开放需要的端口：
   - `80`
   - `443`
   - `22` 仅放行你的当前公网 IP，用于 SSH 一键部署

应用端口建议只监听服务器本机，例如 `127.0.0.1:18000`，不要直接对公网开放。

## 1Panel 编排

在 1Panel 中创建应用编排，使用项目内的：

```text
docker-compose.yml
```

当前容器名固定为：

- `pmp-postgres`
- `pmp-web`

因此不会出现 `pmp-practice-system-postgres-1` 这种自动实例编号。

## 环境变量

线上建议设置：

```env
POSTGRES_DB=pmp_practice
POSTGRES_USER=pmp
POSTGRES_PASSWORD=替换成强密码
SESSION_SECRET=替换成长随机字符串
FIRST_ADMIN_USERNAME=remy
FIRST_ADMIN_PASSWORD=替换成强密码
FIRST_ADMIN_DISPLAY_NAME=Remy
COOKIE_SECURE=1
WEB_HOST=127.0.0.1
WEB_PORT=18000
POSTGRES_HOST=127.0.0.1
NPM_REGISTRY=https://registry.npmmirror.com
PIP_INDEX_URL=https://mirrors.aliyun.com/pypi/simple
PIP_TRUSTED_HOST=mirrors.aliyun.com
```

`COOKIE_SECURE=1` 表示 Cookie 只在 HTTPS 下发送，线上建议开启。

## 域名与 HTTPS

在 1Panel 网站或反向代理中：

1. 绑定域名。
2. 反向代理到服务器本机 `127.0.0.1:18000`。
3. 开启 HTTPS。
4. 访问 `/api/health` 验证服务。

健康检查返回：

```json
{"ok": true}
```

## 数据持久化

PostgreSQL 数据保存在 Docker volume：

```text
postgres_data
```

部署后必须定期备份这个 volume 或导出 PostgreSQL 数据。
