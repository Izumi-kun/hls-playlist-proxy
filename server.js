var Promise = require('promise');
var Stream = require('./stream');
var fs = new require('fs');
var express = require('express');
var cors = require('cors');
var sha1 = require('sha1');

var config = JSON.parse(fs.readFileSync('./config.json'));
var playlistsPort = config.ports['playlists'];

var streams = {};
var clients = {};

config['playlists'].forEach(function (streamConfig) {
  var stream = new Stream(streamConfig);
  streams[stream.name] = stream;
  stream.refresh().then(stream.intervalRefresh, function (reason) {
    console.log('"' + stream.name + '" stream seems down (' + reason + ')');
    setTimeout(stream.intervalRefresh, 10000);
  });
});

var app = express();
app.use(cors());
app.enable('trust proxy');
var server = app.listen(playlistsPort, function () {
  console.log('Playlist server started on port: ' + playlistsPort);
  console.log('Urls to playlists:');
  Object.keys(streams).map(function (name) {
    console.log(" - http://your.host:" + playlistsPort + "/stream/" + name + "/index.m3u8");
  });
});

app.param('stream', function (req, res, next, id) {
  if (streams[id] && streams[id].content) {
    req.stream = streams[id];
    next();
  } else {
    res.status(404).send('404');
  }
});

app.get('/stream/:stream/index.m3u8', function (req, res) {
  var userId = sha1(req.ip
    + req.get('User-Agent')
    + req.get('Accept-Language')
  );
  if (!clients[userId]) {
    console.log('Viewer connected: ' + req.ip);
  }
  clients[userId] = {
    ip: req.ip,
    time: Date.now()
  };
  res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
  res.send(req.stream.content);
});

var viewers = 0;
setInterval(function () {
  var cnt = 0;
  var now = Date.now();
  Object.keys(clients).map(function (key) {
    if (now - clients[key].time > 30000) {
      console.log('Viewer disconnected: ' + clients[key].ip);
      delete clients[key];
    } else {
      cnt++;
    }
  });
  if (cnt !== viewers) {
    console.log('Total viewers: ' + cnt);
    viewers = cnt;
    broadcast(cnt);
  }
}, 500);

var shutdown = function () {
  console.log('Received kill signal, shutting down gracefully.');

  var p1 = new Promise(function (resolve) {
    server.close(resolve);
  });
  var p2 = new Promise(function (resolve) {
    wsServer.close(resolve);
  });
  Promise.all([p1, p2]).then(function () {
    console.log('Closed out remaining connections.');
    process.exit();
  });

  setTimeout(function () {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit();
  }, 10 * 1000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

var WebSocket = new require('ws');

var wsServer = new WebSocket.Server({
  clientTracking: true,
  port: config.ports['stats']
}, function () {
  console.log('Stats websocket server started on port: ' + config.ports['stats']);
});

wsServer.on('connection', function (ws) {
  try {
    ws.send(viewers);
  } catch (e) {
  }
});

wsServer.on('error', function (err) {
  console.log(err)
});

function broadcast(data) {
  wsServer.clients.forEach(function (client) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(data);
      } catch (e) {
      }
    }
  });
}
