# SpotifyRadio v1
Live radio as a Spotify playlist

## About
I learnt that a station that I listen to when I am in the UK at times just always plays ads. Get in the car and put on the station, it's ads, open my phone and listen elsewhere, playing ads... Ask Alexa play the station, playing ads...

So, this app goes to the radio station, finds out what is being played, goes to spotify, adds the song being played on the radio to a spotify playlist.

## Requirements
Install the required NPM modules as per the package.json.
The Node Module "ws-heartbeat", navigate to the folder in the node_modules folder
Go to package.json for the module, change the "main" from index.js to client.js - You will then not get errors from this module of no index found.

## Note
This might not work with all stations.
Each station might return a different message object from the ws. So if testing beyond Capital UK - log the data and change where required.
This app is not designed for production for multiple stations.
I am not liable for anything.