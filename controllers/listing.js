const Listing = require("../models/listing");
const NodeGeocoder = require('node-geocoder');

const options = {
    provider: 'google',
    apiKey: process.env.GOOGLE_GEOCODING_API_KEY, // Use your Google Maps API key from .env
    formatter: null // 'gpx', 'string', ... - keeps the raw response structure
};
const geocoder = NodeGeocoder(options);

module.exports.index = async(req, res)=>{
    const allListings = await Listing.find({});
    res.render("listings/index.ejs", {allListings});
};

module.exports.renderNewForm = (req, res)=>{
    res.render("listings/new.ejs");
};

module.exports.showListing = async(req, res)=>{
    let {id} = req.params;
    const listing = await Listing.findById(id)
        .populate({
            path: "reviews", 
            populate:{
                path:"author"
            },
        })
        .populate("owner");
    if(!listing){
        req.flash("error", "Listing you requested for does not exist!");
        return res.redirect("/listings");
    }
    res.render("listings/show.ejs", {listing});
};

module.exports.createListing = async(req, res, next)=>{

    const fullLocationString = `${req.body.listing.location}, ${req.body.listing.country}`;

    // Geocode the location using NodeGeocoder with Google Maps
    const geoData = await geocoder.geocode(fullLocationString);

    // Basic error handling for geocoding
    if (!geoData || geoData.length === 0) {
        req.flash("error", "Could not find coordinates for the provided location. Please try again.");
        return res.redirect("/listings/new"); // Redirect back to the form
    }

    let url = req.file.path;
    let filename = req.file.filename;

    const newListing = new Listing(req.body.listing);
    newListing.owner = req.user._id;
    newListing.image = {url, filename};

    // Store the geometry data for GeoJSON Point [longitude, latitude]
    newListing.geometry = {
        type: "Point",
        coordinates: [geoData[0].longitude, geoData[0].latitude], // NodeGeocoder returns longitude, latitude
    };

    await newListing.save();
    req.flash("success", "New Listing Created!");
    res.redirect("/listings");
};

module.exports.renderEditForm = async (req, res)=>{
    let {id} = req.params;
    const listing = await Listing.findById(id);
    if(!listing){
        req.flash("error", "Listing you requested for does not exist!");
        return res.redirect("/listings");
    }

    let originalImageUrl = listing.image.url;
    originalImageUrl = originalImageUrl.replace("/upload", "/upload/w_250");
    res.render("listings/edit.ejs", {listing, originalImageUrl});
};

module.exports.updateListing = async(req, res)=>{
    let {id} = req.params;
    let listing = await Listing.findByIdAndUpdate(id, {...req.body.listing});

    if(typeof req.file !== "undefined"){
        let url = req.file.path;
        let filename = req.file.filename;
        listing.image = {url, filename};
        await listing.save();
    }

    // Optional: Re-geocode if location is updated
    if (req.body.listing.location && req.body.listing.location !== listing.location) {
        let locationToGeocode = req.body.listing.location;

        // Check if the location string does not contain a comma.
        if (!locationToGeocode.includes(',')) {
            locationToGeocode = `${locationToGeocode}, ${req.body.listing.country}`;
        }

        // const geoData = await geocoder.geocode(req.body.listing.location);
        const geoData = await geocoder.geocode(locationToGeocode); // Use the potentially adjusted location

        if (geoData && geoData.length > 0) {
            listing.geometry = {
                type: "Point",
                coordinates: [geoData[0].longitude, geoData[0].latitude],
            };
            listing.location = locationToGeocode;
            await listing.save(); // Save again if geometry updated
        } else {
            req.flash("error", "Could not update coordinates for the new location.");
        }
    }

    req.flash("success", "Listing Updated!");
    res.redirect(`/listings/${id}`);
};

module.exports.destroyListing = async(req, res)=>{
    let {id} = req.params;
    await Listing.findByIdAndDelete(id);
    req.flash("success", "Listing Deleted!");
    res.redirect("/listings");
}