---
title: 在 Cloudflare Pages 中管理博客环境变量
description: 记录个人博客部署到 Cloudflare Pages 后，如何统一配置站点域名、邮箱与 GitHub 地址。
pubDate: 2026-04-08
tags:
  - Cloudflare
  - 部署
  - 环境变量
featured: false
draft: false
---

## 为什么要把配置放进环境变量

如果域名、联系方式和仓库链接都直接写死在代码里，后续切换品牌或迁移域名会比较麻烦。把这些信息放进 Cloudflare Pages 环境变量，可以明显降低维护成本。

### 哪些值适合提出来

对这个博客来说，最适合抽成环境变量的是站点主域名、联系邮箱和 GitHub 地址。这些值会同时影响页面展示、RSS 和 SEO 输出。

## 推荐的变量设计

目前站点使用三项公开变量：`PUBLIC_SITE_URL`、`PUBLIC_CONTACT_EMAIL`、`PUBLIC_GITHUB_URL`。

### 站点域名

`PUBLIC_SITE_URL` 决定 canonical、RSS、sitemap 等绝对地址的生成结果。它应该始终使用线上正式域名。

### 联系方式

`PUBLIC_CONTACT_EMAIL` 和 `PUBLIC_GITHUB_URL` 负责关于页、联系页以及首页联系方式模块的展示。

## 配置后的检查顺序

每次修改变量后，我通常会按这个顺序检查：先访问首页，再看联系页，最后确认 `/rss.xml` 和 `/sitemap.xml` 输出是否正确。

```bash
npm run build
```

如果本地构建没问题，再让 Cloudflare Pages 重新部署，通常就能快速确认线上配置是否已经生效。

## 结语

环境变量不是额外负担，而是让博客在后续品牌调整和部署切换时更省心的一层保护。
