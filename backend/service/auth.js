// Stateless Authentication : 
const dotenv = require("dotenv");
dotenv.config();

const jwt = require('jsonwebtoken');


function setUser(user) {
    const payload = {
        _id: user._id,
        email: user.email,
        role: user.role,
    }
    return jwt.sign(payload, process.env.SECRET_KEY);
}

function getUser(token) {
    if(!token) return null;
    try {
        return jwt.verify(token, process.env.SECRET_KEY);
    }
    
    catch(err) {
        return null;
    }
}
    

module.exports = {
    setUser,
    getUser,
}