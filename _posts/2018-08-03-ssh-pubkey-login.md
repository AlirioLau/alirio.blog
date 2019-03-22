---
title: "SSH配置公钥登录服务器"
date: 2018-08-03 11:29:37
[comment]: <> (文章简介，列表页显示)
introduction: "SSH配置公钥登录服务器"
[comment]: <> - tagName
tag:
- Linux
- SSH
[comment]: <> [tagName1, tagName2]
tags: [Linux, SSH]
layout: post
project: false
[comment]: <> image url
feature: 
comments: true
---

### 添加公钥
1. 在 ~/.ssh 目录中添加 authorized_keys 文件（如果有则忽略此步骤）
2. 将id_rsa.pub中的公钥添加到 authorized_keys 文件中（如果多个key，直接追加到后面，需要一个换行符分开）

### 设置权限

#### 设置authorized_keys权限

```objc
chmod 600 authorized_keys
```

#### 设置.ssh目录权限

```objc
chmod 700 -R .ssh
```

> 可以查看权限验证（ls -la）

#### 重启sshd服务

```objc
service sshd restart
```

**不同Linux版本可能有的还是不能登录，需要添加配置。**

#### 添加配置

> 1. 编辑/etc/ssh/sshd_config文件
> 
> ```objc
> PubkeyAuthentication yes
> RSAAuthentication yes
> ```
> 
> 2. 可能需要打开root免密登录
> 
> ```objc
> PermitRootLogin yes
> ```

#### 为了安全需要修改 ssh服务默认22端口

修改 /etc/ssh/sshd_config 配置文件

```objc
Port 端口号
```

> **如果防火墙开启，记得修改防火墙（端口号/tcp）**