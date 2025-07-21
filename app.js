if(process.env.NODE_ENV != "production"){
    require("dotenv").config();
}

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session");
const MongoStore = require('connect-mongo');
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const User = require("./models/user.js");

const Listing = require("./models/listing.js");
const listingRouter = require("./routes/listing.js");
const reviewRouter = require("./routes/review.js");
const userRouter = require("./routes/user.js");

// const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";
const dbURL = process.env.ATLASDB_URL;

main()
    .then(()=>{
        console.log("Connected to DB");
    })
    .catch((err)=>{
        console.log(err);
    });

async function main() {
    await mongoose.connect(dbURL);
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({extended: true}));
app.use(methodOverride("_method"));
app.engine("ejs", ejsMate);
app.use(express.static(path.join(__dirname, "public")));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const store = MongoStore.create({
    mongoUrl: dbURL,
    crypto:{
        secret: process.env.SECRET,
    },
    touchAfter: 24*3600,
});

store.on("error", ()=>{
    console.log("ERROR in MONGO SESSION STORE", err);
});

const sessionOptions = {
    store: store,
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
    },
};

app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) =>{
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    res.locals.currUser = req.user;
    res.locals.mapToken = process.env.MAP_TOKEN;
    next();
}); 

// Update the /listings route to handle category filtering
app.get("/listings", async (req, res, next) => {
    try {
        const { category } = req.query; // Get the category from query parameters
        let allListings;

        if (category) {
            // If a category is provided, filter by it
            allListings = await Listing.find({ category: category.toLowerCase() }); // Ensure category matches enum case
            if (allListings.length === 0) {
                req.flash("error", `No listings found for "${category}" category.`);
                return res.redirect("/listings"); // Redirect to show all if no listings found for the category
            }
        } else {
            // If no category is provided, show all listings
            allListings = await Listing.find({});
        }
        res.render("listings/index.ejs", { allListings });
    } catch (err) {
        next(err); // Pass any errors to the error handling middleware
    }
});

app.use("/listings", listingRouter);
app.use("/listings/:id/reviews", reviewRouter);
app.use("/", userRouter);

app.get("/search", async (req, res, next) => {
    let { titles } = req.query;

    const allListings = await Listing.find({
        title: { $regex: titles, $options: "i" }
    });

    if (allListings.length === 0) {
        req.flash("error", "No listings found!");
        return res.redirect("/listings");
    }

    // Show all matching listings in the same index page
    res.render("listings/index.ejs", { allListings });
});


app.all('/*path', (req, res, next)=>{
    next(new ExpressError(404, "Page Not Found!"));
});

// Express Error middleware
app.use((err, req, res, next)=>{
    let {statusCode=500, message="Somthing went wrong!"} = err;
    res.status(statusCode).render("error.ejs", {message});
});

app.listen(8080, ()=>{
    console.log("Server Start...");
});