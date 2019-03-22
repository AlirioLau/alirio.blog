---
title: CentOS 7-ss-libev安装
date: 2019-01-09 10:32:36
[comment]: <> (文章简介，列表页显示)
introduction: CentOS 7-ss-libev安装
[comment]: <> - tagName
tag:
- Linux
- ss
[comment]: <> [tagName1, tagName2]
tags: [Linux, ss]
layout: post
project: false
[comment]: <> image url
feature: 
comments: true
---

### 准备工作

#### 更新系统
```shell
yum update
```

#### 安装必要软件
```shell
yum install git vim wget -y

yum install epel-release -y

yum install gcc gettext autoconf libtool automake make pcre-devel asciidoc xmlto c-ares-devel libev-devel libsodium-devel mbedtls-devel -y
```

### 下载源代码

```shell
git clone https://github.com/shadowsocks/shadowsocks-libev.git

cd shadowsocks-libev

git submodule update --init --recursive
```
> [参考链接](https://github.com/shadowsocks/shadowsocks-libev)

### 编译安装

```shell
./autogen.sh && ./configure && make

sudo make install
```

### 配置 ss-libev

```shell
mkdir -p /etc/shadowsocks-libev

vim /etc/shadowsocks-libev/config.json
```

```json
{
	"server":"0.0.0.0",
	"server_port":2019,//端口
	"local_port":1080,
	"password":"ss2019",//密码
	"timeout":60,
	"method": "chacha20-ietf-poly1305" //The default cipher is chacha20-ietf-poly1305
}
```
> 注：`ss-libev`版本是唯一一个不支持多端口多密码的版本。如果配置多端口需要通过 `ss-manager` 来实现

### 设置开机启动
```shell
vim /etc/systemd/system/shadowsocks.service
```

```shell
[Unit]
Description=Shadowsocks Server
After=network.target

[Service]
ExecStart=/usr/local/bin/ss-server -c /etc/shadowsocks-libev/config.json -u
Restart=on-abort

[Install]
WantedBy=multi-user.target
```

```shell
systemctl enable shadowsocks
```

### 修改防火墙
```shell
vim /etc/firewalld/zones/public.xml

firewall-cmd --complete-reload
```

### 更新`ss-libev`

停止SS服务

```shell
systemctl stop shadowsocks
```

更新

```shell
cd ~/shadowsocks-libev //进入 shadowsocks-libev 目录下

git submodule update --init --recursive

git pull

./configure

make

make install
```

启动SS服务

```shell
systemctl start shadowsocks
```

### ss-libev 配置多端口
修改 `/etc/shadowsocks-libev/config.json`

```json
{
"server" : ["::0", "0.0.0.0"], //同时支持IPv6和IPv4.
"port_password": {
	"2019" : "ss2019",
	"2020" : "ss2020"
},
"timeout": 60,
"method": "chacha20-ietf-poly1305" //The default cipher is chacha20-ietf-poly1305
}
```

修改 `/etc/systemd/system/shadowsocks.service`文件

```shell
[Unit]
Description=Shadowsocks Server
After=network.target

[Service]
ExecStart=/usr/local/bin/ss-manager --manager-address /var/run/shadowsocks-manager.sock -c /etc/shadowsocks-libev/config.json -u start
Restart=on-abort

[Install]
WantedBy=multi-user.target
```

### 安装 `simple-obfs`

#### 编译安装
安装依赖软件

```shell
yum install zlib-devel openssl-devel -y
```

安装 simple-obfs

```shell
git clone https://github.com/shadowsocks/simple-obfs.git

cd simple-obfs

git submodule update --init --recursive

./autogen.sh

./configure && make

make install
```

#### 配置
修改 `/etc/shadowsocks-libev/config.json`

```json
{
	"server":"0.0.0.0",
	"server_port":2019,//端口
	"local_port":1080,
	"password":"ss2019",//密码
	"timeout":60,
	"method":"aes-256-gcm",
	"plugin":"obfs-server",
	"plugin_opts":"obfs=http"
}
```

客户端配置中添加相应配置

```json
"plugin":"plugins\/simple-obfs",
"plugin_opts":"obfs=http;obfs-host=youku.com"
```

> `obfs=http;obfs-host=youku.com` `youku.com`可以更换为没有被墙的网站域名（最好选择流量较大的网站：比如腾讯视频、优酷等）