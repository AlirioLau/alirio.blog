---
title: "CentOS 7--修改防火墙"
date: 2018-08-03 11:45:44
[comment]: <> (文章简介，列表页显示)
introduction: "CentOS 7--修改防火墙"
[comment]: <> - tagName
tag:
- Linux
[comment]: <> [tagName1, tagName2]
tags: [Linux]
layout: post
project: false
[comment]: <> image url
feature: 
comments: true
---

### 关闭防火墙

```shell
// 停止firewall （重启后，重新开启）
systemctl stop firewalld.service

// 禁止firewall开机启动
systemctl disable firewalld.service
```

### 开启端口

```shell
// 添加
firewall-cmd --zone=public --add-port=80/tcp --permanent

// 删除
firewall-cmd --zone=public --remove-port=80/tcp --permanent
```

> 1. --zone（作用域）
> 2. --add-port=80/tcp（添加端口，格式：端口/通讯协议）
> 3. --permanent（永久生效，没有此参数重启后失效）

#### 通过修改 `public.xml`

```shell
vi /etc/firewalld/zones/public.xml

<port protocol="tcp" port="服务器端口"/>
<port protocol="udp" port="服务器端口"/>
```

### 重启防火墙

```shell
firewall-cmd --complete-reload

// 或者
firewall-cmd --reload
```

### 查看以开放端口

```shell
firewall-cmd --list-ports
```

### 常用命令介绍

```shell
// 查看防火墙状态，是否是running
firewall-cmd --state

// 重新载入配置，比如添加规则之后，需要执行此命令
firewall-cmd --complete-reload

// 查看帮助
man firewall-cmd
```