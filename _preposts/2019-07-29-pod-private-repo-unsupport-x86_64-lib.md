---
title: "Pod私有库不支持X86_64库编译问题"
date: 2019-07-29 19:10:09
[comment]: <> (文章简介，列表页显示)
introduction: Pod私有库不支持X86_64库（模拟器）编译问题
[comment]: <> - tagName
tag:
- iOS
- Pods
[comment]: <> [tagName1, tagName2]
tags: [iOS, pods]
layout: post
project: false
[comment]: <> image url
feature: 
comments: true
---

### 简介

在使用Pod私有库时，如果有依赖的库只支持真机编译，那么Pod私有库是不能完成Push的。Pod私有库Push时会验证模拟器编译。所以要修改cocoapods验证代码，将iOS验证规则放款，或者去掉。这里我们将验证规则选择不验证，只是显示`--help`信息。

#### 找到`validator.rb`验证器

```shell
gem which cocoapods

// 显示如下：
#/Library/Ruby/Gems/2.3.0/gems/cocoapods-1.7.4/lib/cocoapods.rb
```

```shell
cd /Library/Ruby/Gems/2.3.0/gems/cocoapods-1.7.4/lib/cocoapods
```

#### 备份`validator.rb`

修改之前最好先备份下，以防万一。

```shell
sudo cp validator.rb validator.rb.bak
```

#### 修改`validator.rb`

如下图所示：注释掉`992~1001`，添加`command += %w(--help)`即可。

![01](/assets/images/2019-07-29-pod-private-repo-unsupport-x86_64-lib-01.jpg)