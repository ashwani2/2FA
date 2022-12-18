require('dotenv').config();

const express=require("express")
require("colors")
const app=express()
const PORT=process.env.PORT||5000
const cors=require("cors")
const connectDB = require("./config/db");
//cors
connectDB()
app.use(cors())

const User=require("./routes/User")


// For accepting post from data
app.use(express.json())

app.use("/user",User)


app.listen(PORT,()=>{
    console.log(`Server running on the port ${PORT}`)
})