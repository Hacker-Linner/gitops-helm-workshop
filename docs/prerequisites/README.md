---
title: 前提条件
---

# 前提条件

为了安装研讨会的前提条件，您需要一个 Kubernetes 集群（**1.13** 或更新版本），并支持 **负载平衡器** 和 **RBAC**。
确保您已经在本地安装了以下工具：
* kubectl 1.16
* git 2.20

## Helm v3

在 macOS 上安装 Helm v3 CLI：

```sh
brew install helm
```

在 Linux 或 Windows 上，您可以从[官方发布页面](https://github.com/helm/helm/releases)下载二进制文件。

## Git

Fork [workshop](https://github.com/stefanprodan/gitops-helm-workshop) 仓库并克隆它到本地（使用你的 GitHub 用户名替换 `GHUSER`）：

```sh
export GHUSER=stefanprodan
git clone https://github.com/${GHUSER}/gitops-helm-workshop
```

设置您的 GitHub 用户名和电子邮件：

```sh
cd gitops-helm-workshop
git config user.name "${GHUSER}"
git config user.email "your@main.address"
```

集群状态目录结构：

```
├── cluster
    ├── canaries
    ├── charts
    │   └── podinfo
    ├── namespaces
    └── releases
```

## Flux

将 Flux 存储库添加到 Helm 存储库：

```sh
helm repo add fluxcd https://charts.fluxcd.io
```

创建 fluxcd namespace:

```sh
kubectl create ns fluxcd
```

通过提供您的 GitHub 存储库 URL 安装 Flux：

```sh
helm upgrade -i flux fluxcd/flux --wait \
--namespace fluxcd \
--set registry.pollInterval=1m \
--set git.pollInterval=1m \
--set git.url=git@github.com:${GHUSER}/gitops-helm-workshop
```

安装 fluxctl:

```sh
# macOS and linux
curl -sL https://fluxcd.io/install | sh
export PATH=$PATH:$HOME/.fluxcd/bin

# windows
https://github.com/fluxcd/flux/releases
```

找到 Git SSH 公钥：

```sh
export FLUX_FORWARD_NAMESPACE=fluxcd

fluxctl identity
```

复制公钥并在 GitHub 存储库上创建具有写访问权的部署密钥。转到 `Settings > Deploy keys`，单击 `Add deploy key`，选中 `Allow write access`，粘贴 Flux 公钥并单击 `Add key`。

## Helm Operator

在 `fluxcd` 命名空间中安装 Flux Helm Operator：

```sh
helm upgrade -i helm-operator fluxcd/helm-operator --wait \
--namespace fluxcd \
--set git.ssh.secretName=flux-git-deploy \
--set git.pollInterval=1m \
--set chartsSyncInterval=1m \
--set helm.versions=v3
```

## Linkerd

下载 Linkerd v2 CLI:

```sh
# macOS and linux
curl -sL https://run.linkerd.io/install | sh
export PATH=$PATH:$HOME/.linkerd2/bin

# windows
https://github.com/linkerd/linkerd2/releases
```

在 `linkerd` 名称空间中安装 Linkerd 控制平面：

```sh
linkerd install | kubectl apply -f -
```

使用以下命令验证安装：

```sh
linkerd check
```

## Flagger

添加 Flagger Helm 仓库：

```sh
helm repo add flagger https://flagger.app
```

安装 Flagger 的金丝雀 CRD:

```sh
kubectl apply -f https://raw.githubusercontent.com/weaveworks/flagger/master/artifacts/flagger/crd.yaml
```

在 `linkerd` 命名空间中安装 Flagger：

```sh
helm upgrade -i flagger flagger/flagger --wait \
--namespace linkerd \
--set crd.create=false \
--set metricsServer=http://linkerd-prometheus:9090 \
--set meshProvider=linkerd
```
