module.exports = {
    title: 'GitOps Helm 研讨会',
    description: '使用 Flux，Helm v3，Linkerd 和 Flagger 渐进式交付 Kubernetes',
    themeConfig: {
        displayAllHeaders: true,
        repo: 'stefanprodan/gitops-helm-workshop',
        docsDir: 'docs',
        editLinks: false,
        editLinkText: 'Help us improve this page!',
        nav: [
            { text: '首页', link: '/' },
        ],
        sidebar: [
            '/',
            '/intro/',
            '/prerequisites/',
            '/helm/',
            '/canary/',
            '/test/'
        ]
    },
    head: [
        ['link', { rel: 'icon', href: '/favicon.png' }],
        ['link', { rel: 'stylesheet', href: '/website.css' }]
    ]
};

