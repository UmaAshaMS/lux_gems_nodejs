const userSchema = require('../model/userSchema')

const passport = require('passport')
const dotenv = require('dotenv').config()

const GoogleStrategy = require('passport-google-oauth20').Strategy

passport.use(
    new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
        passReqToCallback: true
    },
    async (request, accessToken, refreshToken, profile, done) => {
        try {
    
            const email = profile.emails[0].value;

            let user = await userSchema.findOne({ email })

            if (!user) {
                user = new userSchema({
                name: profile.displayName,
                email : profile.emails[0].value,
                googleID: profile.id
            })
                await user.save()
            }
                done(null, user)
            } catch (err) {
                done(err, null)
            }
        }
    )
)

passport.serializeUser((user, done) => {
    done(null, user.id)
})

passport.deserializeUser(async (id, done) => {
    try {
        const user = await userSchema.findById(id)
        done(null, user)
    } catch (err) {
        done(err, null)
    }
})


module.exports = passport ;