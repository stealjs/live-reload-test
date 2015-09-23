var WebSocketServer = require("ws").Server;
var http = require("http");
var liveReload = require("steal-tools/lib/stream/live");
var path = require("path");
var fs = require("fs");
var asap = require("pdenodeify");
var spawn = require("child_process").spawn;

var main;
var flag = process.argv[2];
if(flag === "--main") {
	main = process.argv[3];
}

// An array of functions that when called will reset the state
var resets = {};

var messageTypes = {
	put: function(msg, ws){
		var address = path.join(process.cwd(), msg.address);
		var oldContent = fs.readFileSync(address, "utf8");
		asap(fs.writeFile)(address, msg.content, "utf8").then(function(){
			ws.send(JSON.stringify({put:true}));
		});

		if(!resets[address]) {
			resets[address] = function(){
				return asap(fs.writeFile)(address, oldContent, "utf8");
			};
		}
	},
	command: function(msg){

	},
	reset: function(msg, ws){
		var fns = Object.keys(resets).map(function(address){
			return resets[address]();
		});
		resets = {};
		Promise.all(fns).then(function(){
			ws.send(JSON.stringify({reset: true}));
		});
	},
	install: function(msg, ws){
		var packageName = msg.package;
		var flags = msg.flags || "";
		var oldPackage = fs.readFileSync("package.json", "utf8");

		var args = ["install", packageName];
		if(flags) args.push(flags);
		var child = spawn("npm", args);
		child.on("exit", function(code){
			ws.send(JSON.stringify({install: true, error: code}));
		});

		var key = packageName + args.join(" ");
		if(!resets[key]) {
			resets[key] = function(){
				return asap(fs.writeFile)("package.json", oldPackage, "utf8");
			};
		}
	}
};

function startServer(options, graphStream){
	var port = options.liveReloadPort || 8015;
	var server = http.createServer().listen(port);

	var wss = new WebSocketServer({ server: server });

	wss.on("connection", function(ws){
		ws.on("message", function(data){
			var msg = JSON.parse(data);
			var handler = messageTypes[msg.type];
			if(!handler) {
				console.error("no handler for type:", msg.type);
				process.exit(1);
			}
			handler(msg, ws);
		});
	});

	return wss;
};

var graphStream = liveReload({
	config: process.cwd() + "/package.json!npm",
	main: main
}, {});

graphStream.once("data", function(){
	startServer({}, graphStream);
});
