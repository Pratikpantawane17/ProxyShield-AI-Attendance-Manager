const { getUser } = require("../service/auth");

// SOFT CHECK — Attach user if token is valid (for optionally protected routes)
function checkForAuthorization(req, res, next) {
  const tokenCookie = req.cookies?.token;
  if (!tokenCookie) return next();
 

  const user = getUser(tokenCookie);
  if (user) {
    req.user = user;
    console.log(req.user);
  }
  return next();
}


// HARD CHECK — Enforce login + role-based access
function restrictNotTo(roles) {
  return function (req, res, next) {
    if (!req.user) {
      console.log(req.user)
      return res.status(401).json({
        success: false,
        message: "Unauthorized: Please log in first.",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Only Admins have access to this resource",
      });
    }

    return next();
  };
}

module.exports = {
  checkForAuthorization,
  restrictNotTo,
};
