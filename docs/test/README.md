---
title: 金丝雀 Helm 测试
---

# Helm 测试

Flagger 附带有一个测试服务，该服务在配置为 Webhook 时可以运行 Helm 测试。

## 创建测试

为 podinfo 令牌 API 创建一个测试：

```yaml{11}
apiVersion: v1
kind: Pod
metadata:
  name: {{ template "podinfo.fullname" . }}-jwt-test-{{ randAlphaNum 5 | lower }}
  labels:
    heritage: {{ .Release.Service }}
    release: {{ .Release.Name }}
    chart: {{ .Chart.Name }}-{{ .Chart.Version }}
    app: {{ template "podinfo.name" . }}
  annotations:
    linkerd.io/inject: disabled
    "helm.sh/hook": test-success
spec:
  containers:
    - name: tools
      image: giantswarm/tiny-tools
      command:
        - sh
        - -c
        - |
          TOKEN=$(curl -sd 'test' ${PODINFO_SVC}/token | jq -r .token) &&
          curl -H "Authorization: Bearer ${TOKEN}" ${PODINFO_SVC}/token/validate | grep test
      env:
      - name: PODINFO_SVC
        value: {{ template "podinfo.fullname" . }}:{{ .Values.service.externalPort }}
  restartPolicy: Never
```

将以上文件保存在 `cluster/charts/podinfo/tests` 中。

在 `prod` 名称空间中部署 Helm 测试运行器：

```yaml{7}
apiVersion: helm.fluxcd.io/v1
kind: HelmRelease
metadata:
  name: helm-tester
  namespace: prod
  annotations:
    fluxcd.io/ignore: "false"
spec:
  releaseName: helm-tester
  chart:
    git: https://github.com/weaveworks/flagger
    ref: 1.0.0-rc.1
    path: charts/loadtester
  values:
    fullnameOverride: helm-tester
    serviceAccountName: helm-tester
```

应用更改：

```sh
git add -A && \
git commit -m "install helm-tester" && \
git push origin master && \
fluxctl sync
```

## 运行测试

将 helm 测试添加为预发布 webhook：

```yaml{9,10,11,12,13,14,15}
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: podinfo
  namespace: prod
spec:
  analysis:
    webhooks:
      - name: "helm test"
        type: pre-rollout
        url: http://helm-tester.prod/
        timeout: 2m
        metadata:
          type: "helmv3"
          cmd: "test podinfo"
      - name: load-test
        url: http://load-tester.prod/
        metadata:
          cmd: "hey -z 2m -q 10 -c 2 http://podinfo-canary.prod:9898/"
```

应用更改：

```sh
git add -A && \
git commit -m "update podinfo" && \
git push origin master && \
fluxctl sync
```

当金丝雀分析开始时，Flagger 将在将流量路由到金丝雀之前调用预发布 Webhooks。
如果 helm 测试失败，Flagger 将重试，直到达到分析阈值并且金丝雀回退为止。

