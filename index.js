const express = require("express");
const SpotifyWebApi = require("spotify-web-api-node");
const { TwitterApi } = require("twitter-api-v2");
require("dotenv").config();

const app = express();

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  refreshToken: process.env.SPOTIFY_REFRESH_TOKEN,
});

const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

let lastTrackId = null;

async function updateBiography() {
  try {
    const data = await spotifyApi.refreshAccessToken();
    spotifyApi.setAccessToken(data.body["access_token"]);

    const currentTrack = await spotifyApi.getMyCurrentPlayingTrack();

    if (!currentTrack.body.is_playing) {
      if (lastTrackId !== null) {
        const currentUser = await twitterClient.v2.me();
        let currentBio = currentUser.data.description || "";
        currentBio = currentBio.replace(/\s*\|\s*🎵 Écoute:.*$/, "").trim();
        await twitterClient.v1.updateAccountProfile({
          description: currentBio,
        });
        lastTrackId = null;
      }
      return;
    }

    const track = currentTrack.body.item;

    if (track.id !== lastTrackId) {
      lastTrackId = track.id;

      const currentUser = await twitterClient.v2.me();
      let currentBio = currentUser.data.description || "";
      console.log("Bio actuelle :", currentBio);

      currentBio = currentBio.replace(/\s*\|\s*🎵 Écoute:.*$/, "").trim();

      const musicText = ` | 🎵 Écoute: ${track.name} - ${track.artists[0].name}`;
      const newBio = `${currentBio}${musicText}`;

      await twitterClient.v1.updateAccountProfile({ description: newBio });
      console.log(`Bio mise à jour avec : ${track.name}`);
    }
  } catch (error) {
    console.error("Erreur:", error);
  }
}

const POLLING_INTERVAL = 30 * 1000;
setInterval(updateBiography, POLLING_INTERVAL);

app.post("/update-bio", async (req, res) => {
  try {
    await updateBiography();
    res.json({
      status: "success",
      message: "Vérification de mise à jour effectuée",
    });
  } catch (error) {
    res
      .status(500)
      .json({ status: "error", message: "Erreur lors de la mise à jour" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  updateBiography();
});
