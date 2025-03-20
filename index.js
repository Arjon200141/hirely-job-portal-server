const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const bcrypt = require('bcrypt');

app.use(cors());
app.use(express.json());

const uri = "mongodb+srv://hirely-job-portal:HKMWexa1yBb2yzXZ@cluster0.ej6qyrh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // await client.connect();
        console.log("Connected to MongoDB!");

        const jobCollection = client.db('hirely-job-portal').collection('jobs');
        const courseCollection = client.db('hirely-job-portal').collection('courses');
        const companyCollection = client.db('hirely-job-portal').collection('companies');
        const userCollection = client.db('hirely-job-portal').collection('users');
        const coursecategoryCollection = client.db('hirely-job-portal').collection('course-category');
        const appliedCollection = client.db('hirely-job-portal').collection('applied');
        const savedCollection = client.db('hirely-job-portal').collection('saved');

        // Get all jobs
        app.get('/jobs', async (req, res) => {
            try {
                const result = await jobCollection.find().toArray();
                res.send(result);
            } catch (error) {
                console.error("Error fetching jobs:", error);
                res.status(500).send("Internal Server Error");
            }
        });
        app.get('/users', async (req, res) => {
            try {
                const result = await userCollection.find().toArray();
                res.send(result);
            } catch (error) {
                console.error("Error fetching jobs:", error);
                res.status(500).send("Internal Server Error");
            }
        });



        app.post('/followcompany', async (req, res) => {
            const { email, companyId } = req.body; // Extract email and companyId from the request body

            // Validate input
            if (!email || !companyId) {
                return res.status(400).json({ message: 'Email and companyId are required' });
            }

            try {
                // Find the company by companyId
                const company = await companyCollection.findOne({ _id: new ObjectId(companyId) });
                if (!company) {
                    return res.status(404).json({ message: 'Company not found' });
                }

                // Add the user's email to the company's followers array
                await companyCollection.updateOne(
                    { _id: new ObjectId(companyId) },
                    { $addToSet: { followers: email } } // Use $addToSet to avoid duplicates
                );

                // Find the user by email
                const user = await userCollection.findOne({ email });
                if (!user) {
                    return res.status(404).json({ message: 'User not found' });
                }

                // Add the companyId to the user's followedCompanies array
                await userCollection.updateOne(
                    { email },
                    { $addToSet: { followedCompanies: companyId } } // Use $addToSet to avoid duplicates
                );

                res.status(200).json({ message: 'Company followed successfully' });
            } catch (error) {
                console.error('Error following company:', error);
                res.status(500).json({ message: 'Internal server error' });
            }
        });
        app.get('/companyfollowedbyuser/:email', async (req, res) => {
            const email = req.params.email; // Extract email from the route parameter

            // Validate input
            if (!email) {
                return res.status(400).json({ message: 'Email is required' });
            }

            try {
                // Find the user by email
                const user = await userCollection.findOne({ email });
                if (!user) {
                    return res.status(404).json({ message: 'User not found' });
                }

                // Get the followedCompanies array from the user object
                const followedCompanies = user.followedCompanies || [];

                // If the user is not following any companies, return an empty array
                if (followedCompanies.length === 0) {
                    return res.status(200).json([]);
                }

                // Convert company IDs to ObjectId
                const companyIds = followedCompanies.map(id => new ObjectId(id));

                // Find the companies using the company IDs
                const companies = await companyCollection.find({
                    _id: { $in: companyIds }
                }).toArray();

                // Send the list of companies to the frontend
                res.status(200).json(companies);
            } catch (error) {
                console.error('Error fetching followed companies:', error);
                res.status(500).json({ message: 'Internal server error' });
            }
        });
        app.post('/unfollowcompany', async (req, res) => {
            const { email, companyId } = req.body; // Extract email and companyId from the request body

            // Validate input
            if (!email || !companyId) {
                return res.status(400).json({ message: 'Email and companyId are required' });
            }

            try {
                // Find the company by companyId
                const company = await companyCollection.findOne({ _id: new ObjectId(companyId) });
                if (!company) {
                    return res.status(404).json({ message: 'Company not found' });
                }

                // Remove the user's email from the company's followers array
                await companyCollection.updateOne(
                    { _id: new ObjectId(companyId) },
                    { $pull: { followers: email } } // Use $pull to remove the email
                );

                // Find the user by email
                const user = await userCollection.findOne({ email });
                if (!user) {
                    return res.status(404).json({ message: 'User not found' });
                }

                // Remove the companyId from the user's followedCompanies array
                await userCollection.updateOne(
                    { email },
                    { $pull: { followedCompanies: companyId } } // Use $pull to remove the companyId
                );

                res.status(200).json({ message: 'Company unfollowed successfully' });
            } catch (error) {
                console.error('Error unfollowing company:', error);
                res.status(500).json({ message: 'Internal server error' });
            }
        });
        app.post('/update-user-details', async (req, res) => {
            const { email, dataType, data } = req.body; // Extract email, dataType, and data from request body

            // Validate input
            if (!email || !dataType || !data) {
                return res.status(400).json({ message: 'Email, dataType, and data are required' });
            }

            try {
                // Find the user by email
                const user = await userCollection.findOne({ email });

                if (!user) {
                    return res.status(404).json({ message: 'User not found' });
                }

                let updateQuery = {};

                if (dataType === 'WorkExp' || dataType === 'KeySkills') {
                    // Handle WorkExp and KeySkills differently: Append to the existing array
                    const existingData = user.UserDescription?.[dataType] || []; // Get existing data or initialize as empty array
                    const updatedData = [...existingData, data]; // Append the new data

                    updateQuery[`UserDescription.${dataType}`] = updatedData; // Update the array
                } else {
                    // For other data types, overwrite the existing data
                    updateQuery[`UserDescription.${dataType}`] = data;
                }

                // Update the user document
                const result = await userCollection.updateOne(
                    { email }, // Filter by email
                    { $set: updateQuery } // Update operation
                );

                if (result.modifiedCount === 1) {
                    res.status(200).json({ message: `User ${dataType} updated successfully` });
                } else {
                    res.status(500).json({ message: `Failed to update user ${dataType}` });
                }
            } catch (error) {
                console.error(`Error updating user ${dataType}:`, error);
                res.status(500).json({ message: 'Internal server error' });
            }
        });

        app.get('/users/:id', async (req, res) => {
            try {
                const id = req.params.id;
                if (!ObjectId.isValid(id)) {
                    return res.status(400).send("Invalid ID");
                }
                const query = { _id: new ObjectId(id) };
                const result = await userCollection.findOne(query);
                if (!result) {
                    return res.status(404).send("Candidate not found");
                }
                res.send(result);
            } catch (error) {
                console.error("Error fetching candidate:", error);
                res.status(500).send("Internal Server Error");
            }
        });

        app.get('/users/email/:email', async (req, res) => {
            try {
                const email = req.params.email;
                const query = { email: email };
                const result = await userCollection.findOne(query);

                if (!result) {
                    return res.status(404).send("User not found");
                }

                res.send(result);
            } catch (error) {
                console.error("Error fetching user:", error);
                res.status(500).send("Internal Server Error");
            }
        });

        app.delete('/users/:id', async (req, res) => {
            try {
                const { applyId } = req.params;
                const { email } = req.query; // Pass email as a query parameter
                const query = { applyId, email };
                const result = await userCollection.deleteOne(query);
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: 'Internal Server Error' });
            }
        });


        app.get('/course-category', async (req, res) => {
            try {
                const result = await coursecategoryCollection.find().toArray();
                res.send(result);
            } catch (error) {
                console.error("Error fetching jobs:", error);
                res.status(500).send("Internal Server Error");
            }
        });

        // Update user password
        app.patch('/users/password', async (req, res) => {
            try {
                const { email, currentPassword, newPassword } = req.body;

                if (!email || !currentPassword || !newPassword) {
                    return res.status(400).json({ error: 'Email, current password, and new password are required' });
                }

                const user = await userCollection.findOne({ email });
                if (!user) {
                    return res.status(404).json({ error: 'User not found' });
                }

                const isMatch = await bcrypt.compare(currentPassword, user.password);
                if (!isMatch) {
                    return res.status(400).json({ error: 'Current password is incorrect' });
                }

                const saltRounds = 10;
                const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

                await userCollection.updateOne(
                    { email },
                    { $set: { password: hashedPassword } }
                );

                res.status(200).json({ message: 'Password updated successfully' });
            } catch (error) {
                console.error("Error updating password:", error.message);
                res.status(500).json({ error: 'Server error' });
            }
        });



        app.get('/companies', async (req, res) => {
            try {
                const result = await companyCollection.find().toArray();
                res.send(result);
            } catch (error) {
                console.error("Error fetching jobs:", error);
                res.status(500).send("Internal Server Error");
            }
        });
        app.get('/applied', async (req, res) => {
            try {
                const result = await appliedCollection.find().toArray();
                res.send(result);
            } catch (error) {
                console.error("Error fetching jobs:", error);
                res.status(500).send("Internal Server Error");
            }
        });

        // Backend: Save a job
        app.post('/saved', async (req, res) => {
            try {
                const savedItem = req.body;
                const result = await savedCollection.insertOne(savedItem);
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: 'Internal Server Error' });
            }
        });

        // Backend: Save a job
        app.post('/jobs', async (req, res) => {
            try {
                const savedItem = req.body;
                const result = await jobCollection.insertOne(savedItem);
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: 'Internal Server Error' });
            }
        });

        // Backend: Delete a saved job
        app.delete('/saved/:applyId', async (req, res) => {
            try {
                const { applyId } = req.params;
                const { email } = req.query; // Pass email as a query parameter
                const query = { applyId, email };
                const result = await savedCollection.deleteOne(query);
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: 'Internal Server Error' });
            }
        });

        // Backend: Check if a job is saved
        app.get('/saved', async (req, res) => {
            try {
                const { email, applyId } = req.query;

                const query = { email };

                // Check if applyId is provided
                if (applyId) {
                    query.applyId = applyId;
                }

                // Query the saved jobs
                const result = await savedCollection.find(query).toArray();  // Ensure you're using toArray if expecting an array

                // Return saved jobs if found, otherwise send a 404 response
                if (result.length > 0) {
                    res.send(result);
                } else {
                    res.status(404).send({ message: 'No saved jobs found.' });
                }
            } catch (error) {
                res.status(500).send({ message: 'Internal Server Error' });
            }
        });

        app.delete('/jobs/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const { email } = req.query;
                const query = { _id: id, agencyEmail: email };
                const result = await jobCollection.deleteOne(query);
                if (result.deletedCount > 0) {
                    res.send({ message: "Job deleted successfully" });
                } else {
                    res.status(404).send({ message: "Job not found or you're not authorized to delete it" });
                }
            } catch (error) {
                res.status(500).send({ message: 'Internal Server Error' });
                console.error(error);
            }
        });


        app.patch("/applied/:id", async (req, res) => {
            const { id } = req.params;
            const { status } = req.body;
            const result = await appliedCollection.updateOne(
                { applyId: id },
                { $set: { status: status } }
            );

            if (result.modifiedCount > 0) {
                res.json({ status });
            } else {
                res.status(400).json({ message: "Update failed" });
            }
        });
        


        // Get a single job by ID
        app.get('/jobs/:id', async (req, res) => {
            try {
                const id = req.params.id;

                // Validate the ID
                if (!ObjectId.isValid(id)) {
                    return res.status(400).send("Invalid job ID");
                }

                const query = { _id: new ObjectId(id) };
                const result = await jobCollection.findOne(query);

                if (!result) {
                    return res.status(404).send("Job not found");
                }

                res.send(result);
            } catch (error) {
                console.error("Error fetching job:", error);
                res.status(500).send("Internal Server Error");
            }
        });
        app.get('/companies/:id', async (req, res) => {
            try {
                const id = req.params.id;

                // Validate the ID
                if (!ObjectId.isValid(id)) {
                    return res.status(400).send("Invalid job ID");
                }

                const query = { _id: new ObjectId(id) };
                const result = await companyCollection.findOne(query);

                if (!result) {
                    return res.status(404).send("Job not found");
                }

                res.send(result);
            } catch (error) {
                console.error("Error fetching job:", error);
                res.status(500).send("Internal Server Error");
            }
        });

        app.get("/courses", async (req, res) => {
            try {
                const { category } = req.query; // Extract the category from query parameters
                let query = {}; // Initialize an empty query object

                // If a category is provided, filter by category
                if (category) {
                    query.category = category.toUpperCase(); // Ensure the category is in uppercase
                }

                // Fetch courses based on the query and sort by learners in descending order
                const result = await courseCollection
                    .find(query)
                    .sort({ learners: -1 }) // Sort by learners in descending order
                    .toArray();

                res.send(result); // Send the response
            } catch (error) {
                console.error("Error fetching courses:", error);
                res.status(500).send("Internal Server Error");
            }
        });
        app.get("/courses/:id", async (req, res) => {
            const id = req.params.id;

            // console.log('cookies : ',req.cookies);
            const query = { _id: new ObjectId(id) };
            const course = await courseCollection.findOne(query);
            res.send(course)
        })

        app.post('/register', async (req, res) => {
            const { name, phoneNumber, email, password, userRoll } = req.body;

            // Validate input data
            if (!name || !phoneNumber || !email || !password) {
                return res.status(400).json({ message: 'All fields are required.' });
            }

            // Check if the email or phone number already exists
            const existingUser = await userCollection.findOne({
                $or: [
                    { email: email }, // Check if email exists
                    { phoneNumber: phoneNumber }, // Check if phone number exists
                ],
            });

            if (existingUser) {
                if (existingUser.email === email) {
                    return res.status(400).json({ message: 'Email already exists.' });
                }
                if (existingUser.phoneNumber === phoneNumber) {
                    return res.status(400).json({ message: 'Phone number already exists.' });
                }
            }

            // Generate a 4-digit OTP
            const otp = Math.floor(1000 + Math.random() * 9000).toString();
            const otpExpiry = new Date(Date.now() + 60000); // OTP expires in 1 minute

            // Create user object
            const user = {
                name,
                phoneNumber,
                email,
                password, // Password is already hashed in the frontend
                userRoll: "CANDIDATE",
                OTPverified: false, // OTP verification status (default: false)
                accountverified: false, // Account verification status (default: false)
                otp, // Store the OTP
                otpExpiry, // Store the OTP expiry time
                createdAt: new Date(),
            };

            // Insert user into the database
            const result = await userCollection.insertOne(user);

            // Create a response object without the password
            const userResponse = {
                _id: result.insertedId, // Include the MongoDB-generated ID
                name: user.name,
                phoneNumber: user.phoneNumber,
                email: user.email,
                userRoll: user.userRoll,
                OTPverified: user.OTPverified,
                accountverified: user.accountverified,
                createdAt: user.createdAt,
            };

            // Send response
            res.status(201).json({
                message: 'User registered successfully! OTP sent for verification.',
                user: userResponse, // Send the user data without the password
            });
        });
        app.post('/resend-otp', async (req, res) => {
            const { email } = req.body;

            // Generate a new 4-digit OTP
            const otp = Math.floor(1000 + Math.random() * 9000).toString();
            const otpExpiry = new Date(Date.now() + 60000); // OTP expires in 1 minute

            // Update the user's OTP and expiry time
            await userCollection.updateOne(
                { email },
                { $set: { otp, otpExpiry } }
            );

            res.status(200).json({ message: 'New OTP sent successfully!' });
        });
        app.post('/verify-otp', async (req, res) => {
            const { otp, email } = req.body;

            // Find the user by email
            const user = await userCollection.findOne({ email });
            if (!user) {
                return res.status(404).json({ message: 'User not found.' });
            }

            // Check if OTP matches and is not expired
            if (user.otp === otp && new Date() < new Date(user.otpExpiry)) {
                await userCollection.updateOne(
                    { email },
                    { $set: { OTPverified: true } } // Set OTPverified to true
                );
                return res.status(200).json({ message: 'OTP verified successfully!' });
            } else {
                return res.status(400).json({ message: 'Invalid or expired OTP.' });
            }
        });

        app.post('/register/agency', async (req, res) => {
            const { companyName, ownerName, phoneNumber, email, password } = req.body;

            // Validate input data
            if (!companyName || !ownerName || !phoneNumber || !email || !password) {
                return res.status(400).json({ message: 'All fields are required.' });
            }

            // Check if the email or phone number already exists
            const existingUser = await userCollection.findOne({
                $or: [
                    { email: email }, // Check if email exists
                    { phoneNumber: phoneNumber }, // Check if phone number exists
                ],
            });

            if (existingUser) {
                if (existingUser.email === email) {
                    return res.status(400).json({ message: 'Email already exists.' });
                }
                if (existingUser.phoneNumber === phoneNumber) {
                    return res.status(400).json({ message: 'Phone number already exists.' });
                }
            }

            // Generate a 4-digit OTP
            const otp = Math.floor(1000 + Math.random() * 9000).toString();
            const otpExpiry = new Date(Date.now() + 60000); // OTP expires in 1 minute

            // Create user object for agency
            const agencyUser = {
                name: companyName,
                ownerName,
                phoneNumber,
                email,
                password, // Password is already hashed in the frontend
                userRoll: 'AGENCY',
                OTPverified: false, // OTP verification status (default: false)
                accountverified: false, // Account verification status (default: false)
                otp, // Store the OTP
                otpExpiry, // Store the OTP expiry time
                createdAt: new Date(),
            };

            // Insert agency user into the database
            const result = await userCollection.insertOne(agencyUser);

            // Create a response object without the password
            const userResponse = {
                _id: result.insertedId, // Include the MongoDB-generated ID
                name: agencyUser.name,
                ownerName: agencyUser.ownerName,
                phoneNumber: agencyUser.phoneNumber,
                email: agencyUser.email,
                userRoll: agencyUser.userRoll,
                OTPverified: agencyUser.OTPverified,
                accountverified: agencyUser.accountverified,
                createdAt: agencyUser.createdAt,
            };

            // Send response
            res.status(201).json({
                message: 'Agency registered successfully! OTP sent for verification.',
                user: userResponse, // Send the user data without the password
            });
        });
        app.post('/login', async (req, res) => {
            const { email, phoneNumber, password } = req.body;

            // Validate input data
            if ((!email && !phoneNumber) || !password) {
                return res.status(400).json({ message: 'Email/phone number and password are required.' });
            }

            try {
                // Find the user by email or phone number
                const user = await userCollection.findOne({
                    $or: [{ email }, { phoneNumber }],
                });

                if (!user) {
                    return res.status(404).json({ message: 'User not found.' });
                }

                // Compare the provided password with the stored hashed password
                const isPasswordValid = await bcrypt.compare(password, user.password);

                if (!isPasswordValid) {
                    return res.status(401).json({ message: 'Invalid password.' });
                }

                // Check if OTPverified is true
                if (user.OTPverified === true) {
                    // If OTP is verified, return a success response
                    return res.status(200).json({
                        message: 'Login successful!',
                        user: {
                            name: user.name,
                            email: user.email,
                            phoneNumber: user.phoneNumber,
                            userRoll: user.userRoll,
                            OTPverified: true,
                        },
                    });
                } else {
                    // If OTPverified is false or missing, generate a new OTP
                    const otp = Math.floor(1000 + Math.random() * 9000).toString(); // Generate a 4-digit OTP
                    const otpExpiry = new Date(Date.now() + 60000); // OTP expires in 1 minute

                    // Update the user's record with the new OTP and expiry time
                    await userCollection.updateOne(
                        { _id: user._id },
                        { $set: { otp, otpExpiry, OTPverified: false } }
                    );

                    // Return a response indicating OTP verification is required
                    return res.status(200).json({
                        message: 'OTP verification required. A new OTP has been sent.',
                        user: {
                            name: user.name,
                            email: user.email,
                            phoneNumber: user.phoneNumber,
                            userRoll: user.userRoll,
                            OTPverified: false, // Indicate that OTP verification is pending
                        },
                    });
                }
            } catch (error) {
                console.error('Error during login:', error);
                res.status(500).json({ message: 'An error occurred during login.' });
            }
        });

        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hirely Job Portal is running');
});

app.listen(port, () => {
    console.log(`Hirely Job Portal is running on port ${port}`);
});