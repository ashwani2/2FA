const express=require("express")
const {
    signup,verifyOTP,resendOTPVerificationCode
}=require("../controllers/user.controller")
const router=express.Router()


router.route("/signup").post(signup)

router.route("/verifyOTP").post(verifyOTP)

router.route("/resendOTPVerificationCode").post(resendOTPVerificationCode)

module.exports = router;