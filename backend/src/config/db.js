const mongoose = require('mongoose')

async function connectDB() {
    try{
        const dbName = process.env.MONGODB_DB_NAME || 'ai-lab';
        await mongoose.connect(process.env.MONGODB_URI, {
            dbName,
            minPoolSize: 10,
            maxPoolSize: 100,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        const { seedDefaultColleges } = require("./seedColleges");
        await seedDefaultColleges();
    } catch(error){
        console.error('Database connection failed: ', error.message)
    }
}

module.exports = connectDB