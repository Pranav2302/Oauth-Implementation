// import express from "express";
// import dotenv from "dotenv";
// dotenv.config({
//   path: "./.env",
// });
// const app = express();

// app.get("api/sessions/oauth/google", (req, res) => {
//   const scope = ["profile", "email"].join(" ");
//   const authUrl = `${process.env.google_auth_url}?response_type=code&client_id=${process.env.googleClientId}&redirect_uri=${process.env.googleOauthRedirectUrl}&scope=${scope}`;

//   //redirect user
//   res.redirect(authUrl);
// });
