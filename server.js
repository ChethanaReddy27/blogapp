import exp from "express";
import { connect } from "mongoose";
import { config } from "dotenv";
import { userRoute } from "./APIs/UserAPI.js";
import cookieParser from "cookie-parser";
import { adminRoute } from "./APIs/AdminAPI.js";
import { authorRoute } from "./APIs/AuthorAPI.js";
import { commonRouter } from "./APIs/CommonAPI.js";
import cors from "cors";
config(); //process.env

//Create express application
const app = exp();
app.set("trust proxy", 1); // support secure cookies behind a proxy

//use cors middleware
const allowedOrigins = [
  "https://blogapp-frontend-pg1v.vercel.app",
  "https://blogapp-frontend-osnq.vercel.app",
  "https://blogapp-frontend-six.vercel.app",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
];
const corsOptions = {
  origin: (origin, callback) => {
    // Allow if origin is undefined (curl/mobile/server-to-server), in whitelist, is a vercel app, or is localhost
    if (
      !origin ||
      allowedOrigins.includes(origin) ||
      origin.endsWith(".vercel.app") ||
      /^http:\/\/localhost:\d+$/.test(origin)
    ) {
      return callback(null, true);
    }
    callback(null, false); // Reject CORS cleanly without throwing 500 error in backend
  },
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

//add body parser middleware
app.use(exp.json());
//add cookie parser middleware
app.use(cookieParser());

//connect APIs
app.use("/user-api", userRoute);
app.use("/author-api", authorRoute);
app.use("/admin-api", adminRoute);
app.use("/common-api", commonRouter);

//connect to db
const connectDB = async () => {
  try {
    await connect(process.env.DB_URL);
    console.log("DB connection success");
  } catch (err) {
    console.log("Err in DB connection", err);
  }
};

//start http server first so Render can bind to the port immediately and prevent deployment timeouts
const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`server started on port ${port}`);
  connectDB();
});

//dealing with invalid path
app.use((req, res, next) => {
  console.log(req.url);
  res.json({ message: `${req.url} backend server running successfully` });
});

//error handling middleware
app.use((err, req, res, next) => {
  console.log("Error name:", err.name);
  console.log("Error code:", err.code);
  console.log("Full error:", err);

  // mongoose validation error
  if (err.name === "ValidationError") {
    return res.status(400).json({
      message: "error occurred",
      error: err.message,
    });
  }

  // mongoose cast error
  if (err.name === "CastError") {
    return res.status(400).json({
      message: "error occurred",
      error: err.message,
    });
  }

  const errCode = err.code ?? err.cause?.code ?? err.errorResponse?.code;
  const keyValue = err.keyValue ?? err.cause?.keyValue ?? err.errorResponse?.keyValue;

  if (errCode === 11000) {
    const field = Object.keys(keyValue)[0];
    const value = keyValue[field];
    return res.status(409).json({
      message: "error occurred",
      error: `${field} "${value}" already exists`,
    });
  }

  // ✅ HANDLE CUSTOM ERRORS
  if (err.status) {
    return res.status(err.status).json({
      message: "error occurred",
      error: err.message,
    });
  }

  // default server error
  res.status(500).json({
    message: "error occurred",
    error: "Server side error",
  });
});
