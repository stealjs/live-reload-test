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

exports.put = function(address, content){
	return loadPromise.then(function(ws){
		send(ws, {
			address: address,
			content: content,
			type: "put"
		});
	});
};

exports.reset = function(){
	return loadPromise.then(function(ws){
		send(ws, {
			type: "reset"
		});
		return new Promise(function(resolve){
			ws.addEventListener("message", function(data){
				var msg = JSON.parse(data.data);
				if(msg.reset) {
					resolve();
				}
			});
		});
	});
};
