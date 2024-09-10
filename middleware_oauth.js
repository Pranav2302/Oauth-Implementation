import express from "express";
import cookieParser from "cookie-parser";
import session from "express-session";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import crypto from "crypto";
dotenv.config({
  path: "./.env",
});
//generate state for random bytes
const generatestate=()=> crypto.randomBytes(16).toString('hex');


// Save the state in the session or other secure storage to verify later
// Example: req.session.oauthState = state;



const app = express();

// Middlewares 
app.use(cookieParser());
app.use(
  session({
    secret: process.env.googleClientSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  })
);

app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

// Serve static files from the "public" directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));

// Route to serve the index.html at the root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/dashboard",(req,res)=>{
    res.sendFile(path.join(__dirname,"public","dashboard.html"))
})
// Google OAuth routes
app.get("/api/sessions/oauth/google", (req, res) => {
  // Generate state parameter
  const state = generatestate();
  req.session.oauthState = state;
  const redirectUri = encodeURIComponent(
    "http://localhost:5000/api/sessions/oauth/google/callback"
  );
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${process.env.googleClientID}&redirect_uri=${redirectUri}&scope=email%20profile&prompt=select_account&state=${state}`;

  res.redirect(googleAuthUrl);
});

app.get("/api/sessions/oauth/google/callback", async (req, res) => {
  const { code, state: receivedState } = req.query;

  // If no code or state is provided, redirect to the homepage
  if (!code || !receivedState) {
    console.error('Missing code or state');
    return res.redirect("/");
  }

  // Retrieve the saved state from the session
  const savedState = req.session.oauthState;

  // Compare received state with the saved state, if mismatch, stop further execution
  if (receivedState !== savedState) {
    console.error('State mismatch error. Not proceeding.');
    return res.status(400).send("State parameter mismatch. Access denied.");
  }

  // Proceed with exchanging the authorization code for tokens
  try {
    const tokenResponse = await axios.post(
      "https://oauth2.googleapis.com/token",
      {
        code,
        client_id: process.env.googleClientID,
        client_secret: process.env.googleClientSecret,
        redirect_uri: "http://localhost:5000/api/sessions/oauth/google/callback",
        grant_type: "authorization_code",
      }
    );

    const { access_token } = tokenResponse.data;
    const profileResponse = await axios.get(
      "https://www.googleapis.com/oauth2/v1/userinfo",
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );

    // Save user profile in the session
    req.session.user = profileResponse.data;

    // Redirect to dashboard
    res.redirect("/dashboard");
  } catch (error) {
    console.error("Error exchanging authorization code:", error);
    res.redirect("/");
  } finally {
    // Clear the state from session after processing
    delete req.session.oauthState;
  }
});

// Dashboard
app.get("/dashboard", (req, res) => {
    console.log(req.session.user);
    console.log(req.session);
    //check if the user session exist
  if (!req.session.user || !req.session) {
    //no session exist , then redirct to home route /
    return res.redirect("/");
  }
  //if session exist , render dashboard
  res.send(`Welcome, ${req.session.user.name}`);
  //res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});


app.get("/logout",(req,res)=>{
    req.session.destroy((err)=>{
        if(err){
            console.error("Error, back to dashboard",err);
            return res.redirect("/dashboard")
        }
        res.clearCookie("connect.sid");
        //now google logout from google
       const googleLogoutUrl='https://accounts.google.com/Logout';
        
         //then redirect to google url and then to back to app
        res.redirect(googleLogoutUrl);
    //     res.send(`
    //   <html>
    //     <body>
    //       <script>
    //         // First, log out of Google
    //         window.location.href = '${googleLogoutUrl}';
    //         // After Google logout, redirect to home
    //         setTimeout(function() {
    //           window.location.href = '/';
    //         }, 1000);
    //       </script>
    //     </body>
    //   </html>
    // `);
    });
})

export default app;
