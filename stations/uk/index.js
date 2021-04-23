const superagent = require('superagent');
const ffmetadata = require('ffmetadata');
ffmetadata.setFfmpegPath('../../ffmpeg.exe');
const fs = require('fs-extra');
const ss = require('string-similarity');

var song, refreshKey, someBs;
var scopedKey = '<scoped authorization key from spotify>';


async function readStation() {
  console.log('Reading station...');
  ffmetadata.read('https://radio.garden/api/ara/content/listen/<station ID>/channel.mp3', async function(err, data) {
    if(err) console.error(err);
    else {
      if(!song || song != data.StreamTitle) {
        if(!String(data.StreamTitle).length || !data.StreamTitle || data.StreamTitle === '<name of station : yes sometimes it returns that when ads are playing>') return console.log('No song title provided by station...');
        song = String(data.StreamTitle);
        console.log(`New Song: ${data.StreamTitle}`); // Wow a new song detected..
        await findSong(data.StreamTitle);
      } else {
        return console.log('Song var is same to currently playing...'); // Song already played
      }
    }
  });
}

/**
 * Function used to find the song being played on the radio station on spotify
 * @param {String} title - The song title from station [ artists - song title ]
 */
async function findSong(title) {
  let accessToken = await generateAuthToken();
  superagent.get('https://api.spotify.com/v1/search')
  .type('x-www-form-urlencoded')
  .set('Authorization', `Bearer ${accessToken}`)
  .query(`q=${title.split(' - ')[1].replace('\`', '')}`) // add spaces before and after the hyphon ' - ' to prevent issues for artists like Anne-Marie, JAY-Z etc...
  .query(`type=track`)
  .end((err, res) => {
    if(err) console.error(err);
    else {
      let artists = title.split(' - ')[0]; // Artists of the song
      for(let track in res.body.tracks.items) {
        for(let artist in res.body.tracks.items[track].artists) {
          console.log(`Comparing: ${res.body.tracks.items[track].artists[artist].name} against \"${artists}\" -> ${ss.compareTwoStrings(res.body.tracks.items[track].artists[artist].name, artists)}`);
          if(ss.compareTwoStrings(res.body.tracks.items[track].artists[artist].name, artists) > 0.42) { // use compare npm module because during testing wrong songs were consistently added to playlist.
            someBs = false;
            return addSongToPlaylist(res.body.tracks.items[track])
          }
        }
      }

      if(!someBs) { // Prevents endless loop for songs
        someBs = true;
        return findSong(`${title.split(' - ')[0]} - ${title.split(' - ')[1]} ${title.split(' - ')[0]}`); // Try searching the song again
      }
    }
  });
}

/**
 * Function used to add a song to a spotify playlist
 * 
 * @param {Object} track - All data of the song provided
 */
async function addSongToPlaylist(track) {
  return new Promise(async (resolve, reject) => {
    superagent.post('https://api.spotify.com/v1/playlists/<playlist id>/tracks')
    .set('Authorization', `Bearer ${scopedKey}`)
    .send({ "uris": [`${track.uri}`] })
    .end((err, res) => {
      console.log(`Added some form of song to the playlist...`);
      if(err) reject(err);
      else return resolve(res);
    });
  });
}

/**
 * Function used to generate an auth token to interact with Spotify API
 */
async function generateAuthToken() {
  return new Promise(async (resolve, reject) => {
    superagent.post('https://accounts.spotify.com/api/token')
    .type('x-www-form-urlencoded')
    .set('Authorization', 'Basic <read the spotify docs>')
    .send('grant_type=client_credentials')
    .end((err, res) => {
      console.log('token ' + res.body.access_token)
      if(err) reject(err);
      else return resolve(res.body.access_token);
    });
  });
}

/**
 * Function used to generate refresh key tokens with the spotify api
 */
async function generateRefreshToken() {
  return new Promise(async (resolve, reject) => {
    superagent.post('https://accounts.spotify.com/api/token')
    .type('x-www-form-urlencoded')
    .set('Authorization', 'Basic <read the spotify docs>')
    .send('grant_type=refresh_token')
    .send(`refresh_token=${refreshKey}`)
    .send('redirect_uri=<your redirect uri>')
    .end(async (err, res) => {
      console.log(res.body);
      if(err) reject(err);
      else {
        scopedKey = res.body.access_token;
        console.log(`Key refreshed....`);
        return resolve(true);
      }
    })
  })
}

/**
 * Function used to generate a scoped auth token in spotify
 * 
 * Add the key to the variable - scopedKey. Rather than passing through upon calling this function.
 */
async function generateScopedAuthToken(key) {
  return new Promise(async (resolve, reject) => {
    superagent.post('https://accounts.spotify.com/api/token')
    .type('form')
    .set('Authorization', 'Basic <read the spotify docs>')
    .send('grant_type=authorization_code')
    .send(`code=${(!key) ? scopedKey : key}`)
    .send('redirect_uri=<your redirect uri>')
    .end(async (err, res) => {
      console.log(`token scoped: ${res.body.access_token}`);
      if(err) reject(err);
      else {
        refreshKey = res.body.refresh_token;
        await generateRefreshToken();
        return resolve(true);
      }
    });
  });
}

async function main() {
  await generateScopedAuthToken();
  setInterval(generateRefreshToken, 99000);
  setInterval(generateAuthToken, 100000);
  await readStation();
  setInterval(readStation, 25000);
}

main()
