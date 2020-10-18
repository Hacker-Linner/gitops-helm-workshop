---
title: 金丝雀发布
---

# 金丝雀发布

一个金丝雀发布是用名为 **Canary** 的 Kubernetes 自定义资源描述的。

## 应用程序启动

编辑 podinfo Helm release 和禁用 image 更新和 ClusterIP 服务：

```yaml{7,13,15}
apiVersion: helm.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: podinfo
  namespace: prod
  annotations:
    fluxcd.io/automated: "false"
spec:
  releaseName: podinfo
  values:
    image:
      repository: stefanprodan/podinfo
      tag: 3.1.0
    service:
      enabled: false
      type: ClusterIP
```

应用更改：

```sh
git add -A && \
git commit -m "prep canary" && \
git push origin master && \
fluxctl sync
```

创建一个针对 podinfo 的金丝雀发布：

```yaml{7}
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: podinfo
  namespace: prod
  annotations:
    fluxcd.io/ignore: "false"
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: podinfo
  service:
    port: 9898
  analysis:
    interval: 10s
    maxWeight: 100
    stepWeight: 5
    threshold: 5
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
      - name: request-duration
        thresholdRange:
          max: 500
        interval: 1m
    webhooks:
      - name: acceptance-test
        type: pre-rollout
        url: http://flagger-loadtester.prod/
        timeout: 30s
        metadata:
          type: bash
          cmd: "curl -sd 'test' http://podinfo-canary.prod:9898/token | grep token"
      - name: load-test
        type: rollout
        url: http://flagger-loadtester.prod/
        metadata:
          cmd: "hey -z 2m -q 10 -c 2 http://podinfo-canary.prod:9898/"
```

应用更改：

```sh
git add -A && \
git commit -m "add canary" && \
git push origin master && \
fluxctl sync
```

验证 Flagger 已经初始化金丝雀：

```sh
kubectl -n prod get canary
```

## 自动金丝雀提升 

安装负载测试服务以在金丝雀分析期间生成流量：

```yaml{7}
apiVersion: helm.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: load-tester
  namespace: prod
  annotations:
    fluxcd.io/ignore: "false"
spec:
  releaseName: load-tester
  chart:
    git: https://github.com/weaveworks/flagger
    ref: 1.0.0-rc.1
    path: charts/loadtester
  values:
    fullnameOverride: load-tester
```

当您部署新的 podinfo 版本时，Flagger 逐渐将流量转移到金丝雀，同时测量请求的成功率以及平均响应持续时间。
基于对这些Linkerd提供的指标的分析，金丝雀部署要么提升要么回滚。

通过更新容器映像来触发金丝雀部署：

```yaml{7}
apiVersion: helm.fluxcd.io/v1
kind: HelmRelease
spec:
  releaseName: podinfo
  values:
    image:
      tag: 3.1.1
```

应用更改：

```sh
git add -A && \
git commit -m "update podinfo" && \
git push origin master && \
fluxctl sync
```

当 Flagger 检测到部署修订版本已更改时，它将开始新的部署。您可以使用以下方法监视流量的变化：

```sh
watch kubectl -n prod get canaries
```

## 自动回滚

在金丝雀分析期间，您可能会生成 HTTP 500 错误和高延迟，以测试 Flagger 是否暂停并回滚有故障的版本。

触发另一只金丝雀的发布：

```yaml{7}
apiVersion: helm.fluxcd.io/v1
kind: HelmRelease
spec:
  releaseName: podinfo
  values:
    image:
      tag: 3.1.2
```

应用更改：

```sh
git add -A && \
git commit -m "update podinfo" && \
git push origin master && \
fluxctl sync
```

执行到测试 pod 和产生 HTTP 500 错误：

```sh
kubectl -n prod exec -it $(kubectl -n prod get pods -o name | grep -m1 load-tester | cut -d'/' -f 2) bash

$ hey -z 1m -c 5 -q 5 http://podinfo-canary:9898/status/500
$ hey -z 1m -c 5 -q 5 http://podinfo-canary:9898/delay/1
```

当检查失败的数量达到金丝雀分析阈值时，流量将路由回主要服务器，并且金丝雀将比例缩放为零。

观看Flagger日志：

```
$ kubectl -n linkerd logs deployment/flagger -f | jq .msg

 Starting canary analysis for podinfo.prod
 Advance podinfo.test canary weight 5
 Advance podinfo.test canary weight 10
 Advance podinfo.test canary weight 15
 Halt podinfo.test advancement success rate 69.17% < 99%
 Halt podinfo.test advancement success rate 61.39% < 99%
 Halt podinfo.test advancement success rate 55.06% < 99%
 Halt podinfo.test advancement request duration 1.20s > 0.5s
 Halt podinfo.test advancement request duration 1.45s > 0.5s
 Rolling back podinfo.prod failed checks threshold reached 5
 Canary failed! Scaling down podinfo.test
```

## 使用 Linkerd 进行监视

Linkerd 仪表板可实时提供有关服务情况的高级视图。
它可用于可视化服务依赖关系，流量拆分和了解特定服务路由的运行状况。

通过运行以下命令打开仪表板：

```sh
linkerd dashboard --port=50750
```

在金丝雀分析期间，导航至：

```
http://127.0.0.1:50750/namespaces/ingress-nginx/deployments/nginx-ingress-controller
```

![linkerd](/linkerd-dashboard.png)

您可以使用以下命令从命令行监视生产名称空间的实时流量：

```sh
linkerd -n prod top deploy
```

您可以使用以下命令查看 podinfo 公开的所有路由：

```sh
linkerd -n prod routes service/podinfo
```

以上路由是从 podinfo swagger 规范生成的，并作为 Linkerd 服务配置文件导出。