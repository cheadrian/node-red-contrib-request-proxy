# node-red-contrib-http-request-proxy
This is a node-red node for performing http(s) requests that use [Request](https://github.com/request/request) library with optimized proxy support.

Thanks [spawnrider](https://github.com/spawnrider) for his work, which this is based on.

Difference between this and [node-red-contrib-http-request](https://github.com/spawnrider/node-red-contrib-http-request) is that you can set a custom timeout and proxy at each input message, so you can use it as a proxy tester or in different situations where you need to change proxy freely and only at node level.

## Installation
run npm -g install node-red-contrib-http-request-proxy

[![npm package](https://nodei.co/npm/node-red-contrib-http-request-proxy.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/node-red-contrib-http-request-proxy/)

## Features
Based on the node-red core node for performing http/https requests and on the fabulous [Request](https://github.com/request/request) library which a lot of features for proxy, steaming, or TLS/SSL support.

![image](https://user-images.githubusercontent.com/20714227/57112777-3377af80-6d4a-11e9-9115-a5b70166f441.png)

## Why this module ?
Request became a popular and proven simplified HTTP Client to make http(s) calls. It supports a lot of features/options for advanced usage. 

A simple example : The node-red-contrib-http-request-proxy module support HTTPS on HTTP proxy using CONNECT request.
