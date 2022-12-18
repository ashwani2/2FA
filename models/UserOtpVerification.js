const mongoose = require('mongoose')

const UserOtpVerificationSchema=new mongoose.Schema({
    userId:String,
    otp:String,
    expiresAt:Date
},{
    timestamps:true
})

module.exports=mongoose.model('UserOtpVerification',UserOtpVerificationSchema)