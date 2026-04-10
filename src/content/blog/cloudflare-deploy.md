---
title: 如何把个人博客部署到 Cloudflare Pages
description: 梳理 AJC 博客部署到 Cloudflare Pages 的核心思路与上线流程。
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

把部署链路整理清楚之后，后续无论是继续发文还是补充页面能力，都会更容易稳定上线。
