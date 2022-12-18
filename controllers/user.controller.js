
// mongodb user Model
const User=require("../models/User")

//mongodb user otp verification model
const UserOTPVerification=require("../models/UserOtpVerification")

const nodemailer=require("nodemailer")

const bcrypt=require("bcrypt")



// Nodemailer Stuff
let transporter=nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_EMAIL, 
      pass: process.env.SMTP_PASSWORD, 
    },
  });

  // testing success
  transporter.verify((error,success)=>{
    if(error){
        console.log(error)
    }
    else{
        console.log("Ready for messages")
        // console.log(success)
    }
  })

  //signup
exports.signup=((req,res)=>{
    let { name, email, password, dateOfBirth}=req.body
    name=name.trim()
    email=email.trim()
    password=password.trim()
    dateOfBirth=dateOfBirth.trim()


    if(name==''||email==''||password==''||dateOfBirth==''){
        res.json({
            status:"FAILED",
            message:"Empty Input fields!"
        })
    }
    else if(!/[a-zA-Z]*$/.test(name)){
        res.json({
            status:"FAILED",
            message:"Invalid Name"
        })
    }     
    else if(!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)){
      res.json({
        status:"FAILED",
        message:"Invalid Email"
      })  
    }
    else if(!new Date(dateOfBirth).getTime()){
        res.json({
            status:"FAILED",
            message:"Invalid Date of Birth Entered"
        })
    } 
    else if(password.length>8){
        res.json({
            status:"FAILED",
            message:"Password is too short"
        })
    }
    else{
        // Checking if user already exists
        User.find({email})
        .then((result)=>{
            if(result.length){
                res.json({
                    status:"FAILED",
                    message:"User already exists"
                })
            }
            else{
                // Try to create new user

                //password Handling
                const saltRounds=10
                bcrypt
                .hash(password, saltRounds)
                .then((hashedPassword)=>{
                    const newUser=new User({
                        name,
                        email,
                        password:hashedPassword,
                        dateOfBirth,
                        verified:false,
                    })

                    newUser.save()
                    .then((result)=>{
                        // handle Account Verification
                        // sendVerificationEmail(result,res)
                        sendOTPVerificationEmail(result,res)
                    })
                    .catch((err)=>{
                        console.log(err)
                        res.json({
                            status:"FAILED",
                            message:" An error occurred while creating the account!"
                        })
                    })
                })
                .catch((err)=>{
                    res.json({
                        status:"FAILED",
                        message:"An error occurred while hashing the password"
                    })
                })
            }
        })
        .catch((err)=>{
            console.log(err)
            res.json({
                status:"FAILED",
                message:"An error occurred while checking for existing User!"
            })
        })
    }
})

exports.verifyOTP=(async(req,res)=>{
    try {
        let { userId, otp }=req.body
        
        if(!userId||!otp){
            throw new Error("Empty Otp details are not allowed")
        }
        else{
            const UserOtpVerificationRecords=await UserOTPVerification.find({userId})

            if(UserOtpVerificationRecords.length <= 0){
                throw new Error("Account does not exist or has been verified already.Please Sign up or Login")
            } else {
                const {expiresAt}=UserOtpVerificationRecords[0]
                const hashedOTP=UserOtpVerificationRecords[0].otp

                if(expiresAt < Date.now()){
                   // user otp record has expired
                   await UserOTPVerification.deleteMany({userId}) 
                   throw new Error("Code has expired Please request Again")
                } else {
                   const validOTP= await bcrypt.compare(otp,hashedOTP)
                    
                   if(!validOTP){
                    // supplied Otp is wrong
                        throw new Error("Invalid Code Passed Check your inbox")
                    } else {
                        // success
                        await User.updateOne({_id:userId},{verified:true})
                        await UserOTPVerification.deleteMany({userId})

                        res.json({
                            status:"VERIFIED",
                            message:"User Email verified successfully!"
                        })
                    }

                }
            }
        }
    } catch (error) {
        res.json({
            status:"FAILED",
            message:`${error.message}`
        })
    }
})

exports.resendOTPVerificationCode=(async(req,res)=>{
    try {
        let { userId , email }=req.body

        if(!userId || !email){
            throw Error("Empty user Details are not allowed")
        }
        else {
            // delete existing records and resend
            await UserOTPVerification.deleteMany({userId})
            sendOTPVerificationEmail({_id:userId,email},res)
        }
    } catch (error) {
        res.json({
            status:"FAILED",
            message:`${error.message}`
        })
    }
})


  // send OTP verification Email
  const sendOTPVerificationEmail = async ({_id,email},res) => {
    try {
        const otp=`${Math.floor(1000 + Math.random() * 9000)}`

        // mail options
        const mailOptions={
            from:process.env.FROM_EMAIL,
            to:email,
            subject:`Verify Your Email`,
            html:`<p>Enter <b>${otp}</b> in the website to verify your email address and complete the signup process</p>
            <p>This Code <b>expires in 1 Hour</b>.</p>`

        }
        // hash the otp
        const saltRounds=10
        const hashedOtp=await bcrypt.hash(otp,saltRounds)
        const newOTPVerification=new UserOTPVerification({
            userId:_id,
            otp:hashedOtp,
            createdAt:Date.now(),
            expiresAt:Date.now() + 3600000
        })

        // save otp
        await newOTPVerification.save()
       const info= await transporter.sendMail(mailOptions)
       console.log("Message sent: %s", info.messageId);
        res.json({
            status:"PENDING",
            message:"Verification OTP email sent",
            data:{
                userId:_id,
                email
            }
        })
    } catch (error) {
        res.json({
            status:"FAILED",
            message:`${error.message}`
        })
    }
  }