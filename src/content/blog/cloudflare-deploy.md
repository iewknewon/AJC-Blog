---
title: 如何把个人博客部署到 Cloudflare Pages
description: 用第二篇文章验证归档、标签聚合和上一篇下一篇导航。
pubDate: 2026-04-05
tags:
  - Cloudflare
  - 部署
  - Astro
featured: true
draft: false
---

## 部署目标

我们希望把博客构建成静态站点，然后直接交给 Cloudflare Pages 托管。

### 构建输出

Astro 会把页面输出到 `dist` 目录。

### 部署优势

Cloudflare Pages 对静态站点非常友好，接入成本低，速度也很稳定。

## 推荐流程

1. 本地开发
2. 构建验证
3. 推送部署

## 结语

这一篇文章主要用于验证多文章场景下的页面行为。
