---
title: GitOps Helm 研讨会
meta:
  - name: keywords
    content: gitops kubernetes helm fluxcd linkerd flagger
home: true
sidebar: auto
heroImage: /helm-workshop-qrcode.png
heroText: Kubernetes的渐进式交付
tagline: 欢迎来到 GitOps Helm 研讨会
actionText: 快速上手 →
actionLink: /intro/
features:
- title: Flux CD
  details: Flux 是一个 Kubernetes 控制器，它可以自动确保集群的状态与 git 中的配置匹配。Helm Operator 是Kubernetes CRD 控制器，用于管理 Helm 发布生命周期。
- title: Linkerd
  details: Linkerd v2 是 Kubernetes 的轻量级，易于安装和维护的服务网格。对于 HTTP 和 gRPC 应用程序，Linkerd 使用零配置自动启用负载平衡，跟踪，Prometheus 指标和 mTLS。
- title: Flagger
  details: Flagger 是 Kubernetes Operator，使用 Linkerd 路由进行流量转移，Prometheus 指标进行金丝雀分析和 Helm 进行测试，从而自动促进金丝雀部署的升级。
footer: Apache License 2.0 | Copyright © 2020 Weaveworks & 公众号：黑客下午茶
---
