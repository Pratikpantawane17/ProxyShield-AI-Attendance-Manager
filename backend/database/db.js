const dotenv = require("dotenv");
dotenv.config();

const mongoose = require("mongoose");

const DBConnection = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB");
    } catch(err) {
        console.log("Error while Connecting of DB !", err);
    }
}

module.exports = {
    DBConnection,   
}