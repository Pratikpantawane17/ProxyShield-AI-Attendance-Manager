const dotenv = require("dotenv");
dotenv.config();


const express = require("express")
const app = express()
const { DBConnection } = require('./database/db')
const cors = require("cors");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken"); 

const { checkForAuthorization, restrictNotTo } = require('./middlewares/auth');
const staticRoutes = require("./routes/staticRoutes")
const teacherRoutes = require("./routes/teacherRoutes")
const teacherDashboard = require("./routes/teacherDashboard")

//for FCM
const agenda = require('./jobs/agenda');
require('./jobs/lectureNotification.job'); // define job

DBConnection();


app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));


// middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(checkForAuthorization);

//routes
app.use('/', staticRoutes)
app.use('/teacher', restrictNotTo(["TEACHER", "ADMIN"]), teacherRoutes)
app.use('/', teacherDashboard)


app.listen(process.env.PORT, () => {
    console.log(`Server is Runnig on PORT ${process.env.PORT}`)
});

// start agenda in background and handle failures
(async function() {
  try {
    await agenda.start();
    console.log('Agenda started');
  } catch (error) {
    console.error('Agenda failed to start:', error);
    // process.exit(1); // uncomment if you want to stop the server on agenda failure
  }
})();