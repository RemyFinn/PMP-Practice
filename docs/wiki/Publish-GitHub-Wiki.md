# 发布到 GitHub Wiki

本目录是 GitHub Wiki 风格的 Markdown 页面，可以直接复制到仓库 Wiki。

## Wiki 仓库地址

GitHub Wiki 通常是独立仓库，地址类似：

```text
git@github.com:RemyFinn/PMP-Practice.wiki.git
```

或：

```text
https://github.com/RemyFinn/PMP-Practice.wiki.git
```

## 首次发布

在项目外选择一个临时目录：

```bash
cd /Users/remy/Desktop/PMP学习
git clone git@github.com:RemyFinn/PMP-Practice.wiki.git
cd PMP-Practice.wiki
cp ../PMP-Practice/docs/wiki/*.md .
git add .
git commit -m "docs: initialize project wiki"
git push
```

## 后续同步

```bash
cd /Users/remy/Desktop/PMP学习/PMP-Practice.wiki
cp ../PMP-Practice/docs/wiki/*.md .
git add .
git commit -m "docs: update wiki"
git push
```

## 注意

- GitHub Wiki 的首页文件名通常是 `Home.md`。
- `_Sidebar.md` 会作为侧边栏显示。
- 如果 Wiki 仓库还不存在，需要先在 GitHub 仓库页面启用 Wiki。
