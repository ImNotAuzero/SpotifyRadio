# SpotifyRadio
Live radio as a Spotify playlist

## About
I learnt that a station that I listen to when I am in the UK at times just always plays ads. Get in the car and put on the station, it's ads, open my phone and listen elsewhere, playing ads... Ask Alexa play the station, playing ads...

So, this app goes to the radio station, finds out what is being played, goes to spotify, adds the song being played on the radio to a spotify playlist.

## How does it work?
The app works by first connecting to a stations websocket, listening to any events recieved from the socket, it then parses the data.
Once the data has been parsed, checks are performed to ensure that what is being played is not a show or ads etc... Once this is done
the song data is extracted and then a query to the Spotify API is performed, once data has been returned, if everything matches up, the
song will be added to the playlist in real-time.

As of v3 multiple stations are now supported.

## Note
The following code may not work with all stations and modifications may be required where appropriate to accomodate a different station.

If anything breaks, I am not liable.