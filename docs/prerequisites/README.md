---
title: 前提条件
---

# 前提条件

为了安装研讨会的前提条件，您需要一个 Kubernetes 集群（**1.13** 或更新版本），并支持 **负载平衡器** 和 **RBAC**。
确保您已经在本地安装了以下工具：
* kubectl 1.16
* git 2.20

## Helm v3

Install the Helm v3 CLI on macOS:

```sh
brew install helm
```

On Linux or Windows you can download the binary from the [official releases page](https://github.com/helm/helm/releases).

## Git

Fork the [workshop](https://github.com/stefanprodan/gitops-helm-workshop) repository
and clone it locally (replace the `GHUSER` value with your GitHub username):

```sh
export GHUSER=stefanprodan
git clone https://github.com/${GHUSER}/gitops-helm-workshop
```

Set your GitHub username and email:

```sh
cd gitops-helm-workshop
git config user.name "${GHUSER}"
git config user.email "your@main.address"
```

Cluster state directory structure:

```
├── cluster
    ├── canaries
    ├── charts
    │   └── podinfo
    ├── namespaces
    └── releases
```

## Flux

Add Flux repository to Helm repos:

```sh
helm repo add fluxcd https://charts.fluxcd.io
```

Create the fluxcd namespace:

```sh
kubectl create ns fluxcd
```

Install Flux by providing your GitHub repository URL:

```sh
helm upgrade -i flux fluxcd/flux --wait \
--namespace fluxcd \
--set registry.pollInterval=1m \
--set git.pollInterval=1m \
--set git.url=git@github.com:${GHUSER}/gitops-helm-workshop
```

Install fluxctl:

```sh
# macOS and linux
curl -sL https://fluxcd.io/install | sh
export PATH=$PATH:$HOME/.fluxcd/bin

# windows
https://github.com/fluxcd/flux/releases
```

Find the Git SSH public key:

```sh
export FLUX_FORWARD_NAMESPACE=fluxcd

fluxctl identity
```

Copy the public key and create a deploy key with write access on your GitHub repository.
Go to `Settings > Deploy keys` click on `Add deploy key`, check `Allow write access`,
paste the Flux public key and click `Add key`.

## Helm Operator

Install Flux Helm Operator in the `fluxcd` namespace:

```sh
helm upgrade -i helm-operator fluxcd/helm-operator --wait \
--namespace fluxcd \
--set git.ssh.secretName=flux-git-deploy \
--set git.pollInterval=1m \
--set chartsSyncInterval=1m \
--set helm.versions=v3
```

## Linkerd

Download the Linkerd v2 CLI:

```sh
# macOS and linux
curl -sL https://run.linkerd.io/install | sh
export PATH=$PATH:$HOME/.linkerd2/bin

# windows
https://github.com/linkerd/linkerd2/releases
```

Install the Linkerd control plane in the `linkerd` namespace:

```sh
linkerd install | kubectl apply -f -
```

Validate the install with:

```sh
linkerd check
```

## Flagger

Add Flagger Helm repository:

```sh
helm repo add flagger https://flagger.app
```

Install Flagger's Canary CRD:

```sh
kubectl apply -f https://raw.githubusercontent.com/weaveworks/flagger/master/artifacts/flagger/crd.yaml
```

Install Flagger in the `linkerd` namespace:

```sh
helm upgrade -i flagger flagger/flagger --wait \
--namespace linkerd \
--set crd.create=false \
--set metricsServer=http://linkerd-prometheus:9090 \
--set meshProvider=linkerd
```
