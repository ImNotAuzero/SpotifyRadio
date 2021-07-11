# SpotifyRadio
Live radio as a Spotify playlist

## About
I learnt that a station that I listen to when I am in the UK at times just always plays ads. Get in the car and put on the station, it's ads, open my phone and listen elsewhere, playing ads... Ask Alexa play the station, playing ads...

So, this app goes to the radio station, finds out what is being played, goes to spotify, adds the song being played on the radio to a spotify playlist.

## Requirements
1: ffmpeg, not npm, the actual executable is required.
2: Create an app on the developer portal of spotify. Please read the documentation from spotify for how to obtain your scoped key and to also append your auth tokens in the functions required.

## Note
This will not work with all stations.
You will have to monitor your station of choice to see what they play if ads are playing etc. -> Noted within index.js
This app is not designed for production for multiple stations.
I am not liable for anything.