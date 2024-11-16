const express = require("express");
const SpotifyWebApi = require("spotify-web-api-node");
const { TwitterApi } = require("twitter-api-v2");
require("dotenv").config();

const app = express();

const SCOPES = ["user-read-currently-playing", "user-read-playback-state"];

const spotifyApi = new SpotifyWebApi({
  clientId: process.env.SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  refreshToken: process.env.SPOTIFY_REFRESH_TOKEN,
});

const authorizeURL = spotifyApi.createAuthorizeURL(SCOPES);
console.log("Visitez cette URL pour autoriser l'application:", authorizeURL);

const twitterClient = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

async function updateBiography() {
  try {
    const data = await spotifyApi.refreshAccessToken();
    spotifyApi.setAccessToken(data.body["access_token"]);

    const currentUser = await twitterClient.v2.me();
    let currentBio = currentUser.data.description || "";

    currentBio = currentBio.replace(/🎵 Écoute: .*/, "").trim();

    const currentTrack = await spotifyApi.getMyCurrentPlayingTrack();

    if (currentTrack.body.is_playing) {
      const track = currentTrack.body.item;
      const musicText = `🎵 Écoute: ${track.name} - ${track.artists[0].name}`;
      const newBio = `${currentBio}${musicText}`;

      await twitterClient.v1.updateAccountProfile({ description: newBio });
      return true;
    } else {
      if (currentBio !== currentUser.data.description) {
        await twitterClient.v1.updateAccountProfile({
          description: currentBio,
        });
      }
      return true;
    }
  } catch (error) {
    console.error("Erreur:", error);
    return false;
  }
}

app.get("/callback", async (req, res) => {
  const { code } = req.query;
  try {
    const data = spotifyApi.authorizationCodeGrant(code);
    console.log("Refresh token:", data.body["refresh_token"]);
    console.log("Access token:", data.body["access_token"]);
    res.send("Vous pouvez fermer cette fenêtre");
  } catch (err) {
    console.error("Erreur:", err);
    res.send("Erreur lors de l'autorisation");
  }
});

app.post("/update-bio", async (req, res) => {
  const success = await updateBiography();
  if (success) {
    res.json({ status: "success", message: "Biographie mise à jour" });
  } else {
    res
      .status(500)
      .json({ status: "error", message: "Erreur lors de la mise à jour" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
