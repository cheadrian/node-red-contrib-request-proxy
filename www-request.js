"use strict";

var request = require('request');
var mustache = require("mustache");

module.exports = function (RED) {

  function HTTPRequest(n) {
    RED.nodes.createNode(this, n);
    var node = this;
    var nodeUrl = n.url;
	var nodeProxyIP = n.proxyip;
	var nodeProxyPort = n.proxyport;
	var nodeProxyType = n.proxytype;
	var nodeTimeOut = n.timeout;
    var nodeFollowRedirects = n["follow-redirects"];
    var isTemplatedUrl = (nodeUrl || "").indexOf("{{") != -1;
    var nodeMethod = n.method || "GET";
	var nodeTunnel = n.tunneling;
	
    if (n.tls) {
      var tlsNode = RED.nodes.getNode(n.tls);
    }
    this.ret = n.ret || "txt";
	if (nodeTimeOut){
	  this.reqTimeout = parseInt(nodeTimeOut);
	}
    else if (RED.settings.httpRequestTimeout) {
      this.reqTimeout = parseInt(RED.settings.httpRequestTimeout) || 120000;
    } 
	else {
      this.reqTimeout = 120000;
    }

    this.on("input", function (msg) {
      var preRequestTimestamp = process.hrtime();
      node.status({
        fill: "blue",
        shape: "dot",
        text: "httpin.status.requesting"
      });
	  
	  if(nodeProxyIP && nodeProxyPort && nodeProxyType){
		var nodeProxy = nodeProxyType + nodeProxyIP + ":" + nodeProxyPort;
	  }
	  else if(msg.proxy){
		var nodeProxy = msg.proxy;
	  }
	  else{
		var nodeProxy = null;
	  }
	  
      var url = nodeUrl || msg.url;
      if (msg.url && nodeUrl && (nodeUrl !== msg.url)) { // revert change below when warning is finally removed
        node.warn(RED._("common.errors.nooverride"));
      }
      if (isTemplatedUrl) {
        url = mustache.render(nodeUrl, msg);
      }
      if (!url) {
        node.error(RED._("httpin.errors.no-url"), msg);
        node.status({
          fill: "red",
          shape: "ring",
          text: (RED._("httpin.errors.no-url"))
        });
        return;
      }
      // url must start http:// or https:// so assume http:// if not set
      if (!((url.indexOf("http://") === 0) || (url.indexOf("https://") === 0))) {
        if (tlsNode) {
          url = "https://" + url;
        } else {
          url = "http://" + url;
        }
      }

      var method = nodeMethod.toUpperCase() || "GET";
      if (msg.method && n.method && (n.method !== "use")) { // warn if override option not set
        node.warn(RED._("common.errors.nooverride"));
      }
      if (msg.method && n.method && (n.method === "use")) {
        method = msg.method.toUpperCase(); // use the msg parameter
      }
      var opts = {
        method: method,
        url: url,
        timeout: node.reqTimeout,
        followRedirect: nodeFollowRedirects,
        headers: {},
        encoding: null,
		proxy: nodeProxy,
		// gzip: true,
		pool: {maxSockets: Infinity},
		tunnel : nodeTunnel,
      };

      if (msg.headers) {
        for (var v in msg.headers) {
          if (msg.headers.hasOwnProperty(v)) {
            var name = v.toLowerCase();
            if (name !== "content-type" && name !== "content-length") {
              // only normalise the known headers used later in this
              // function. Otherwise leave them alone.
              name = v;
            }
            opts.headers[name] = msg.headers[v];
          }
        }
      }

      if (msg.payload && (method == "POST" || method == "PUT" || method == "PATCH")) {
        if (opts.headers['content-type'] == 'application/x-www-form-urlencoded') {
          opts.form = msg.payload;
        } else {
          if (typeof msg.payload === "string" || Buffer.isBuffer(msg.payload)) {
            opts.body = msg.payload;
          } else if (typeof msg.payload == "number") {
            opts.body = msg.payload + "";
          } else {
            opts.body = JSON.stringify(msg.payload);
            if (opts.headers['content-type'] == null) {
              opts.headers['content-type'] = "application/json";
            }
          }
        }
      }

      if (node.ret === "obj") {
        opts.headers.accept = "application/json, text/plain;q=0.9, */*;q=0.8";
      }

      if (this.credentials && this.credentials.user) {
        opts.auth = {
          user: this.credentials.user,
          pass: this.credentials.password,
          sendImmediately: false
        };
      }

      if (tlsNode) {
        tlsNode.addTLSOptions(opts);
      }
	  
	  var doneSend = false;
	  
      var re = request(opts, function (error, response, body) {
        node.status({});
        if (error) { 
            // node.error(error, msg);
            //msg.payload = error.toString() + " : " + url;
            msg.statusCode = error.code;
			msg.proxy = nodeProxy;
			msg.timeout = node.reqTimeout;
            node.send(msg);
            node.status({
              fill: "red",
              shape: "ring",
              text: error.code
            });
        } else {
          msg.payload = body;
          msg.headers = response.headers;
          msg.statusCode = response.statusCode;
		  msg.proxy = nodeProxy;
		  msg.timeout = node.reqTimeout;
          if (node.metric()) {
            // Calculate request time
            var diff = process.hrtime(preRequestTimestamp);
            var ms = diff[0] * 1e3 + diff[1] * 1e-6;
            var metricRequestDurationMillis = ms.toFixed(3);
            node.metric("duration.millis", msg, metricRequestDurationMillis);
            if (response.connection && response.connection.bytesRead) {
              node.metric("size.bytes", msg, response.connection.bytesRead);
            }
          }

          if (node.ret !== "bin") {
            msg.payload = msg.payload.toString('utf8'); // txt

            if (node.ret === "obj") {
              try { msg.payload = JSON.parse(msg.payload); } // obj
              catch(e) { node.warn(RED._("httpin.errors.json-error")); }
            }
          }
          doneSend = true;
          node.send(msg);
        }
      });
	  
	  setTimeout(function () {
		if(!doneSend){
		  msg.statusCode = "ETIMEOUT";
          // msg.payload = "ETIMEOUT";
		  msg.proxy = nodeProxy;
		  msg.timeout = node.reqTimeout;
		  re.abort();
		  node.status({
              fill: "red",
              shape: "ring",
              text: "ETIMEOUT",
            });
          node.send(msg);
		}
	  }, node.reqTimeout - 50);
	 });
  }

  RED.nodes.registerType("www-request", HTTPRequest, {
    credentials: {
      user: {
        type: "text"
      },
      password: {
        type: "password"
      }
    }
  });
};
