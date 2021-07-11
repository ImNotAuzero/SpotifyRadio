const WebSocket = require('ws');
const websocketHB = require('ws-heartbeat');
const spotify = require('./spotify');

spotify.auth.authorize().then(() => { setInterval(function() { spotify.auth.refreshAccessToken(); }, 3500000)});

var ws = new WebSocket('wss://metadata.musicradio.com/v2/now-playing')

ws.onopen = function(event) {
  console.log('Connection created.'); 
  ws.send(JSON.stringify({"actions":[{"type":"subscribe","service":"29"}]})) // Send a subscribe object
}

ws.onmessage = function(data) {
  console.log('Message Recieved...');
  let parsed = JSON.parse(data.data);
  if(parsed.now_playing.type != 'track') return; // Playing talk show or ads
  spotify.findSong(parsed.now_playing); // Send the track data to spotify functions
}

websocketHB.setWsHeartbeat(ws, 'heartbeat', { pingTimeout: 300000, pingInterval: 30000 }); // Let's station know we're still here