---
title: 介绍
---

# 介绍

本指南将引导您在 Kubernetes 集群上设置渐进式交付 GitOps 管道。

## GitOps 是什么？

GitOps 是一种进行持续交付的方法，它通过将 Git 用作声明性基础结构和工作负载的真实来源来工作。对于 Kubernetes，这意味着使用 `git push` 代替 `kubectl create/apply` 或者 `kubectl create/apply`。

::: tip GitOps vs CiOps

在传统的 CI/CD 管道中，CD 是由持续集成工具支持的实现扩展，用于将构建工件升级到生产环境。在 GitOps 管道模型中，对生产的任何更改必须先在源代码管理中提交（最好通过拉取请求），然后再应用于集群。如果整个生产状态受版本控制并在单个Git 存储库中进行描述，则在灾难发生时，可以快速恢复整个基础架构，而无需重新运行 CI 管道。

[Kubernetes 反模式：让我们做 GitOps，而不是 CIOps！](https://www.weave.works/blog/kubernetes-anti-patterns-let-s-do-gitops-not-ciops)
:::

为了将 GitOps 模型应用到 Kubernetes 上，你需要做三件事：

* 一个 Git 存储库，其中包含以 YAM 格式定义的工作负载、Helm charts 和定义集群所需状态的任何其他 Kubernetes 自定义资源
* 一个容器注册中心（registry），CI 系统在其中推送不可变的镜像（没有 *latest* 标签，使用 *语义版本控制* 或 git *commit sha*）
* 一个进行双向同步的 Kubernetes 控制器：
    * 监视配置存储库中的更改并将其应用于您的集群
    * 监视容器 registry（注册中心） 的新映像，并根据部署策略更新工作负载定义。

在本研讨会中，您将使用 GitHub 托管配置存储库，使用 Docker Hub 作为容器注册中心，使用 [Flux](https://github.com/fluxcd/flux) 作为 GitOps 控制器，并使用 [Helm Operator](https://github.com/fluxcd/helm-operator) 进行应用程序生命周期管理。

## 什么是渐进式交付？

渐进式交付是高级部署模式（如金丝雀，功能标记和 A/B 测试）的总称。
通过给予应用程序开发人员和 SRE 团队对爆炸半径的细粒度控制，渐进交付技术被用来降低在生产中引入新软件版本的风险。

::: tip 金丝雀发布

使用金丝雀的好处是能够在生产环境中使用发现问题的安全回滚策略对新版本进行容量测试。通过缓慢增加负载，您可以监视和捕获有关新版本如何影响生产环境的指标。

[Martin Fowler 博客](https://martinfowler.com/bliki/CanaryRelease.html)
:::

在本研讨会中，您将使用
[Flagger](https://github.com/weaveworks/flagger),
[Linkerd](https://github.com/linkerd/linkerd2) 和
[Prometheus](https://github.com/prometheus)
来自动化金丝雀分布 Helm charts。
