# PMP 做题系统 Wiki

这是 PMP 做题系统的项目 Wiki。它用于记录本地运行、阿里云 1Panel 部署、数据迁移、用户权限和日常运维。

## 快速入口

- [项目概览](Overview.md)
- [本地运行](Local-Setup.md)
- [阿里云 1Panel 部署](Deployment-1Panel.md)
- [一键部署到 ECS](One-Command-ECS-Deploy.md)
- [旧 SQLite 数据迁移](Data-Migration.md)
- [用户与权限](Users-and-Permissions.md)
- [运维与排障](Operations.md)
- [系统架构](Architecture.md)
- [发布到 GitHub Wiki](Publish-GitHub-Wiki.md)

## 当前技术栈

- 后端：FastAPI
- 前端：React + Vite + Tailwind
- 数据库：PostgreSQL
- 部署：Docker Compose，可由 1Panel 管理
- 认证：用户名密码 + HttpOnly Cookie Session

## 推荐阅读顺序

1. 先看 [项目概览](Overview.md)，了解系统能做什么。
2. 本地使用看 [本地运行](Local-Setup.md)。
3. 上阿里云看 [阿里云 1Panel 部署](Deployment-1Panel.md)。
4. 要保留旧数据看 [旧 SQLite 数据迁移](Data-Migration.md)。
