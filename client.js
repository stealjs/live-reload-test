var loader = require("@loader");

var loadPromise = new Promise(function(resolve, reject){
	function connect(){
		var host = window.document.location.host.replace(/:.*/, "");
		var port = loader.liveReloadTestPort || 8015;
		var ws = new WebSocket("ws://" + host + ":" + port);
		ws.onopen = function(){
			resolve(ws);
		};
		ws.onerror = function(e){
			reject(e);
		};
	}
	connect();
});

function send(ws, msg){
	ws.send(JSON.stringify(msg));
}

function waitForMessage(ws, type){
	return new Promise(function(resolve){
		ws.addEventListener("message", function onevent(data){
			var msg = JSON.parse(data.data);
			if(msg[type]) {
				ws.removeEventListener("message", onevent);
				resolve();
			}
		});
	});
}

exports.put = function(address, content){
	return loadPromise.then(function(ws){
		send(ws, {
			address: address,
			content: content,
			type: "put"
		});
		return waitForMessage(ws, "put");
	});
};

exports.reset = function(){
	return loadPromise.then(function(ws){
		send(ws, {
			type: "reset"
		});
		return waitForMessage(ws, "reset");
	});
};

exports.install = function(packageName, flags){
	return loadPromise.then(function(ws){
		send(ws, {
			type: "install",
			package: packageName,
			flags: flags
		});
		return waitForMessage(ws, "install");
	});
};
