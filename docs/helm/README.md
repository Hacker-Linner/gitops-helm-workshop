---
title: Helm 发布
---

# Helm 发布

一个 chart 发布是通过 Kubernetes 自定义资源 **HelmRelease** 进行描述的。

一个 Helm release 可以引用的 chart，如下：
* 通过 HTTPS 的公共或私有 Helm 存储库
* 通过 SSH 的公共或私有 Git 存储库

## 安装 NGINX

为了将应用程序暴露在集群之外，您将使用 NGINX ingress 控制器。控制器将在 Linkerd 网格内运行。

创建一个启用 linkerd 注入的名称空间:

```yaml{5}
apiVersion: v1
kind: Namespace
metadata:
  annotations:
    fluxcd.io/ignore: "false"
    linkerd.io/inject: enabled
  name: ingress-nginx
```

创建一个 Helm release 来安装 NGINX ingress 控制器:

```yaml{7}
apiVersion: helm.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: nginx-ingress
  namespace: ingress-nginx
  annotations:
    fluxcd.io/ignore: "false"
spec:
  releaseName: nginx-ingress
  chart:
    repository: https://kubernetes-charts.storage.googleapis.com/
    name: nginx-ingress
    version: 1.33.4
  values:
    controller:
      service:
        type: LoadBalancer
```

应用更改：

```sh
git add -A && \
git commit -m "install ingress" && \
git push origin master && \
fluxctl sync
```

验证 Helm operator 是否已安装 release：

```sh
kubectl -n ingress-nginx get hr
```

查找 ingress 控制器的公共 IP：

```sh
kubectl -n ingress-nginx get svc
```

## 安装 podinfo

[Podinfo](http://github.com/stefanprodan/podinfo) 是一个很小的 Go Web 应用程序。您将使用存储 `cluster/charts/podinfo` 的 git 仓库中的 Helm chart 安装 podinfo。

创建启用 linkerd 注入的 `prod` 命名空间：

```yaml{5}
apiVersion: v1
kind: Namespace
metadata:
  annotations:
    fluxcd.io/ignore: "false"
    linkerd.io/inject: enabled
  name: prod
```

创建一个 Helm release 以安装 podinfo chart（替换 `GHUSER` 为你的 GitHub 用户名和使用你的 ingress IP 替换 `LB-PUBLIC-IP`）：

```yaml{7,11,31}
apiVersion: helm.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: podinfo
  namespace: prod
  annotations:
    fluxcd.io/ignore: "false"
spec:
  releaseName: podinfo
  chart:
    git: git@github.com:GHUSER/gitops-helm-workshop
    ref: master
    path: cluster/charts/podinfo
  values:
    image:
      repository: stefanprodan/podinfo
      tag: 3.1.0
    service:
      enabled: true
      type: ClusterIP
    ingress:
      enabled: true
      annotations:
        kubernetes.io/ingress.class: "nginx"
        nginx.ingress.kubernetes.io/configuration-snippet: |
          proxy_set_header l5d-dst-override $service_name.$namespace.svc.cluster.local:9898;
          proxy_hide_header l5d-remote-ip;
          proxy_hide_header l5d-server-id;
      path: /
      hosts:
        - LB-PUBLIC-IP.nip.io
```

请注意，如果您使用的是 EKS，则主机应设置为 `elb.amazonaws.com` 地址：

```sh
kubectl -n ingress-nginx get svc | grep Ingress
```

应用更改：

```sh
git add -A && \
git commit -m "install podinfo" && \
git push origin master && \
fluxctl sync
```

验证 Helm operator 是否已安装 podinfo：

```sh
kubectl -n prod get hr
```

打开浏览器并导航到 `http://LB-PUBLIC-IP.nip.io/`，您应该看到 `podinfo v3.1.0 UI`。

## 自动升级

Flux 可以用于自动化集群中的容器映像更新。
您可以通过注释 Helm release 对象来启用自动化 image 标记更新。
您还可以通过使用 glob、regex 或语义版本表达式来控制更新应该考虑哪些标记。

编辑 podinfo Helm release 并启用 Flux 自动 Image 更新：

```yaml{5,6}
apiVersion: helm.fluxcd.io/v1
kind: HelmRelease
metadata:
  annotations:
    fluxcd.io/automated: "true"
    fluxcd.io/tag.chart-image: semver:~3.1
```

应用更改：

```sh
git add -A && \
git commit -m "automate podinfo" && \
git push origin master && \
fluxctl sync
```

验证 Helm operator 是否已升级 podinfo：

```sh
kubectl -n prod get hr
```

在本地拉取 Flux 所做的更改：

```sh
git pull origin master
```

打开浏览器并导航到 `http://LB-PUBLIC-IP.nip.io/`，您应该看到 podinfo v3.1.5 UI。

## 密封的 secrets

为了将 secrets 安全地存储在公共 Git 存储库中，您可以使用 [Sealed Secrets 控制器](https://github.com/bitnami-labs/sealed-secrets) 并将您的 Kubernetes Secrets 加密为 **SealedSecrets**。只能通过在集群中运行的控制器来解密密封的 secrets。

创建 Sealed Secrets Helm release：

```yaml{7}
apiVersion: helm.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: sealed-secrets
  namespace: fluxcd
  annotations:
    fluxcd.io/ignore: "false"
spec:
  releaseName: sealed-secrets
  chart:
    repository: https://kubernetes-charts.storage.googleapis.com/
    name: sealed-secrets
    version: 1.8.0
```

应用更改：

```sh
git add -A && \
git commit -m "install sealed-secrets" && \
git push origin master && \
fluxctl sync
```

安装 kubeseal CLI：

```sh
wget https://github.com/bitnami-labs/sealed-secrets/releases/download/v1.8.0/kubeseal-darwin-amd64
sudo install -m 755 kubeseal-darwin-amd64 /usr/local/bin/kubeseal
```

在启动时，sealed-secrets 控制器生成一个 RSA key 并记录公钥。使用 kubeseal，您可以将您的公钥保存为 pub-cert.pem，公钥可安全存储在 Git 中，可用于加密 secrets，无需直接访问 Kubernetes 集群：


```sh
kubeseal --fetch-cert \
--controller-namespace=fluxcd \
--controller-name=sealed-secrets \
> pub-cert.pem
```

您可以使用 kubectl 在本地生成 Kubernetes secret，并使用 kubeseal 对其进行加密：

```sh
kubectl -n prod create secret generic basic-auth \
--from-literal=user=admin \
--from-literal=password=admin \
--dry-run \
-o json > basic-auth.json

kubeseal --format=yaml --cert=pub-cert.pem < basic-auth.json > basic-auth.yaml
```

这将生成一个类型为 SealedSecret 的自定义资源，其中包含加密的凭据。

Flux 将在您的集群上应用 sealed secret，然后 sealed-secrets 的控制器将其解密为 Kubernetes secret。

为了准备进行灾难恢复，您应该使用以下命令备份 Sealed Secrets 控制器的私钥：

```sh
kubectl get secret -n fluxcd sealed-secrets-key -o yaml \
--export > sealed-secrets-key.yaml
```

要在灾难后从备份中恢复，请替换新创建的密钥并重新启动控制器：

```sh
kubectl replace secret -n fluxcd sealed-secrets-key -f sealed-secrets-key.yaml
kubectl delete pod -n fluxcd -l app=sealed-secrets
```
